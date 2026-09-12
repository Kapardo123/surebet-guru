// Supabase Edge Function: revenuecat-webhook
// ----------------------------------------------------------------------------
// Keeps premium_access in sync for store purchases. Configure this URL in the
// RevenueCat dashboard (Project → Integrations → Webhooks) with:
//
//   Header:  Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
//   (also accepted: x-revenuecat-secret: <REVENUECAT_WEBHOOK_SECRET>)
//
// Grant rules:
//   • subscriptions   → use RevenueCat's authoritative expiry, never shorten an
//                       existing longer premium.
//   • non-renewing    → RevenueCat sends no expiry, so we derive the length
//     (premium_XX_days) from the product id and ADD it on top of the user's
//                       current premium (stacking, not replacing).
//
// Deliveries are deduplicated by event id so retries can't double-grant.
//
// Deploy: supabase functions deploy revenuecat-webhook --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-revenuecat-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTIVE_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "PRODUCT_CHANGE",
  "UNCANCELLATION",
  "SUBSCRIPTION_EXTENDED",
  "NON_RENEWING_PURCHASE",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);

const DAY_MS = 24 * 60 * 60 * 1000;

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const KNOWN_PRODUCT_DAYS: Record<string, number> = {
  premium_7_days: 7,
  premium_15_days: 15,
  premium_30_days: 30,
  premium_77_days: 7, // store id for the 7-day plan (extra "7")
};

// Plan lengths we trust when parsing an identifier.
const TRUSTED_DAYS = [1, 3, 7, 10, 14, 15, 30, 60, 90, 120, 180, 365];

/** "77" → 7, "1515" → 15, "3030" → 30 — only when the result is trusted. */
const collapseDoubled = (n: number): number | null => {
  const s = String(n);
  if (s.length < 2 || s.length % 2 !== 0) return null;
  const half = s.slice(0, s.length / 2);
  if (half !== s.slice(s.length / 2)) return null;
  const value = Number(half);
  return TRUSTED_DAYS.includes(value) ? value : null;
};

/** Length in days for a non-renewing product, e.g. "premium_77_days" → 7. */
const daysForProduct = (productId: string): number => {
  if (!productId) return 0;
  const id = productId.trim().toLowerCase();

  const exact = KNOWN_PRODUCT_DAYS[id];
  if (exact) return exact;

  const numbers = [...id.matchAll(/(\d+)\s*[-_]?\s*days?/g)].map((m) => Number(m[1]));

  const trusted = numbers.find((n) => TRUSTED_DAYS.includes(n));
  if (trusted) return trusted;

  for (const n of numbers) {
    const collapsed = collapseDoubled(n);
    if (collapsed) return collapsed;
  }

  if (/week/.test(id)) return 7;
  if (/month/.test(id)) return 30;
  if (/year|annual/.test(id)) return 365;
  return 0;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";
    if (!secret) return json({ error: "Webhook secret not configured" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const headerSecret = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : (req.headers.get("x-revenuecat-secret") || "").trim();
    if (headerSecret !== secret) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const event = body?.event || {};
    const type: string = String(event?.type || "");
    const eventId: string = String(event?.id || "");
    const expirationMs: number | null = Number.isFinite(event?.expiration_at_ms)
      ? Number(event.expiration_at_ms)
      : null;
    const productId: string = String(event?.product_id || "");

    // RevenueCat may report the anonymous id; the Supabase user id is in
    // `aliases` after login/identify. Resolve to whichever id is a real user.
    const candidates = [
      String(event?.app_user_id || ""),
      ...(Array.isArray(event?.aliases) ? event.aliases.map((a: unknown) => String(a)) : []),
    ].map((s) => s.trim()).filter(Boolean);
    if (!candidates.length) return json({ ok: true, skipped: "no app_user_id" });

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let appUserId: string | undefined;
    for (const candidate of candidates) {
      try {
        const { data, error } = await db.auth.admin.getUserById(candidate);
        if (!error && data?.user?.id) {
          appUserId = data.user.id;
          break;
        }
      } catch {
        /* not a valid user id — try the next alias */
      }
    }
    if (!appUserId) return json({ ok: true, skipped: "unknown user" });

    // Idempotency: claim the event id first; a retry hits the primary key.
    if (eventId) {
      const { error: dupError } = await db
        .from("rc_webhook_events")
        .insert({ event_id: eventId, event_type: type, user_id: appUserId });
      if (dupError) {
        if (dupError.code === "23505") return json({ ok: true, action: "duplicate" });
        throw new Error(dupError.message);
      }
    }

    try {
      if (type === "EXPIRATION") {
        const { error } = await db.from("premium_access").delete().eq("user_id", appUserId);
        if (error) throw new Error(error.message);
        return json({ ok: true, action: "revoked" });
      }

      if (!ACTIVE_EVENTS.has(type)) {
        return json({ ok: true, skipped: `ignored ${type}` });
      }

      const { data: existing } = await db
        .from("premium_access")
        .select("expires_at")
        .eq("user_id", appUserId)
        .maybeSingle();

      const now = Date.now();
      const existingMs = existing?.expires_at ? new Date(existing.expires_at).getTime() : 0;
      const productDays = daysForProduct(productId);

      let expiresAt: string;
      if (expirationMs) {
        // Subscription: RevenueCat already accounts for renewals. Only refuse to
        // shorten a longer premium the user already has (wheel/admin bonus).
        if (existingMs > expirationMs) {
          return json({ ok: true, action: "kept-longer", expiresAt: existing.expires_at });
        }
        expiresAt = new Date(Math.max(expirationMs, now)).toISOString();
      } else if (productDays > 0) {
        // Non-renewing purchase: stack the purchased days on top.
        const base = existingMs > now ? existingMs : now;
        expiresAt = new Date(base + productDays * DAY_MS).toISOString();
      } else {
        console.warn(`[revenuecat-webhook] unmapped product id "${productId}" (type ${type})`);
        return json({ ok: true, skipped: `no expiry for ${type}` });
      }

      const { error } = await db
        .from("premium_access")
        .upsert({ user_id: appUserId, expires_at: expiresAt, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);

      return json({ ok: true, action: "granted", expiresAt, stackedDays: expirationMs ? 0 : productDays });
    } catch (error) {
      // Release the idempotency claim so RevenueCat's retry can succeed.
      if (eventId) {
        await db.from("rc_webhook_events").delete().eq("event_id", eventId).then(
          () => {},
          () => {},
        );
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[revenuecat-webhook]", message);
    return json({ error: message }, 400);
  }
});
