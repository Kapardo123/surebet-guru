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

    if (!serviceAccountJson) throw new Error("Missing FCM_SERVICE_ACCOUNT secret");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize clients
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get user using the standard Supabase method (most reliable)
    // We use the anon key client but pass the user's token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Nieprawidłowa sesja. Zaloguj się ponownie." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`User verified: ${user.email}`);

    // Admin Check
    if (adminEmail && user.email?.toLowerCase() !== adminEmail) {
      console.warn(`Unauthorized access attempt by ${user.email}`);
      return new Response(JSON.stringify({ error: `Brak uprawnień administratora. Zalogowany jako: ${user.email}` }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const title = body?.title || "New Premium Tip!";
    const message = body?.message || body?.body || "Check out the new content.";

    // FCM Setup
    const serviceAccount = JSON.parse(serviceAccountJson);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const accessToken = tokenResponse.token;

    // Fetch Premium Users
    const nowIso = new Date().toISOString();
    const { data: premiumUsers, error: premiumErr } = await serviceClient
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", nowIso);

    if (premiumErr) throw premiumErr;

    const userIds = premiumUsers?.map(u => u.user_id).filter(Boolean) || [];
    console.log(`Found ${userIds.length} premium users.`);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "Brak aktywnych użytkowników Premium." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Fetch Tokens
    const { data: pushTokens, error: tokenErr } = await serviceClient
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .in("user_id", userIds);

    if (tokenErr) throw tokenErr;

    const tokens = pushTokens?.map(t => t.token).filter(Boolean) || [];
    console.log(`Found ${tokens.length} tokens to notify.`);

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
              android: { 
                priority: "high", 
                notification: { sound: "default", click_action: "FCM_PLUGIN_ACTIVITY" } 
              },
            },
          }),
        });
        if (res.ok) successCount++;
      } catch (e) {
        console.error(`Error sending to token ${token.substring(0, 10)}:`, e);
      }
    }

    console.log(`Successfully sent ${successCount} notifications.`);

    return new Response(JSON.stringify({ ok: true, success: successCount }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Critical Function error:", error.message);
    return new Response(JSON.stringify({ error: `Błąd serwera: ${error.message}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
