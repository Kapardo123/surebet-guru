// Supabase Edge Function: daily-reward
// ----------------------------------------------------------------------------
// Server-side authority for the Daily Reward wheel.
//   • enforces the 24h cooldown in the database (not in localStorage)
//   • rolls the prize on the server (client cannot pick the outcome)
//   • grants premium days with the service role (clients can no longer write
//     to premium_access)
//
// POST { action: "status" } -> { canSpin, nextSpinAt }
// POST { action: "spin", deviceId? }
//   -> { ok: true, prize, days, expiresAt?, nextSpinAt }
//   -> { ok: false, reason: "cooldown", nextSpinAt }
//
// Deploy: supabase functions deploy daily-reward --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Prize = "free_tip" | "premium_1d" | "premium_7d" | "try_again";

// Free tip 20%, 1 day 0.05%, 7 days 0.0001%, rest "try again".
const rollPrize = (): Prize => {
  const r = Math.random();
  if (r < 0.2) return "free_tip";
  if (r < 0.2005) return "premium_1d";
  if (r < 0.200501) return "premium_7d";
  return "try_again";
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action === "spin" ? "spin" : "status";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Sesja wygasła. Zaloguj się ponownie." }, 401);

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: last } = await db
      .from("daily_spins")
      .select("spun_at")
      .eq("user_id", user.id)
      .order("spun_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastMs = last?.spun_at ? new Date(last.spun_at).getTime() : 0;
    const nextSpinAt = lastMs + COOLDOWN_MS;
    const canSpin = Date.now() >= nextSpinAt;
    const isFirstSpin = !last;

    if (action === "status") {
      return json({ canSpin, nextSpinAt: canSpin ? null : nextSpinAt, firstSpin: isFirstSpin });
    }

    if (!canSpin) {
      return json({ ok: false, reason: "cooldown", nextSpinAt });
    }

    // First-ever spin always gives something real (1 day premium) so new users
    // feel the value immediately; later spins use the normal odds.
    const prize: Prize = isFirstSpin ? "premium_1d" : rollPrize();
    let expiresAt: string | null = null;

    if (prize === "premium_1d" || prize === "premium_7d") {
      const days = prize === "premium_7d" ? 7 : 1;
      const { data: existing } = await db
        .from("premium_access")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      const now = Date.now();
      const current = existing?.expires_at ? new Date(existing.expires_at).getTime() : 0;
      const base = current > now ? current : now;
      expiresAt = new Date(base + days * DAY_MS).toISOString();

      const { error: upsertError } = await db
        .from("premium_access")
        .upsert({ user_id: user.id, expires_at: expiresAt, updated_at: new Date().toISOString() });
      if (upsertError) throw new Error(upsertError.message);
    }

    const { error: insertError } = await db.from("daily_spins").insert({
      user_id: user.id,
      device_id: body?.deviceId ? String(body.deviceId).slice(0, 200) : null,
    });
    if (insertError) throw new Error(insertError.message);

    return json({
      ok: true,
      prize,
      days: prize === "premium_7d" ? 7 : prize === "premium_1d" ? 1 : 0,
      expiresAt,
      nextSpinAt: Date.now() + COOLDOWN_MS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[daily-reward]", message);
    return json({ error: message }, 400);
  }
});
