import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

// Reconciles premium_access with RevenueCat on the server. Non-renewing store
// products are not kept as active entitlements by RevenueCat, so the database
// must be written from the server — otherwise premium disappears after the
// Premium screen unmounts. Runs at most once per session unless forced.
let syncedFor: string | null = null;
let inFlight: Promise<void> | null = null;

export const syncPremiumFromRevenueCat = (
  userId?: string | null,
  opts?: { force?: boolean },
): Promise<void> => {
  if (Capacitor.getPlatform() === "web" || !userId) return Promise.resolve();
  if (!opts?.force && syncedFor === userId) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      await supabase.functions.invoke("revenuecat-sync", { body: {} });
      syncedFor = userId;
    } catch (e) {
      console.error("revenuecat-sync failed:", e);
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};
