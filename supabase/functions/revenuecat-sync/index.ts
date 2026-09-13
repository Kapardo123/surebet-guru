// Supabase Edge Function: revenuecat-sync
// ----------------------------------------------------------------------------
// Reconciles premium_access with RevenueCat for the CURRENTLY AUTHENTICATED
// user. Needed because store products are non-renewing (premium_XX_days), which
// RevenueCat does not keep as active entitlements — so the app can't rely on
// customerInfo alone and the DB must be written from the server.
//
// The RC app_user_id is taken ONLY from the verified JWT (user.id); never from
// the request body, so a client cannot claim someone else's purchases.
//
// Deploy: supabase functions deploy revenuecat-sync
// Secret: REVENUECAT_API_KEY (RevenueCat v2 secret API key, sk_...)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RC_PROJECT = "proj58b3b674";
const DAY_MS = 24 * 60 * 60 * 1000;
const LIFETIME_MS = 4102444800000; // 2100-01-01

const KNOWN_PRODUCT_DAYS: Record<string, number> = {
  premium_7_days: 7,
  premium_15_days: 15,
  premium_30_days: 30,
  premium_77_days: 7,
};
const TRUSTED_DAYS = [1, 3, 7, 10, 14, 15, 30, 60, 90, 120, 180, 365];

const collapseDoubled = (n: number): number | null => {
  const s = String(n);
  if (s.length < 2 || s.length % 2 !== 0) return null;
  const half = s.slice(0, s.length / 2);
  if (half !== s.slice(s.length / 2)) return null;
  const value = Number(half);
  return TRUSTED_DAYS.includes(value) ? value : null;
};

const daysForProduct = (productId: string): number => {
  if (!productId) return 0;
  const id = productId.trim().toLowerCase();
  const exact = KNOWN_PRODUCT_DAYS[id];
  if (exact) return exact;
  const numbers = [...id.matchAll(/(\d+)\s*[-_]?\s*days?/g)].map((m) => Number(m[1]));
  const trusted = numbers.find((n) => TRUSTED_DAYS.includes(n));
  if (trusted) return trusted;
  for (const n of numbers) {
    const c = collapseDoubled(n);
    if (c) return c;
  }
  if (/week/.test(id)) return 7;
  if (/month/.test(id)) return 30;
  if (/year|annual/.test(id)) return 365;
  return 0;
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// id -> store_identifier, fetched once per instance.
let productMapCache: Record<string, string> | null = null;
const getProductMap = async (key: string): Promise<Record<string, string>> => {
  if (productMapCache) return productMapCache;
  const map: Record<string, string> = {};
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v2/projects/${RC_PROJECT}/products?limit=100`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (res.ok) {
      const body = await res.json();
      for (const p of body?.items ?? []) {
        if (p?.id) map[p.id] = String(p.store_identifier ?? p.id);
      }
    }
  } catch (_e) {
    /* fall through with an empty map */
  }
  productMapCache = map;
  return map;
};

const rcGet = async (key: string, path: string) => {
  try {
    const res = await fetch(`https://api.revenuecat.com/v2/projects/${RC_PROJECT}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const rcKey = Deno.env.get("REVENUECAT_API_KEY") ?? "";
    if (!rcKey) return json({ error: "REVENUECAT_API_KEY not configured" }, 500);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Not authenticated" }, 401);
    const userId = userData.user.id; // trusted identity

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const [productMap, purchases, subscriptions] = await Promise.all([
      getProductMap(rcKey),
      rcGet(rcKey, `/customers/${userId}/purchases`),
      rcGet(rcKey, `/customers/${userId}/subscriptions`),
    ]);

    const now = Date.now();

    // --- non-renewing purchases: reconstruct the stack from purchase history ---
    const items = (purchases?.items ?? []).filter(
      (it: any) => !it?.status || it.status === "owned",
    );
    let stackBase = 0;
    let lifetime = false;
    const oneTime = items
      .filter((it: any) => !/lifetime/.test(String(productMap[it.product_id] ?? it.product_id ?? "")))
      .sort((a: any, b: any) => (a.purchased_at ?? 0) - (b.purchased_at ?? 0));
    const hasLifetime = items.some((it: any) =>
      /lifetime/.test(String(productMap[it.product_id] ?? it.product_id ?? "")),
    );
    for (const it of oneTime) {
      const days = daysForProduct(String(productMap[it.product_id] ?? it.product_id ?? ""));
      const at = Number(it.purchased_at) || 0;
      if (days <= 0 || at <= 0) continue;
      stackBase = Math.max(stackBase, at);
      stackBase += days * DAY_MS;
    }
    if (hasLifetime) lifetime = true;

    // --- subscriptions: use the authoritative period end RevenueCat reports ---
    let subMs = 0;
    for (const s of subscriptions?.items ?? []) {
      const ends = Number(s?.current_period_end ?? s?.expires_at ?? s?.period_end ?? 0);
      if (ends > subMs) subMs = ends;
    }

    const rcExpiry = lifetime ? LIFETIME_MS : Math.max(stackBase, subMs);

    // Never shorten an existing longer premium (wheel/admin/Stripe bonus).
    const { data: existing } = await svc
      .from("premium_access")
      .select("expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const existingMs = existing?.expires_at ? new Date(existing.expires_at).getTime() : 0;
    const finalMs = Math.max(existingMs, rcExpiry);

    if (finalMs > now) {
      const expiresAt = new Date(finalMs).toISOString();
      const { error } = await svc
        .from("premium_access")
        .upsert({ user_id: userId, expires_at: expiresAt, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      return json({
        ok: true,
        active: true,
        expiresAt,
        rcExpiry: rcExpiry > 0 ? new Date(rcExpiry).toISOString() : null,
        purchases: items.length,
        source: rcExpiry >= existingMs ? "revenuecat" : "existing",
      });
    }

    return json({ ok: true, active: existingMs > now, expiresAt: existing?.expires_at ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[revenuecat-sync]", message);
    return json({ error: message }, 400);
  }
});
