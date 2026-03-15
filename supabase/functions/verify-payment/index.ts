import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICE_TO_DURATION: Record<string, number> = {
  price_1TB3jwCikyY7QwS0QI5kHtPa: 7,
  price_1TB3jxCikyY7QwS0aBEJ69wP: 15,
  price_1TB3jxCikyY7QwS0PFcUV7N1: 30,
};

const getStatusFromExpiry = (expiresAt: string | null) => {
  if (!expiresAt) return { active: false, daysLeft: 0 };

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000));

  return {
    active: daysLeft > 0,
    daysLeft,
  };
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("Missing sessionId");
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Not authenticated");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.mode !== "payment" || session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const metadataUserId = session.metadata?.user_id;
    if (!metadataUserId || metadataUserId !== userData.user.id) {
      throw new Error("Session does not belong to this user");
    }

    let durationDays = Number(session.metadata?.duration_days ?? 0);

    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
      const priceId = lineItems.data[0]?.price?.id;
      durationDays = priceId ? PRICE_TO_DURATION[priceId] ?? 0 : 0;
    }

    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      throw new Error("Could not resolve plan duration");
    }

    const { data: existingTx, error: txError } = await serviceClient
      .from("premium_transactions")
      .select("id, user_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (txError) throw txError;

    if (existingTx && existingTx.user_id !== userData.user.id) {
      throw new Error("Invalid payment ownership");
    }

    if (!existingTx) {
      const { data: currentPremium, error: currentPremiumError } = await serviceClient
        .from("premium_access")
        .select("expires_at")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (currentPremiumError) throw currentPremiumError;

      const now = new Date();
      const currentExpiry = currentPremium?.expires_at ? new Date(currentPremium.expires_at) : null;
      const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
      const nextExpiry = new Date(baseDate.getTime() + durationDays * 86400000);

      const { error: upsertError } = await serviceClient
        .from("premium_access")
        .upsert(
          {
            user_id: userData.user.id,
            expires_at: nextExpiry.toISOString(),
            updated_at: now.toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upsertError) throw upsertError;

      const { error: insertTxError } = await serviceClient
        .from("premium_transactions")
        .insert({
          user_id: userData.user.id,
          stripe_session_id: sessionId,
          duration_days: durationDays,
          source: "stripe",
        });

      if (insertTxError) throw insertTxError;
    }

    const { data: premiumStatus, error: statusError } = await serviceClient
      .from("premium_access")
      .select("expires_at")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (statusError) throw statusError;

    const expiresAt = premiumStatus?.expires_at ?? null;
    const status = getStatusFromExpiry(expiresAt);

    return new Response(
      JSON.stringify({
        ...status,
        expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("verify-payment error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
