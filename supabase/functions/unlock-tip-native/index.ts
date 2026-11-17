// Unlocks one members' tip after a $0.99 in-app purchase on Android.
//
// The client buys the consumable product SINGLE_TIP_PRODUCT through
// RevenueCat, then calls this function with the tip id. We ask RevenueCat's
// REST API (server-side secret key) which one-time purchases this user has,
// take one whose transaction id has not been spent on a tip yet, and record
// the unlock. The client is never trusted to say "I paid".
//
// Secrets: REVENUECAT_SECRET_KEY (RevenueCat > Project > API keys > secret).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const SINGLE_TIP_PRODUCT = "gsb_single_tip";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anon.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const userId = userData.user.id;

    const { tipId } = await req.json();
    const id = Number(tipId);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "Invalid tipId" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    const { data: tip } = await service.from("tips").select("id, is_premium").eq("id", id).maybeSingle();
    if (!tip) return json({ error: "Tip not found" }, 404);

    const { data: owned } = await service
      .from("tip_unlocks").select("id").eq("user_id", userId).eq("tip_id", id).maybeSingle();
    if (owned) return json({ kind: "tip", tipId: id, already: true });

    const rcKey = Deno.env.get("REVENUECAT_SECRET_KEY");
    if (!rcKey) throw new Error("REVENUECAT_SECRET_KEY is not set");

    // The app logs users into RevenueCat with their Supabase user id.
    const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${rcKey}` },
    });
    if (!rc.ok) throw new Error(`RevenueCat lookup failed (${rc.status})`);
    const info = await rc.json();
    const purchases: Array<{ id?: string; store_transaction_id?: string }> =
      info?.subscriber?.non_subscriptions?.[SINGLE_TIP_PRODUCT] ?? [];
    const refs = purchases.map((p) => p.store_transaction_id || p.id).filter(Boolean) as string[];
    if (refs.length === 0) return json({ error: "No purchase found" }, 402);

    const { data: spent } = await service.from("tip_unlocks").select("payment_ref").in("payment_ref", refs);
    const used = new Set((spent ?? []).map((r: { payment_ref: string }) => r.payment_ref));
    const free = refs.find((r) => !used.has(r));
    if (!free) return json({ error: "Every purchase has already been used" }, 402);

    const { error: insertError } = await service
      .from("tip_unlocks")
      .insert({ user_id: userId, tip_id: id, source: "revenuecat", payment_ref: free });
    if (insertError) throw insertError;

    return json({ kind: "tip", tipId: id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("unlock-tip-native error:", message);
    return json({ error: message }, 500);
  }
});
