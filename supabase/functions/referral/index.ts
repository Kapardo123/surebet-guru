import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const addPremiumDays = async (
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  days: number,
) => {
  const now = new Date();

  const { data: current, error: currentError } = await supabaseClient
    .from("premium_access")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError) throw currentError;

  const currentExpiry = current?.expires_at ? new Date(current.expires_at) : null;
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const nextExpiry = new Date(baseDate.getTime() + days * 86400000);

  const { error: upsertError } = await supabaseClient
    .from("premium_access")
    .upsert(
      {
        user_id: userId,
        expires_at: nextExpiry.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertError) throw upsertError;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await anonClient.auth.getClaims(token);
    if (authError || !data?.claims) throw new Error("Not authenticated");
    const userId = data.claims.sub as string;

    const { action, code } = await req.json();

    if (action === "get-code") {
      const { data: existing } = await supabase
        .from("referrals")
        .select("referral_code")
        .eq("referrer_id", userId)
        .is("referred_user_id", null)
        .limit(1)
        .single();

      if (existing) {
        return new Response(JSON.stringify({ code: existing.referral_code }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newCode = `GSB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const { error } = await supabase.from("referrals").insert({
        referrer_id: userId,
        referral_code: newCode,
      });
      if (error) throw error;

      return new Response(JSON.stringify({ code: newCode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "use-code") {
      if (!code) throw new Error("Code required");

      const { data: referral, error: findError } = await supabase
        .from("referrals")
        .select("*")
        .eq("referral_code", code.toUpperCase().trim())
        .is("referred_user_id", null)
        .single();

      if (findError || !referral) throw new Error("Invalid or already used code");
      if (referral.referrer_id === userId) throw new Error("You can't use your own code");

      const { error: updateError } = await supabase
        .from("referrals")
        .update({
          referred_user_id: userId,
          used_at: new Date().toISOString(),
          rewarded: true,
        })
        .eq("id", referral.id);

      if (updateError) throw updateError;

      // Generate new code for referrer
      const nextCode = `GSB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await supabase.from("referrals").insert({
        referrer_id: referral.referrer_id,
        referral_code: nextCode,
      });

      await addPremiumDays(supabase, userId, 3);

      return new Response(JSON.stringify({
        success: true,
        reward_days: 3,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stats") {
      const { data: referrals } = await supabase
        .from("referrals")
        .select("id")
        .eq("referrer_id", userId)
        .not("referred_user_id", "is", null);

      return new Response(JSON.stringify({
        total_referrals: referrals?.length || 0,
        total_reward_days: (referrals?.length || 0) * 3,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Referral error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
