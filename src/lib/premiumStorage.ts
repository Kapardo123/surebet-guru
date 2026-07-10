import { supabase } from "@/integrations/supabase/client";

const PREMIUM_KEY = "tipstr_premium";

export interface PremiumData {
  activatedAt: string;
  durationDays: number;
}

export const activatePremium = (days: number) => {
  const data: PremiumData = {
    activatedAt: new Date().toISOString(),
    durationDays: days,
  };
  localStorage.setItem(PREMIUM_KEY, JSON.stringify(data));
};

export const getPremiumStatus = (): { active: boolean; daysLeft: number } => {
  try {
    const stored = localStorage.getItem(PREMIUM_KEY);
    if (!stored) return { active: false, daysLeft: 0 };
    const data: PremiumData = JSON.parse(stored);
    const activated = new Date(data.activatedAt);
    const expiresAt = new Date(activated.getTime() + data.durationDays * 86400000);
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000));
    return { active: daysLeft > 0, daysLeft };
  } catch {
    return { active: false, daysLeft: 0 };
  }
};

export const clearPremium = () => {
  localStorage.removeItem(PREMIUM_KEY);
};

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
