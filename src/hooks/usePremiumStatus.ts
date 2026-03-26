import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import { getCustomerInfo } from "@/integrations/revenuecat";

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

export const usePremiumStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<PremiumStatusState>(defaultState);

  const refresh = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setState({ ...defaultState, loading: false });
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    try {
      let active = false;
      let daysLeft = 0;
      let expiresAt = null;

      // 1. Sprawdź status w RevenueCat (tylko na urządzeniach mobilnych)
      if (Capacitor.getPlatform() !== 'web') {
        const info = await getCustomerInfo();
        console.log('Customer Info z RevenueCat:', JSON.stringify(info));
        
        // Sprawdzamy aktywne uprawnienia
        if (info && info.entitlements && info.entitlements.active) {
          // Wyciągamy wszystkie aktywne uprawnienia dla debugowania
          const activeEntitlements = Object.keys(info.entitlements.active);
          console.log('Aktywne uprawnienia:', activeEntitlements);

          // Szukamy uprawnienia "Great Sport Bets Pro"
          const entitlement = info.entitlements.active["Great Sport Bets Pro"];
          
          if (entitlement) {
            console.log('Znaleziono uprawnienie Premium:', entitlement);
            active = true;
            expiresAt = entitlement.expirationDate;
            if (expiresAt) {
              const expiryDate = new Date(expiresAt);
              const now = new Date();
              daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000));
            } else {
              // Lifetime access lub brak daty wygaśnięcia
              daysLeft = 999;
            }
          } else if (activeEntitlements.length > 0) {
            // Jeśli są JAKIEŚ aktywne uprawnienia, ale nie to konkretne, 
            // to może być błąd w nazwie ID uprawnienia w kodzie
            console.warn('Użytkownik ma aktywne inne uprawnienia:', activeEntitlements);
            // Dla bezpieczeństwa: jeśli jest jakiekolwiek aktywne uprawnienie, uznajmy go za Premium
            active = true;
            daysLeft = 999;
          }
        }
      }

      // 2. Jeśli nie jest aktywny w RC, sprawdź w Supabase (Stripe/Manual)
      if (!active) {
        const { data, error } = await (supabase as any)
          .from("premium_access")
          .select("expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data?.expires_at) {
          const expiryDate = new Date(data.expires_at);
          const now = new Date();
          daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000));
          
          if (daysLeft > 0) {
            active = true;
            expiresAt = data.expires_at;
          }
        }
      }

      setState({
        active,
        daysLeft,
        expiresAt,
        loading: false,
      });
    } catch (err) {
      console.error("Error fetching premium status:", err);
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
