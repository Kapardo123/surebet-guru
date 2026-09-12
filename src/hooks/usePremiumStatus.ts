import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { getCustomerInfo } from "@/integrations/revenuecat";
import { daysForProduct } from "@/lib/premiumPlans";

interface PremiumStatusState {
  active: boolean;
  daysLeft: number;
  expiresAt: string | null;
  loading: boolean;
}

const defaultState: PremiumStatusState = {
  active: false,
  daysLeft: 0,
  expiresAt: null,
  loading: true,
};

const PREMIUM_CACHE_KEY = "gsb_premium_status";

const getCachedStatus = (userId: string): PremiumStatusState | null => {
  try {
    const cached = localStorage.getItem(`${PREMIUM_CACHE_KEY}_${userId}`);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
};

const setCachedStatus = (userId: string, state: PremiumStatusState) => {
  try {
    localStorage.setItem(`${PREMIUM_CACHE_KEY}_${userId}`, JSON.stringify(state));
  } catch {
    /* storage quota — ignore */
  }
};

export const usePremiumStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<PremiumStatusState>(defaultState);

  // Initial load from cache
  useEffect(() => {
    if (user?.id) {
      const cached = getCachedStatus(user.id);
      if (cached) {
        setState({ ...cached, loading: false });
      }
    }
  }, [user?.id]);

  const refresh = useCallback(async (providedInfo?: any, manualDuration?: number) => {
    if (authLoading || !user) {
      if (!user && !authLoading) setState({ ...defaultState, loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const nowMs = Date.now();

      // 1. Database premium — the source of truth for STACKING. Wheel prizes,
      // admin grants, Stripe and the RevenueCat webhook all ADD days here.
      const { data } = await (supabase as any)
        .from("premium_access")
        .select("expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      const dbExpiryMs = data?.expires_at ? new Date(data.expires_at).getTime() : 0;

      // 2. RevenueCat (native only). For non-renewing products (premium_XX_days)
      // RC reports no expiry, so we derive it from product id + purchase date.
      let rcExpiryMs = 0;
      let lifetime = false;

      if (Capacitor.getPlatform() !== "web") {
        try {
          const info = await Promise.race([
            providedInfo || getCustomerInfo(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("RC Timeout")), 5000)),
          ]);

          const activeEntitlements = (info?.entitlements?.active || {}) as Record<string, any>;
          const keys = Object.keys(activeEntitlements);
          const entitlement = activeEntitlements["Great Sport Bets Pro"] || activeEntitlements[keys[0]];

          if (entitlement) {
            if (entitlement.expirationDate) {
              rcExpiryMs = new Date(entitlement.expirationDate).getTime();
            } else {
              const planDays = daysForProduct(entitlement.productIdentifier);
              const purchaseMs =
                entitlement.latestPurchaseDateMillis ||
                entitlement.originalPurchaseDateMillis ||
                (entitlement.latestPurchaseDate ? new Date(entitlement.latestPurchaseDate).getTime() : 0) ||
                (entitlement.originalPurchaseDate ? new Date(entitlement.originalPurchaseDate).getTime() : 0);

              if (planDays > 0 && purchaseMs > 0) {
                rcExpiryMs = purchaseMs + planDays * 86400000;
              } else if (manualDuration) {
                rcExpiryMs = nowMs + manualDuration * 86400000;
              } else if (/life|forever|unlimited/.test(String(entitlement.productIdentifier || "").toLowerCase())) {
                lifetime = true; // explicit lifetime product
              }
            }
          }
        } catch (e) {
          console.error("RC Error:", e);
        }
      }

      // 3. Give the user whichever entitlement reaches furthest. This is what
      // makes "buy 7 days while having 14" show 21 on native instead of silently
      // replacing the stacked total with the store's 7 days.
      const bestMs = lifetime ? Number.POSITIVE_INFINITY : Math.max(rcExpiryMs || 0, dbExpiryMs || 0);
      const active = bestMs > nowMs;
      const expiresAt = lifetime ? null : bestMs > 0 ? new Date(bestMs).toISOString() : null;
      const daysLeft = lifetime ? 999 : active ? Math.max(0, Math.ceil((bestMs - nowMs) / 86400000)) : 0;

      const newState = { active, daysLeft, expiresAt, loading: false };
      setState(newState);
      if (user?.id) setCachedStatus(user.id, newState);
    } catch (err) {
      console.error("Critical usePremiumStatus error:", err);
      setState({ ...defaultState, loading: false });
    }
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
};
