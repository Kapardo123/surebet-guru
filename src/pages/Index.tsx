import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import AppHeader from "@/components/AppHeader";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { Tip } from "@/components/TipCard";
import { LogIn, LogOut } from "lucide-react";
import PremiumBadge from "@/components/PremiumBadge";
import FilterBar, { PremiumFilter } from "@/components/FilterBar";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const todayLabel = () =>
  new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

const SkeletonCard = () => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
    <div className="h-3 w-32 rounded bg-secondary" />
    <div className="h-4 w-40 rounded bg-secondary" />
    <div className="h-4 w-36 rounded bg-secondary" />
    <div className="h-12 rounded-lg bg-secondary" />
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center md:col-span-2">
    <p className="text-[15px] font-semibold text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground mt-1">{body}</p>
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
  const { user, signOut } = useAuth();

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

  const upcomingCount = tips.filter((t) => t.status === "upcoming").length;

  const tabBtn = (value: string, label: string, count: number) => (
    <button
      role="tab"
      aria-selected={activeTab === value}
      onClick={() => setActiveTab(value)}
      className={`relative pb-3 font-display font-semibold uppercase text-[22px] leading-none tracking-[0.01em] transition-colors ${
        activeTab === value ? "text-foreground" : "text-muted-foreground hover:text-secondary-foreground"
      }`}
    >
      {label}
      <span className="num ml-1.5 text-[15px] align-top text-muted-foreground">{count}</span>
      {activeTab === value && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <AppHeader
        right={
          <>
            <PremiumBadge active={isPremium} daysLeft={premiumDaysLeft} loading={premiumLoading} />
            {!isPremium && !premiumLoading && (
              <Link
                to="/premium"
                className="inline-flex items-center h-8 px-3 rounded-full bg-gold text-accent-foreground text-xs font-semibold"
              >
                Go Premium
              </Link>
            )}
            <span className="hidden md:inline-flex">
              {user ? (
                <button onClick={signOut} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-secondary-foreground hover:text-foreground hover:bg-secondary">
                  <LogOut className="w-4 h-4" />
                  {user.email?.split("@")[0]}
                </button>
              ) : (
                <Link to="/auth" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-secondary-foreground hover:text-foreground hover:bg-secondary">
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Link>
              )}
            </span>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 pt-5 md:pt-8 space-y-8">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-secondary-foreground">{todayLabel()}</p>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {upcomingCount} open {upcomingCount === 1 ? "pick" : "picks"}
            </p>
          )}
        </div>

        <TodayHotTip />

        <section className="space-y-4">
          <div role="tablist" className="flex items-end gap-6 border-b border-border">
            {tabBtn("tips", "Tips", filteredTips.length)}
            {tabBtn("coupons", "Coupons", filteredCoupons.length)}
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
              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : filteredTips.length === 0
                  ? <EmptyState title="No tips right now" body="New picks are usually posted by midday. Check back soon." />
                  : filteredTips.map((tip) => <TipCard key={tip.id} tip={tip} userIsPremium={isPremium} />)}
              </div>
            </>
          ) : (
            <>
              {coupons.length > 0 && (
                <FilterBar activePremium={couponPremium} onPremiumChange={setCouponPremium} />
              )}
              <div className="grid gap-3 md:grid-cols-2 md:gap-4 items-start">
                {loading
                  ? Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)
                  : filteredCoupons.length === 0
                  ? <EmptyState title="No coupons right now" body="Accumulators go up before the evening fixtures." />
                  : filteredCoupons.map((c) => <CouponCard key={c.id} coupon={c} userIsPremium={isPremium} />)}
              </div>
            </>
          )}
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground border-t border-border pt-5">
          Tips are opinions, not guarantees. Bet only what you can afford to lose. 18+.
        </p>
      </main>

      <footer className="max-w-5xl mx-auto px-4 pt-6 pb-10 md:pb-12">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/deletion" className="hover:text-foreground">Delete account</Link>
          <a href="mailto:greatsportbets@gmail.com" className="hover:text-foreground">Contact</a>
        </nav>
        <p className="mt-4 text-xs text-muted-foreground/70 select-none cursor-pointer w-fit" onClick={handleFooterTap}>
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
