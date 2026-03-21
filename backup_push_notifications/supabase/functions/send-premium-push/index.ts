import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Payload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

const chunk = <T,>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY") ?? "";
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!fcmServerKey) {
      return new Response(JSON.stringify({ error: "Missing FCM_SERVER_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!adminEmail) {
      return new Response(JSON.stringify({ error: "Missing ADMIN_EMAIL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userData.user.email.toLowerCase() !== adminEmail) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const message = typeof body?.body === "string" ? body.body.trim() : "";
    const data = body?.data && typeof body.data === "object" ? body.data : undefined;
    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Missing title/body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const nowIso = new Date().toISOString();
    const { data: premiumRows, error: premiumError } = await serviceClient
      .from("premium_access")
      .select("user_id, expires_at")
      .gt("expires_at", nowIso);

    if (premiumError) throw premiumError;
    const premiumUserIds = (premiumRows ?? []).map((r: any) => r.user_id).filter(Boolean);
    if (premiumUserIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_premium_users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokens, error: tokenError } = await serviceClient
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .eq("platform", "android")
      .in("user_id", premiumUserIds);

    if (tokenError) throw tokenError;
    const tokenList = (tokens ?? [])
      .map((t: any) => (typeof t.token === "string" ? t.token : ""))
      .filter((t: string) => t.length > 0);

    if (tokenList.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_tokens" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let success = 0;
    let failure = 0;
    const invalidTokens: string[] = [];

    for (const part of chunk(tokenList, 500)) {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${fcmServerKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: part,
          notification: { title, body: message },
          data,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json) {
        failure += part.length;
        continue;
      }

      success += Number(json.success ?? 0);
      failure += Number(json.failure ?? 0);

      const results = Array.isArray(json.results) ? json.results : [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        const err = r?.error;
        if (err === "NotRegistered" || err === "InvalidRegistration") {
          const tok = part[i];
          if (typeof tok === "string") invalidTokens.push(tok);
        }
      }
    }

    if (invalidTokens.length > 0) {
      await serviceClient
        .from("push_tokens")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .in("token", invalidTokens);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        tokens: tokenList.length,
        success,
        failure,
        disabled: invalidTokens.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
