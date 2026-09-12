// Supabase Edge Function: grant-premium
// ----------------------------------------------------------------------------
// Admin-only premium grant. Clients can no longer write to premium_access
// directly, so the Admin panel calls this instead.
//
// POST { email: string, days: number }  (Authorization: Bearer <admin JWT>)
//   -> { ok: true, expiresAt, userId }
//
// Deploy: supabase functions deploy grant-premium --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!adminEmail || !user?.email || user.email.toLowerCase() !== adminEmail) {
      return json({ error: "Brak uprawnień administratora" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim();
    const days = Math.max(1, Math.min(3650, parseInt(String(body?.days ?? "30"), 10) || 30));
    if (!email) return json({ error: "Missing 'email'" }, 400);

    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!profile?.id) return json({ error: "User not found" }, 404);

    const { data: existing } = await db
      .from("premium_access")
      .select("expires_at")
      .eq("user_id", profile.id)
      .maybeSingle();

    const now = Date.now();
    const current = existing?.expires_at ? new Date(existing.expires_at).getTime() : 0;
    const base = current > now ? current : now;
    const expiresAt = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await db
      .from("premium_access")
      .upsert({ user_id: profile.id, expires_at: expiresAt, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    return json({ ok: true, expiresAt, userId: profile.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[grant-premium]", message);
    return json({ error: message }, 400);
  }
});
