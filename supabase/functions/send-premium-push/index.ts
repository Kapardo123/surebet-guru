import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Function started...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();

    if (!serviceAccountJson) {
      throw new Error("Brak sekretu FCM_SERVICE_ACCOUNT w ustawieniach Supabase.");
    }

    let serviceAccount;
    try {
      // Próba naprawy JSONa jeśli został błędnie zapisany z dodatkowymi cudzysłowami
      let cleanJson = serviceAccountJson.trim();
      if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) {
        cleanJson = cleanJson.substring(1, cleanJson.length - 1);
      }
      serviceAccount = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error details:", e.message);
      console.error("Secret value starts with:", serviceAccountJson.substring(0, 20));
      throw new Error(`Błąd formatu JSON w sekrecie FCM_SERVICE_ACCOUNT: ${e.message}. Sprawdź ustawienia Secrets w panelu Supabase.`);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Brak nagłówka Authorization." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sesja wygasła. Zaloguj się ponownie." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (adminEmail && user.email?.toLowerCase() !== adminEmail) {
      return new Response(JSON.stringify({ error: `Brak uprawnień admina. Zalogowany jako: ${user.email}` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const title = body?.title || "New Premium Tip!";
    const message = body?.message || body?.body || "Check out the new content.";

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const accessToken = tokenResponse.token;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();
    const { data: premiumUsers } = await serviceClient
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", nowIso);

    const userIds = premiumUsers?.map(u => u.user_id).filter(Boolean) || [];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "Brak aktywnych użytkowników Premium." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: pushTokens } = await serviceClient
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .in("user_id", userIds);

    const tokens = pushTokens?.map(t => t.token).filter(Boolean) || [];
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "Użytkownicy nie mają włączonych powiadomień." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let successCount = 0;
    for (const token of tokens) {
      try {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body: message },
              android: { priority: "high", notification: { sound: "default", click_action: "FCM_PLUGIN_ACTIVITY" } },
            },
          }),
        });
        if (res.ok) successCount++;
      } catch (e) {
        console.error("FCM Error:", e);
      }
    }

    return new Response(JSON.stringify({ ok: true, success: successCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Critical Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
