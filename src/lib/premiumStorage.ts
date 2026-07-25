import { supabase } from "@/integrations/supabase/client";

/**
 * Adds N days of premium to the user's account via Supabase.
 * Extends existing premium or creates a new one.
 */
export const addPremiumDays = async (userId: string, days: number): Promise<boolean> => {
  try {
    const { data: existing } = await (supabase as any)
      .from("premium_access")
      .select("expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    let newExpiresAt: Date;

    if (existing?.expires_at && new Date(existing.expires_at) > now) {
      newExpiresAt = new Date(new Date(existing.expires_at).getTime() + days * 86400000);
    } else {
      newExpiresAt = new Date(now.getTime() + days * 86400000);
    }

    await (supabase as any)
      .from("premium_access")
      .upsert({
        user_id: userId,
        expires_at: newExpiresAt.toISOString(),
        updated_at: now.toISOString(),
      });

    return true;
  } catch (e) {
    console.error("addPremiumDays failed:", e);
    return false;
  }
};

/**
 * Adds 1 day of premium to the user's account via Supabase.
 */
export const addPremiumDay = async (userId: string): Promise<boolean> => {
  return addPremiumDays(userId, 1);
};
