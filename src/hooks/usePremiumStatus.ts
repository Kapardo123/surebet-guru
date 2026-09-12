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
      let active = false;
      let daysLeft = 0;
      let expiresAt = null;

      // 1. Sprawdź status w RevenueCat (tylko na urządzeniach mobilnych)
      if (Capacitor.getPlatform() !== 'web') {
        try {
          // Dodajemy timeout dla wywołania natywnego, aby nie blokowało renderu
          const info = await Promise.race([
            providedInfo || getCustomerInfo(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("RC Timeout")), 5000))
          ]);
          
          if (info && info.entitlements && info.entitlements.active) {
            const activeEntitlements = Object.keys(info.entitlements.active);
            const entitlement = info.entitlements.active["Great Sport Bets Pro"] || 
                               info.entitlements.active[activeEntitlements[0]];
            
            if (entitlement) {
              active = true;
              expiresAt = entitlement.expirationDate;

              // Non-renewing products (premium_XX_days) come back from
              // RevenueCat as lifetime (expirationDate = null). Derive the real
              // expiry from the product id + purchase date so a 30-day purchase
              // is not treated as unlimited.
              if (!expiresAt) {
                const planDays = daysForProduct(entitlement.productIdentifier);
                const purchaseMs =
                  entitlement.latestPurchaseDateMillis ||
                  entitlement.originalPurchaseDateMillis ||
                  (entitlement.latestPurchaseDate ? new Date(entitlement.latestPurchaseDate).getTime() : 0) ||
                  (entitlement.originalPurchaseDate ? new Date(entitlement.originalPurchaseDate).getTime() : 0);

                if (planDays > 0 && purchaseMs > 0) {
                  expiresAt = new Date(purchaseMs + planDays * 86400000).toISOString();
                } else if (manualDuration) {
                  const expiryDate = new Date();
                  expiryDate.setDate(expiryDate.getDate() + manualDuration);
                  expiresAt = expiryDate.toISOString();
                }
              }

              if (expiresAt) {
                const expiryDate = new Date(expiresAt);
                active = expiryDate.getTime() > Date.now();
                daysLeft = active
                  ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000))
                  : 0;
              } else {
                daysLeft = 999; // genuinely lifetime product
              }
            }
          }
        } catch (e) {
          console.error('RC Error:', e);
        }
      }

      // 2. Fallback do Supabase
      if (!active) {
        const { data } = await (supabase as any)
          .from("premium_access")
          .select("expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (data?.expires_at) {
          const expiryDate = new Date(data.expires_at);
          if (expiryDate > new Date()) {
            active = true;
            expiresAt = data.expires_at;
            daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));
          }
        }
      }

      const newState = {
        active,
        daysLeft,
        expiresAt,
        loading: false,
      };

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
