import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const getStatusFromExpiry = (expiresAt: string | null) => {
  if (!expiresAt) return { active: false, daysLeft: 0 };

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000));

  return {
    active: daysLeft > 0,
    daysLeft,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      throw new Error("Not authenticated");
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: premium, error: premiumError } = await serviceClient
      .from("premium_access")
      .select("expires_at")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (premiumError) throw premiumError;

    const expiresAt = premium?.expires_at ?? null;
    const status = getStatusFromExpiry(expiresAt);

    return new Response(
      JSON.stringify({
        ...status,
        expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("premium-status error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
