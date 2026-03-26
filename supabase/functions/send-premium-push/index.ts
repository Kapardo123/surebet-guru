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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();

    if (!serviceAccountJson) throw new Error("Missing FCM_SERVICE_ACCOUNT secret");

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Brak nagłówka autoryzacji. Zaloguj się ponownie." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Bezpieczne dekodowanie ID użytkownika z tokena
    let userId;
    try {
      const payloadBase64 = authHeader.split(".")[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      userId = decodedPayload.sub;
      
      if (decodedPayload.role === "anon") {
        return new Response(JSON.stringify({ error: "Używasz klucza anonimowego. Wyloguj się i zaloguj jako Admin." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Nieprawidłowy token sesji. Zaloguj się ponownie." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Pobranie pełnych danych użytkownika kluczem serwisu
    const { data: { user }, error: authError } = await serviceClient.auth.admin.getUserById(userId);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nie znaleziono użytkownika lub sesja wygasła." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (adminEmail && user.email?.toLowerCase() !== adminEmail) {
      return new Response(JSON.stringify({ error: `Brak uprawnień. Zalogowany jako: ${user.email}` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const title = body?.title || "New Premium Tip!";
    const message = body?.message || body?.body || "Check out the new content.";

    const serviceAccount = JSON.parse(serviceAccountJson);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const accessToken = tokenResponse.token;

    // Pobieranie aktywnych użytkowników Premium
    const { data: premiumUsers } = await serviceClient
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", new Date().toISOString());

    const userIds = premiumUsers?.map(u => u.user_id) || [];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "Brak aktywnych użytkowników Premium." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Pobieranie tokenów
    const { data: pushTokens } = await serviceClient
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .in("user_id", userIds);

    const tokens = pushTokens?.map(t => t.token) || [];
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "Użytkownicy Premium nie mają włączonych powiadomień." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let successCount = 0;
    for (const token of tokens) {
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
    }

    return new Response(JSON.stringify({ ok: true, success: successCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Critical Function error:", error);
    return new Response(JSON.stringify({ error: `Błąd serwera: ${error.message}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
