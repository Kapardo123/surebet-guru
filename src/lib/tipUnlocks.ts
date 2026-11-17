import { Capacitor } from "@capacitor/core";
import { Purchases, PRODUCT_CATEGORY } from "@revenuecat/purchases-capacitor";
import { supabase } from "@/integrations/supabase/client";
import { SINGLE_TIP_PRODUCT } from "@/lib/pricing";

/** Ids of tips this user has bought individually. */
export const loadTipUnlocks = async (userId: string): Promise<number[]> => {
  const { data, error } = await (supabase as any).from("tip_unlocks").select("tip_id").eq("user_id", userId);
  if (error) {
    console.warn("tip_unlocks unavailable:", error.message);
    return [];
  }
  return (data ?? []).map((r: { tip_id: number }) => Number(r.tip_id));
};

/** Store price string for the single-card product (Android), if available. */
export const nativeSingleTipPrice = async (): Promise<string | null> => {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { products } = await Purchases.getProducts({
      productIdentifiers: [SINGLE_TIP_PRODUCT],
      type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    });
    return products[0]?.priceString ?? null;
  } catch {
    return null;
  }
};

export type UnlockResult =
  | { status: "unlocked" }
  | { status: "redirect" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * Buy one members' card. Android: Google Play purchase through RevenueCat,
 * then the server verifies it. Web: Stripe Checkout (page redirects away).
 */
export const buySingleTip = async (tipId: number): Promise<UnlockResult> => {
  try {
    if (Capacitor.isNativePlatform()) {
      const { products } = await Purchases.getProducts({
        productIdentifiers: [SINGLE_TIP_PRODUCT],
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      const product = products[0];
      if (!product) return { status: "error", message: "Single cards aren't available in the store yet." };
      try {
        await Purchases.purchaseStoreProduct({ product });
      } catch (e: any) {
        if (e?.userCancelled) return { status: "cancelled" };
        throw e;
      }
      const { data, error } = await supabase.functions.invoke("unlock-tip-native", { body: { tipId } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Unlock failed");
      return { status: "unlocked" };
    }

    const { data, error } = await supabase.functions.invoke("create-payment", {
      body: { tipId, origin: window.location.origin },
    });
    if (error || !data?.url) throw new Error(data?.error || error?.message || "Checkout unavailable");
    window.location.href = data.url;
    return { status: "redirect" };
  } catch (e: any) {
    return { status: "error", message: e?.message || "Something went wrong" };
  }
};

/** Confirm a Stripe Checkout session after the redirect back. */
export const verifyCheckout = async (sessionId: string) => {
  const { data, error } = await supabase.functions.invoke("verify-payment", { body: { sessionId } });
  if (error || data?.error) throw new Error(data?.error || error?.message || "Could not verify payment");
  return data as { kind?: "tip"; tipId?: number; active?: boolean; daysLeft?: number; expiresAt?: string | null };
};

/** Start a Stripe Checkout for a membership pass (web). */
export const startPlanCheckout = async (duration: number) => {
  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: { duration, origin: window.location.origin },
  });
  if (error || !data?.url) throw new Error(data?.error || error?.message || "Checkout unavailable");
  window.location.href = data.url;
};
