import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import CouponCard from "@/components/CouponCard";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Receipt, RefreshCw } from "@/components/icons/gsb";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

type Filter = "all" | "free" | "premium";

const Coupons = () => {
  const { t } = useTranslation();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const { active: isPremium } = usePremiumStatus();

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadCoupons();
      setCoupons(loaded);
    } catch (e) {
      console.error("Coupons load failed:", e);
      setError("coupons.loadError");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const filtered = useMemo(
    () =>
      coupons.filter((c) => {
        if (filter === "premium") return c.isPremium;
        if (filter === "free") return !c.isPremium;
        return true;
      }),
    [coupons, filter],
  );

  const chip = (active: boolean) =>
    `h-9 px-3 rounded-full border text-[12px] font-semibold transition-colors ${
      active ? "border-transparent bg-pink-500 text-white" : "border-white/[0.1] text-white/65 active:bg-white/[0.06]"
    }`;

  const countText = loading && coupons.length === 0
    ? "—"
    : t("coupons.count", { count: filtered.length });

  return (
    <div className="app-shell pb-24 md:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-3xl lg:max-w-6xl px-4 pt-4 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-[26px] font-extrabold tracking-tight">{t("coupons.title")}</h1>
            <p className="text-[11px] text-white/45 mt-0.5">{t("coupons.subtitle")}</p>
          </div>
          <span className="text-[11px] text-white/50 font-medium tabular-nums">{countText}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setFilter("all")} className={chip(filter === "all")}>{t("coupons.all")}</button>
          <button onClick={() => setFilter("free")} className={chip(filter === "free")}>{t("coupons.free")}</button>
          <button onClick={() => setFilter("premium")} className={chip(filter === "premium")}>{t("coupons.premium")}</button>
        </div>

        {loading && coupons.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-card p-3 space-y-2 animate-pulse">
                <div className="h-4 w-32 rounded bg-white/[0.06]" />
                <div className="h-10 rounded bg-white/[0.05]" />
                <div className="h-11 rounded bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : error && coupons.length === 0 ? (
          <div className="surface-card p-6 text-center space-y-3">
            <p className="text-sm text-white/70">{t(error)}</p>
            <button
              onClick={fetchCoupons}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-white/[0.12] text-sm font-semibold text-white/80 active:bg-white/[0.06]"
            >
              <RefreshCw className="w-4 h-4" />
              {t("coupons.retry")}
            </button>
          </div>
        ) : coupons.length === 0 ? (
          <div className="surface-card p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6 text-white/25" />
            </div>
            <p className="font-display font-semibold text-white/75">{t("coupons.emptyTitle")}</p>
            <p className="text-[12px] text-white/45">{t("coupons.emptyText")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card p-8 text-center space-y-3">
            <p className="font-display font-semibold text-white/75">{t("coupons.noMatchTitle")}</p>
            <button
              onClick={() => setFilter("all")}
              className="h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-semibold text-white/80 active:bg-white/[0.1]"
            >
              {t("coupons.showAll")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} userIsPremium={isPremium} />
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Coupons;
