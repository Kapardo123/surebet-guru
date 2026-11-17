import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import Logo from "@/components/Logo";
import SectionHead from "@/components/SectionHead";
import { headerLink } from "@/components/AppHeader";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { Tip } from "@/components/TipCard";
import { LogIn, LogOut } from "lucide-react";
import PremiumBadge from "@/components/PremiumBadge";
import FilterBar, { PremiumFilter } from "@/components/FilterBar";
import Ticker from "@/components/Ticker";
import FormGuide from "@/components/FormGuide";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const now = new Date();
const dateLine = now
  .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const editionNo = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

const SkeletonRow = () => (
  <div className="py-4 grid grid-cols-[30px_1fr_auto] gap-x-3 animate-pulse">
    <span className="h-4 w-5 bg-secondary" />
    <div className="space-y-2">
      <div className="h-3 w-32 bg-secondary" />
      <div className="h-5 w-40 bg-secondary" />
      <div className="h-5 w-36 bg-secondary" />
    </div>
    <span className="h-8 w-12 bg-secondary" />
  </div>
);

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="py-12 text-center md:col-span-2">
    <p className="font-display font-black uppercase text-[28px] leading-none">{title}</p>
    <p className="font-serif italic text-[16px] text-muted-foreground mt-2">{body}</p>
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
      className={`relative flex items-start gap-1 pb-2 font-display font-black uppercase text-[34px] leading-[0.9] transition-colors ${
        activeTab === value ? "text-foreground" : "text-foreground/25 hover:text-foreground/50"
      }`}
    >
      {label}
      <span className="font-mono text-[11px] font-medium tracking-normal mt-0.5">{count}</span>
      {activeTab === value && <span className="absolute left-0 right-0 -bottom-[3px] h-[3px] bg-red" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 pt-[env(safe-area-inset-top)]">
        {/* Ear: date + account */}
        <div className="h-11 flex items-center justify-between gap-3">
          <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground truncate">{dateLine}</span>
          <div className="flex items-center gap-1 shrink-0">
            <PremiumBadge active={isPremium} daysLeft={premiumDaysLeft} loading={premiumLoading} />
            {!isPremium && !premiumLoading && (
              <Link to="/premium" className="inline-flex items-center h-7 px-2 bg-red text-background font-mono text-[12px] font-semibold uppercase tracking-[0.1em]">
                Subscribe
              </Link>
            )}
            <span className="hidden md:inline-flex">
              {user ? (
                <button onClick={signOut} className={headerLink}>
                  <LogOut className="w-3.5 h-3.5" />
                  {user.email?.split("@")[0]}
                </button>
              ) : (
                <Link to="/auth" className={headerLink}>
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </Link>
              )}
            </span>
          </div>
        </div>

        {/* Masthead */}
        <header className="border-t-[3px] border-foreground pt-3 pb-2.5 text-center">
          <Logo size="lg" />
        </header>
        <div className="border-y border-foreground py-1.5 flex items-center justify-between font-mono text-[12px] uppercase tracking-[0.1em]">
          <span>No. {editionNo}</span>
          <span className="hidden min-[360px]:inline font-semibold">The daily form guide</span>
          <span>{loading ? "—" : `${upcomingCount} open`}</span>
        </div>
        <div className="mt-[2px] border-t-[3px] border-foreground" />
        {!loading && (
          <div className="mt-3 -mx-4 md:mx-0">
            <Ticker tips={tips} userIsPremium={isPremium} />
          </div>
        )}
        {!loading && <FormGuide tips={tips} />}
      </div>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-10">
        <TodayHotTip />

        <section>
          <div role="tablist" className="flex items-end gap-5 border-b-[3px] border-foreground">
            {tabBtn("tips", "Tips", filteredTips.length)}
            {tabBtn("coupons", "Coupons", filteredCoupons.length)}
          </div>

          {activeTab === "tips" ? (
            <>
              {tips.length > 0 && (
                <div className="py-3 border-b border-foreground/80">
                  <FilterBar
                    sports={tipSports}
                    activeSport={tipSport}
                    onSportChange={setTipSport}
                    activePremium={tipPremium}
                    onPremiumChange={setTipPremium}
                  />
                </div>
              )}
              <div className="md:grid md:grid-cols-2 md:gap-x-10 divide-y divide-foreground/25 md:divide-y-0 md:[&>*]:border-b md:[&>*]:border-foreground/25">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                  : filteredTips.length === 0
                  ? <EmptyState title="Nothing on the card" body="New selections usually go up by midday." />
                  : filteredTips.map((tip) => <TipCard key={tip.id} tip={tip} userIsPremium={isPremium} />)}
              </div>
            </>
          ) : (
            <>
              {coupons.length > 0 && (
                <div className="py-3 border-b border-foreground/80">
                  <FilterBar activePremium={couponPremium} onPremiumChange={setCouponPremium} />
                </div>
              )}
              <div className="pt-5 grid gap-6 md:grid-cols-2 items-start">
                {loading
                  ? <SkeletonRow />
                  : filteredCoupons.length === 0
                  ? <EmptyState title="No slips today" body="Accumulators go up before the evening fixtures." />
                  : filteredCoupons.map((c) => <CouponCard key={c.id} coupon={c} userIsPremium={isPremium} />)}
              </div>
            </>
          )}
        </section>

        <section className="border-t-[3px] border-foreground pt-3">
          <SectionHead>Small print</SectionHead>
          <p className="mt-2 font-serif text-[14.5px] leading-relaxed text-secondary-foreground">
            Our tips are opinions, not guarantees. Odds move, form dips, referees happen. Bet only what you can afford to lose. 18+.
          </p>
        </section>
      </main>

      <footer className="max-w-5xl mx-auto px-4 pt-8 pb-10 md:pb-12">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/deletion" className="hover:text-foreground">Delete account</Link>
          <a href="mailto:greatsportbets@gmail.com" className="hover:text-foreground">Contact</a>
        </nav>
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground/70 select-none cursor-pointer w-fit" onClick={handleFooterTap}>
          © 2026 Great Sport Bets · Printed daily
        </p>
      </footer>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Admin login dialog - opened by 3 taps on the footer copyright */}
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </div>
  );
};

export default Index;
