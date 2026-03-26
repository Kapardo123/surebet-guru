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

  const refresh = useCallback(async (providedInfo?: any, manualDuration?: number) => {
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
        // Używamy dostarczonego info lub pobieramy nowe
        const info = providedInfo || await getCustomerInfo();
        console.log('Analizowanie statusu RevenueCat...', info ? 'Info obecne' : 'Info brak');
        
        if (info && info.entitlements && info.entitlements.active) {
          const activeEntitlements = Object.keys(info.entitlements.active);
          console.log('Wykryte uprawnienia RC:', activeEntitlements);

          // Szukamy jakiegokolwiek aktywnego uprawnienia (lub konkretnego "Great Sport Bets Pro")
          const entitlement = info.entitlements.active["Great Sport Bets Pro"] || 
                             info.entitlements.active[activeEntitlements[0]];
          
          if (entitlement) {
            active = true;
            expiresAt = entitlement.expirationDate;

            // Jeśli RevenueCat nie zwraca daty wygaśnięcia (bo produkt jest jednorazowy/In-app),
            // a mamy podany czas trwania (7, 15, 30), to wyliczamy ją sami.
            if (!expiresAt && manualDuration) {
              console.log(`Wyliczanie daty wygaśnięcia ręcznie dla ${manualDuration} dni`);
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + manualDuration);
              expiresAt = expiryDate.toISOString();
            }

            if (expiresAt) {
              const expiryDate = new Date(expiresAt);
              daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));
            } else {
              // Jeśli nadal brak daty (lifetime), dajemy Lifetime
              daysLeft = 999;
            }

            // SYNCHRONIZACJA Z BAZĄ
            try {
              await supabase
                .from("premium_access")
                .upsert({
                  user_id: user.id,
                  expires_at: expiresAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString(),
                  updated_at: new Date().toISOString(),
                });
              console.log('Baza danych zsynchronizowana pomyślnie');
            } catch (e) {
              console.warn('Cichy błąd synchronizacji bazy (prawdopodobnie RLS):', e);
            }
          }
        }
      }

      // 2. Fallback do Supabase (jeśli RC nie dało wyniku lub jesteśmy na Web)
      if (!active) {
        console.log('Sprawdzanie statusu w bazie Supabase...');
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

      console.log('Finalny status Premium:', { active, daysLeft });
      setState({
        active,
        daysLeft,
        expiresAt,
        loading: false,
      });
    } catch (err) {
      console.error("Błąd krytyczny usePremiumStatus:", err);
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
