import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import { useWatched } from "@/lib/watchStorage";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Bookmark } from "lucide-react";

const Watched = () => {
  const { t } = useTranslation();
  const { tips, coupons } = useWatched();
  const { active: isPremium } = usePremiumStatus();
  const [tab, setTab] = useState<"tips" | "coupons">("tips");

  const currentTips = tips.map((w) => w.tip);
  const currentCoupons = coupons.map((w) => w.coupon);
  const list = tab === "tips" ? currentTips : currentCoupons;
  const empty = list.length === 0;

  const chip = (active: boolean) =>
    `h-9 px-3 rounded-full border text-[12px] font-semibold transition-colors ${
      active ? "border-transparent bg-pink-500 text-white" : "border-white/[0.1] text-white/65 active:bg-white/[0.06]"
    }`;

  return (
    <div className="app-shell pb-24 md:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-3xl lg:max-w-6xl px-4 pt-4 space-y-4">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight">{t("watched.title")}</h1>
          <p className="text-[11px] text-white/45 mt-0.5">{t("watched.subtitle")}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setTab("tips")} className={chip(tab === "tips")}>
            {t("watched.tipsTab", { count: currentTips.length })}
          </button>
          <button onClick={() => setTab("coupons")} className={chip(tab === "coupons")}>
            {t("watched.couponsTab", { count: currentCoupons.length })}
          </button>
        </div>

        {empty ? (
          <div className="surface-card p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] mx-auto flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-white/30" />
            </div>
            <p className="font-display font-semibold text-white/75">{t("watched.emptyTitle")}</p>
            <p className="text-[12px] text-white/45">
              {tab === "tips" ? t("watched.emptyTipText") : t("watched.emptyCouponText")}
            </p>
            <Link
              to={tab === "tips" ? "/" : "/coupons"}
              className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-semibold text-white/80 active:bg-white/[0.1]"
            >
              {tab === "tips" ? t("watched.browseTips") : t("watched.browseCoupons")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tab === "tips"
              ? currentTips.map((tip) => <TipCard key={tip.id} tip={tip} userIsPremium={isPremium} />)
              : currentCoupons.map((coupon) => (
                  <CouponCard key={coupon.id} coupon={coupon} userIsPremium={isPremium} />
                ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Watched;
