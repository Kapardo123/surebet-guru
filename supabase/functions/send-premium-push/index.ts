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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();

    if (!serviceAccountJson) {
      throw new Error("Missing FCM_SERVICE_ACCOUNT secret");
    }

    // 1. Weryfikacja użytkownika przez oficjalny klient Supabase
    const authHeader = req.headers.get("Authorization")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Nieautoryzowany: Zaloguj się ponownie." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Sprawdzenie uprawnień admina
    if (adminEmail && user.email?.toLowerCase() !== adminEmail) {
      return new Response(JSON.stringify({ error: "Brak uprawnień administratora." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const title = body?.title || "New Tip!";
    const message = body?.message || body?.body || "Check out the new premium tip.";

    // 3. Inicjalizacja Google Auth dla FCM
    const serviceAccount = JSON.parse(serviceAccountJson);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 4. Pobieranie użytkowników premium i ich tokenów
    const { data: premiumUsers } = await serviceClient
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", new Date().toISOString());

    const userIds = premiumUsers?.map(u => u.user_id) || [];
    
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_premium_users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pushTokens } = await serviceClient
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .in("user_id", userIds);

    const tokens = pushTokens?.map(t => t.token) || [];

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_tokens" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Wysyłanie powiadomień
    let successCount = 0;
    for (const token of tokens) {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body: message },
            android: { priority: "high", notification: { sound: "default" } },
          },
        }),
      });
      if (res.ok) successCount++;
    }

    return new Response(JSON.stringify({ ok: true, success: successCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
