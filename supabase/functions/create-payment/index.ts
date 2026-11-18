import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Prices in US cents. Keep in sync with src/lib/pricing.ts.
// Prices are sent inline (price_data), so changing them here is all it takes
// on the web; no Stripe dashboard prices or payment links to recreate.
const PLAN_CENTS: Record<number, { cents: number; name: string }> = {
  7: { cents: 799, name: "GSB Gold - 7 days" },
  15: { cents: 1299, name: "GSB Gold - 15 days" },
  30: { cents: 1999, name: "GSB Gold - 30 days" },
};
const SINGLE_TIP_CENTS = 99;
const WEEKEND_PACK_CENTS = 299;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { duration, tipId, bundle, origin: clientOrigin } = await req.json();
    const origin = clientOrigin || req.headers.get("origin") || "https://greatsportbets.com";

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
    let metadata: Record<string, string>;
    let successPath: string;
    let cancelPath: string;

    if (bundle === "weekend") {
      lineItem = {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: WEEKEND_PACK_CENTS,
          product_data: { name: "GSB Weekend pack: every Gold card, Friday to Sunday" },
        },
      };
      metadata = { user_id: user.id, kind: "weekend" };
      successPath = "/#/?weekend=1&session_id={CHECKOUT_SESSION_ID}";
      cancelPath = "/#/";
    } else if (tipId !== undefined && tipId !== null) {
      // Single members' tip. Check it exists, is a members' tip and is still open.
      const id = Number(tipId);
      if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid tipId");

      const service = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } }
      );
      const { data: tip, error: tipError } = await service
        .from("tips")
        .select("id, home_team, away_team, is_premium, status")
        .eq("id", id)
        .maybeSingle();
      if (tipError) throw tipError;
      if (!tip) throw new Error("Tip not found");
      if (!tip.is_premium) throw new Error("This tip is already free");
      if (tip.status && tip.status !== "upcoming") throw new Error("This tip has already been settled");

      const { data: owned } = await service
        .from("tip_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("tip_id", id)
        .maybeSingle();
      if (owned) throw new Error("You already own this card");

      lineItem = {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: SINGLE_TIP_CENTS,
          product_data: { name: `GSB Gold card: ${tip.home_team} v ${tip.away_team}` },
        },
      };
      metadata = { user_id: user.id, kind: "tip", tip_id: String(id) };
      successPath = `/#/?unlocked=${id}&session_id={CHECKOUT_SESSION_ID}`;
      cancelPath = "/#/";
    } else {
      const plan = PLAN_CENTS[Number(duration)];
      if (!plan) throw new Error(`Invalid duration: ${duration}`);
      lineItem = {
        quantity: 1,
        price_data: { currency: "usd", unit_amount: plan.cents, product_data: { name: plan.name } },
      };
      metadata = { user_id: user.id, kind: "plan", duration_days: String(duration) };
      successPath = "/#/premium?success=true&session_id={CHECKOUT_SESSION_ID}";
      cancelPath = "/#/premium";
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      metadata,
      line_items: [lineItem],
      mode: "payment",
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}${cancelPath}`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
