import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  // 1. Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();

    if (!serviceAccountJson) {
      throw new Error("Missing FCM_SERVICE_ACCOUNT secret");
    }

    // 2. Initialize Service Client
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Get User from the verified JWT (verify_jwt=true handles the verification)
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // We get the user data using service_role to be absolutely sure we can read it
    const { data: { user }, error: authError } = await serviceClient.auth.admin.getUserById(
      // The 'sub' claim in JWT is the user ID
      JSON.parse(atob(authHeader.split(".")[1])).sub
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "User not found or session invalid" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Admin Check
    if (adminEmail && user.email?.toLowerCase() !== adminEmail) {
      console.warn(`Access denied for ${user.email}`);
      return new Response(JSON.stringify({ error: "Forbidden: Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Parse Request Body
    const body = await req.json();
    const title = body?.title || "New Premium Tip!";
    const message = body?.message || body?.body || "Check out the new premium content.";

    // 6. Initialize Google FCM
    const serviceAccount = JSON.parse(serviceAccountJson);
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    const accessToken = tokenResponse.token;

    // 7. Fetch Premium Users
    const nowIso = new Date().toISOString();
    const { data: premiumUsers } = await serviceClient
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", nowIso);

    const userIds = premiumUsers?.map(u => u.user_id) || [];
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no_premium_users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Fetch Tokens
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

    // 9. Send Pushes via FCM v1
    let successCount = 0;
    for (const token of tokens) {
      try {
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
              android: { 
                priority: "high", 
                notification: { 
                  sound: "default",
                  click_action: "FCM_PLUGIN_ACTIVITY"
                } 
              },
            },
          }),
        });
        if (res.ok) successCount++;
        else {
          const err = await res.json();
          console.error("FCM Send Error:", err);
        }
      } catch (err) {
        console.error("FCM Network Error:", err);
      }
    }

    return new Response(JSON.stringify({ ok: true, success: successCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Critical Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
