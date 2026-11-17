import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import AppHeader, { headerLink, goldButton } from "@/components/AppHeader";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { Tip } from "@/components/TipCard";
import { LogIn, User as UserIcon } from "lucide-react";
import PremiumBadge from "@/components/PremiumBadge";
import FilterBar, { PremiumFilter } from "@/components/FilterBar";
import FormGuide from "@/components/FormGuide";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const weekday = new Date().toLocaleDateString("en-GB", { weekday: "long" });

const SkeletonCard = () => (
  <div className="rounded-[16px] bg-white/[0.05] h-[300px] animate-pulse" />
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="col-span-full rounded-[20px] border border-dashed border-white/15 px-6 py-12 text-center">
    <div className="mx-auto w-14 h-20 rounded-[10px] card-back border border-white/10 -rotate-6" />
    <p className="font-display font-black uppercase text-[18px] mt-5">{title}</p>
    <p className="text-[15px] text-muted-foreground mt-1.5">{body}</p>
  </div>
);

const Index = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState("tips");
  const [tipSport, setTipSport] = useState("All");
  const [tipPremium, setTipPremium] = useState<PremiumFilter>("all");
  const [couponPremium, setCouponPremium] = useState<PremiumFilter>("all");
  const [loading, setLoading] = useState(true);
  const { active: isPremium, daysLeft: premiumDaysLeft, loading: premiumLoading } = usePremiumStatus();
  const { user } = useAuth();

  // 3 taps on the footer copyright opens the admin login dialog
  const [footerTaps, setFooterTaps] = useState(0);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const footerTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFooterTap = useCallback(() => {
    const next = footerTaps + 1;
    setFooterTaps(next);

    if (footerTapTimer.current) clearTimeout(footerTapTimer.current);
    footerTapTimer.current = setTimeout(() => setFooterTaps(0), 2000);

    if (next >= 3) {
      setFooterTaps(0);
      setAdminLoginOpen(true);
    }
  }, [footerTaps]);

  useEffect(() => {
    const fetchData = async () => {
      const loadedTips = await loadTips();
      const loadedCoupons = await loadCoupons();

      const TIP_EXPIRY_MS = 8 * 60 * 60 * 1000;   // mecze: po 8h od kickoff znikaja
      const COUPON_WINDOW_MS = 12 * 60 * 60 * 1000; // kupony: okno 12h
      const now = Date.now();

      // Bezpiecznik widoku - wlasciwe usuwanie (baza + cache) robi purgeExpiredTips w loadTips().
      const visibleTips = loadedTips.filter(tip => {
        const kickoffTime = new Date(tip.kickoff).getTime();
        if (isNaN(kickoffTime)) return true; // brak daty — nie ukrywamy
        return now - kickoffTime < TIP_EXPIRY_MS;
      }).sort((a, b) => {
        // Open picks first (soonest kickoff on top), settled ones after.
        const sa = a.status === "upcoming" ? 0 : 1;
        const sb = b.status === "upcoming" ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return (a.kickoff || "").localeCompare(b.kickoff || "");
      });

      const visibleCoupons = loadedCoupons.filter(coupon => {
        if (coupon.status === 'active' || coupon.status === 'pending') return true;
        if (coupon.status === 'won' && coupon.wonAt) {
          return (now - new Date(coupon.wonAt).getTime()) < COUPON_WINDOW_MS;
        }
        return false;
      });

      setTips(visibleTips);
      setCoupons(visibleCoupons);
      setLoading(false);
    };

    fetchData();
  }, [isPremium]);

  const tipSports = useMemo(() =>
    Array.from(new Set(tips.map((t) => t.sport).filter(Boolean) as string[])).sort(),
    [tips]
  );

  const filteredTips = useMemo(() =>
    tips.filter((tip) => {
      if (tipSport !== "All" && tip.sport !== tipSport) return false;
      if (tipPremium === "premium" && !tip.isPremium) return false;
      if (tipPremium === "free" && tip.isPremium) return false;
      return true;
    }),
    [tips, tipSport, tipPremium]
  );

  const filteredCoupons = useMemo(() =>
    coupons.filter((coupon) => {
      if (couponPremium === "premium" && !coupon.isPremium) return false;
      if (couponPremium === "free" && coupon.isPremium) return false;
      return true;
    }),
    [coupons, couponPremium]
  );


  const openCount = tips.filter((t) => t.status === "upcoming").length;

  const tabBtn = (value: string, label: string, count: number) => (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
      className={`flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-[14.5px] font-bold transition-colors ${
        activeTab === value ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {label}
      <span className={`min-w-6 h-6 px-1.5 rounded-full grid place-items-center text-[12px] ${activeTab === value ? "bg-background/15" : "bg-white/10"}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <AppHeader
        right={
          <>
            <PremiumBadge active={isPremium} daysLeft={premiumDaysLeft} loading={premiumLoading} />
            {!isPremium && !premiumLoading && (
              <Link to="/premium" className={goldButton}>Go Gold</Link>
            )}
            <span className="hidden md:inline-flex">
              {user ? (
                <Link to="/account" className={headerLink}>
                  <UserIcon className="w-4 h-4" />
                  {user.email?.split("@")[0]}
                </Link>
              ) : (
                <Link to="/auth" className={headerLink}>
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Link>
              )}
            </span>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-8">
        <section className="space-y-4">
          <div>
            <p className="label">{weekday}'s pull</p>
            <h1 className="font-display font-black uppercase text-[30px] leading-[1.02] tracking-[-0.02em] mt-1.5">
              {loading ? "Shuffling…" : <>{openCount} {openCount === 1 ? "card" : "cards"} in play</>}
            </h1>
          </div>
          {!loading && <FormGuide tips={tips} />}
        </section>

        <TodayHotTip />

        <section className="space-y-4">
          <div role="tablist" className="flex p-1 rounded-full bg-white/[0.05] border border-white/[0.07]">
            {tabBtn("tips", "Cards", filteredTips.length)}
            {tabBtn("coupons", "Sets", filteredCoupons.length)}
          </div>

          {activeTab === "tips" ? (
            <>
              {tips.length > 0 && (
                <FilterBar
                  sports={tipSports}
                  activeSport={tipSport}
                  onSportChange={setTipSport}
                  activePremium={tipPremium}
                  onPremiumChange={setTipPremium}
                />
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : filteredTips.length === 0
                  ? <EmptyState title="Deck's empty" body="New cards usually land by midday." />
                  : filteredTips.map((tip, i) => <TipCard key={tip.id} tip={tip} index={i} userIsPremium={isPremium} />)}
              </div>
            </>
          ) : (
            <>
              {coupons.length > 0 && (
                <FilterBar activePremium={couponPremium} onPremiumChange={setCouponPremium} />
              )}
              <div className="grid gap-4 md:grid-cols-2 items-start">
                {loading
                  ? <SkeletonCard />
                  : filteredCoupons.length === 0
                  ? <EmptyState title="No sets yet" body="Accumulators go up before the evening fixtures." />
                  : filteredCoupons.map((c) => <CouponCard key={c.id} coupon={c} userIsPremium={isPremium} />)}
              </div>
            </>
          )}
        </section>

        <p className="text-[13.5px] leading-relaxed text-muted-foreground rounded-[16px] bg-white/[0.04] px-4 py-3.5">
          Cards are opinions, not guarantees. Bet only what you can afford to lose. 18+.
        </p>
      </main>

      <footer className="max-w-5xl mx-auto px-4 pt-6 pb-8">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/deletion" className="hover:text-foreground">Delete account</Link>
          <a href="mailto:greatsportbets@gmail.com" className="hover:text-foreground">Contact</a>
        </nav>
        <p className="mt-3 text-[12.5px] text-muted-foreground/70 select-none cursor-pointer w-fit" onClick={handleFooterTap}>
          © 2026 Great Sport Bets
        </p>
      </footer>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Admin login dialog - opened by 3 taps on the footer copyright */}
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </div>
  );
};

export default Index;
