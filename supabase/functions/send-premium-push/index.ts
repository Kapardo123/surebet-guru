import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";
import { decode } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Payload = {
  title: string;
  body?: string;
  message?: string;
  data?: Record<string, string>;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceAccountJson) {
      console.error("Missing FCM_SERVICE_ACCOUNT secret");
      return new Response(JSON.stringify({ error: "Brak konfiguracji FCM_SERVICE_ACCOUNT w Supabase Secrets." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Brak autoryzacji (Missing Bearer token)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wyciągamy dane użytkownika bezpośrednio z JWT (Supabase już go zweryfikował jeśli verify_jwt=true)
    const token = authHeader.replace("Bearer ", "");
    const [header, payload, signature] = decode(token);
    const userEmail = (payload as any)?.email?.toLowerCase();

    if (!userEmail) {
      console.error("Could not extract email from JWT");
      return new Response(JSON.stringify({ error: "Nie można zweryfikować tożsamości użytkownika." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Opcjonalna blokada tylko dla admina
    if (adminEmail && userEmail !== adminEmail) {
      console.warn(`User ${userEmail} tried to send push, but admin is ${adminEmail}`);
      return new Response(JSON.stringify({ error: "Brak uprawnień do wysyłania powiadomień." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    const title = body?.title?.trim() || "";
    const message = body?.body?.trim() || body?.message?.trim() || "";
    const customData = body?.data || {};

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Brak tytułu lub treści powiadomienia." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    // Inicjalizacja Google Auth dla FCM v1
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error("Failed to get Google access token");
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Pobierz aktywnych użytkowników Premium
    const nowIso = new Date().toISOString();
    const { data: premiumRows, error: premiumError } = await serviceClient
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", nowIso);

    if (premiumError) throw premiumError;
    const premiumUserIds = (premiumRows ?? []).map((r: any) => r.user_id).filter(Boolean);

    console.log(`Found ${premiumUserIds.length} active premium users.`);

    if (premiumUserIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "no_premium_users" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Pobierz tokeny Push dla tych użytkowników
    const { data: tokens, error: tokenError } = await serviceClient
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .eq("platform", "android")
      .in("user_id", premiumUserIds);

    if (tokenError) throw tokenError;
    const tokenList = (tokens ?? []).map((t: any) => t.token).filter(Boolean);

    console.log(`Found ${tokenList.length} enabled push tokens.`);

    if (tokenList.length === 0) {
      return new Response(JSON.stringify({ ok: true, success: 0, reason: "no_tokens" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let successCount = 0;
    let failureCount = 0;
    const invalidTokens: string[] = [];

    // Wysyłanie przez FCM v1
    for (const token of tokenList) {
      try {
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: title,
                  body: message,
                },
                data: {
                  ...customData,
                  title: title,
                  body: message,
                },
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                    click_action: "FCM_PLUGIN_ACTIVITY",
                  },
                },
              },
            }),
          }
        );

        if (fcmResponse.ok) {
          successCount++;
        } else {
          const result = await fcmResponse.json();
          console.error(`FCM Error for token ${token.substring(0, 10)}...:`, result);
          failureCount++;
          const errorCode = result?.error?.details?.[0]?.errorCode || result?.error?.status;
          if (errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
            invalidTokens.push(token);
          }
        }
      } catch (err) {
        console.error("Fetch error for FCM:", err);
        failureCount++;
      }
    }

    // Czyszczenie nieaktywnych tokenów
    if (invalidTokens.length > 0) {
      await serviceClient
        .from("push_tokens")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .in("token", invalidTokens);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total: tokenList.length,
        success: successCount,
        failure: failureCount,
        cleaned: invalidTokens.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
