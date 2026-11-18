import { supabase } from "@/integrations/supabase/client";

const PENDING = "gsb_pending_ref";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.surebet.guru";

const call = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("referral", { body });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Referral service unavailable");
  return data;
};

export const getInviteCode = async (): Promise<string> => (await call({ action: "get-code" })).code;

export const getReferralStats = async (): Promise<{ friends: number; cards: number }> => {
  const d = await call({ action: "stats" });
  return { friends: d.total_referrals ?? 0, cards: d.total_free_cards ?? d.total_referrals ?? 0 };
};

export const redeemCode = async (code: string) => call({ action: "use-code", code: code.trim().toUpperCase() });

/** Remember a code typed at sign-up; it's redeemed after the first verified sign-in. */
export const setPendingCode = (code: string) => {
  try {
    if (code.trim()) localStorage.setItem(PENDING, code.trim().toUpperCase());
  } catch {
    /* storage unavailable */
  }
};

export const redeemPendingCode = async (): Promise<boolean> => {
  let code: string | null = null;
  try {
    code = localStorage.getItem(PENDING);
  } catch {
    return false;
  }
  if (!code) return false;
  try {
    await redeemCode(code);
    localStorage.removeItem(PENDING);
    return true;
  } catch (e: any) {
    // Keep it for later only while the email is still unverified.
    if (!/verify your email/i.test(e?.message || "")) localStorage.removeItem(PENDING);
    return false;
  }
};

export const shareInvite = async (code: string) => {
  const text = `Join me on Great Sport Bets and get 3 days of Gold free. Use my invite code ${code} when you sign up.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Great Sport Bets", text, url: PLAY_STORE_URL });
      return "shared";
    }
  } catch {
    /* cancelled */
  }
  await navigator.clipboard?.writeText(`${text} ${PLAY_STORE_URL}`);
  return "copied";
};
