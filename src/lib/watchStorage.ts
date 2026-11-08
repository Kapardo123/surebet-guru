import { useEffect, useState } from "react";
import type { Tip } from "@/components/TipCard";
import type { Coupon } from "@/lib/couponStorage";

// Persistent "watched" store. No account sync — it is device-local by design
// (localStorage), which is what the app can support without extra backend.
const TIPS_KEY = "gsb_watched_tips_v1";
const COUPONS_KEY = "gsb_watched_coupons_v1";
const EVENT = "gsb-watch-change";

export interface WatchedTip {
  id: number;
  savedAt: number;
  tip: Tip;
}
export interface WatchedCoupon {
  id: number;
  savedAt: number;
  coupon: Coupon;
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota — ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const getWatchedTips = (): WatchedTip[] => read<WatchedTip>(TIPS_KEY);
export const getWatchedCoupons = (): WatchedCoupon[] => read<WatchedCoupon>(COUPONS_KEY);

export const isTipWatched = (id: number): boolean =>
  getWatchedTips().some((w) => w.id === id);
export const isCouponWatched = (id: number): boolean =>
  getWatchedCoupons().some((w) => w.id === id);

/** Returns true when the tip is now watched, false when it was removed. */
export const toggleTipWatch = (tip: Tip): boolean => {
  const list = getWatchedTips();
  if (list.some((w) => w.id === tip.id)) {
    write(TIPS_KEY, list.filter((w) => w.id !== tip.id));
    return false;
  }
  write(TIPS_KEY, [{ id: tip.id, savedAt: Date.now(), tip }, ...list]);
  return true;
};

export const unwatchTip = (id: number) => {
  write(TIPS_KEY, getWatchedTips().filter((w) => w.id !== id));
};

export const toggleCouponWatch = (coupon: Coupon): boolean => {
  const list = getWatchedCoupons();
  if (list.some((w) => w.id === coupon.id)) {
    write(COUPONS_KEY, list.filter((w) => w.id !== coupon.id));
    return false;
  }
  write(COUPONS_KEY, [{ id: coupon.id, savedAt: Date.now(), coupon }, ...list]);
  return true;
};

export const unwatchCoupon = (id: number) => {
  write(COUPONS_KEY, getWatchedCoupons().filter((w) => w.id !== id));
};

export const subscribeWatched = (cb: () => void): (() => void) => {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
};

/** Re-renders the consumer whenever the watched store changes. */
export const useWatched = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsub = subscribeWatched(() => setVersion((v) => v + 1));
    // Keep tabs/windows in sync too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TIPS_KEY || e.key === COUPONS_KEY) setVersion((v) => v + 1);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // version is intentionally read so React re-renders on change.
  void version;

  return {
    tips: getWatchedTips(),
    coupons: getWatchedCoupons(),
    isTipWatched,
    isCouponWatched,
    toggleTipWatch,
    toggleCouponWatch,
    unwatchTip,
    unwatchCoupon,
  };
};
