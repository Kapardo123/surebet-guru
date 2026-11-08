import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TipCard, { Tip } from "@/components/TipCard";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import MatchdayCard from "@/components/MatchdayCard";
import PremiumUpsell from "@/components/PremiumUpsell";
import FilterBar, {
  PremiumFilter,
  StatusFilter,
  SortMode,
  DayFilter,
} from "@/components/FilterBar";
import { loadTips } from "@/lib/tipsStorage";
import { loadFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Crosshair, Sparkles, Loader2, RefreshCw } from "@/components/icons/gsb";
import { Link } from "react-router-dom";

const warsawDay = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));

const Index = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [heroPick, setHeroPick] = useState<FeaturedPick | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroLoading, setHeroLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tipSport, setTipSport] = useState("All");
  const [tipPremium, setTipPremium] = useState<PremiumFilter>("all");
  const [tipStatus, setTipStatus] = useState<StatusFilter>("all");
  const [tipSort, setTipSort] = useState<SortMode>("kickoff");
  const [tipDay, setTipDay] = useState<DayFilter>("all");

  const { active: isPremium } = usePremiumStatus();

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

  const loadData = useCallback(async () => {
    try {
      const [loadedTips, hero] = await Promise.all([loadTips(), loadFeaturedPick()]);
      const today = warsawDay(Date.now());
      const visibleTips = loadedTips
        .filter((tip) => {
          const kickoff = new Date(tip.kickoff).getTime();
          if (isNaN(kickoff)) return true;
          return warsawDay(kickoff) >= today;
        })
        .sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || ""));
      setTips(visibleTips);
      setHeroPick(hero);
      setError(null);
    } catch (e) {
      console.error("Index load failed:", e);
      setError("Couldn't load tips. Pull down to retry.");
    } finally {
      setLoading(false);
      setHeroLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, isPremium]);

  const { pullY, refreshing } = usePullToRefresh(loadData);

  const tipSports = useMemo(
    () => Array.from(new Set(tips.map((t) => t.sport).filter(Boolean) as string[])).sort(),
    [tips],
  );

  const filteredTips = useMemo(() => {
    const today = warsawDay(Date.now());
    const tomorrow = warsawDay(Date.now() + 86400000);

    const list = tips.filter((tip) => {
      if (tipSport !== "All" && tip.sport !== tipSport) return false;
      if (tipPremium === "premium" && !tip.isPremium) return false;
      if (tipPremium === "free" && tip.isPremium) return false;

      if (tipStatus === "upcoming" && tip.status !== "upcoming") return false;
      if (tipStatus === "won" && tip.status !== "won") return false;
      if (tipStatus === "lost" && tip.status !== "lost") return false;

      if (tipDay !== "all") {
        const kickoff = new Date(tip.kickoff).getTime();
        if (isNaN(kickoff)) return false;
        const day = warsawDay(kickoff);
        if (tipDay === "today" && day !== today) return false;
        if (tipDay === "tomorrow" && day !== tomorrow) return false;
      }
      return true;
    });

    return tipSort === "recent"
      ? [...list].sort((a, b) => b.id - a.id)
      : [...list].sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || ""));
  }, [tips, tipSport, tipPremium, tipStatus, tipDay, tipSort]);

  const lockedPremiumCount = useMemo(
    () => tips.filter((t) => t.isPremium && t.status === "upcoming").length,
    [tips],
  );

  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  const clearFilters = () => {
    setTipSport("All");
    setTipPremium("all");
    setTipStatus("all");
    setTipDay("all");
    setTipSort("kickoff");
  };

  return (
    <div className="app-shell pb-24 md:pb-0">
      <AppHeader />

      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: refreshing ? 40 : pullY, transition: pullY && !refreshing ? "none" : "height 0.2s ease" }}
      >
        {(pullY > 0 || refreshing) && (
          <Loader2
            className={`w-5 h-5 text-pink-400 ${refreshing ? "animate-spin" : ""}`}
            style={{ opacity: refreshing ? 1 : Math.min(1, pullY / 60) }}
          />
        )}
      </div>

      <main className="mx-auto max-w-3xl lg:max-w-6xl px-4 pt-3 space-y-5">
        {/* Today header */}
        <section className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 font-semibold">{todayLabel}</p>
            <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-tight mt-0.5">Today</h1>
            <p className="text-[11px] text-white/40 mt-0.5">New picks are added daily</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-display text-xl font-bold tabular-nums leading-none">
              {loading && tips.length === 0 ? "—" : filteredTips.length}
            </p>
            <p className="text-[10px] text-white/45 mt-0.5 uppercase tracking-wide">
              {filteredTips.length === 1 ? "analysis" : "analyses"}
            </p>
          </div>
        </section>

        {/* GSB MATCHDAY */}
        <MatchdayCard pick={heroPick} loading={heroLoading} />

        {/* Filters */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-[15px] font-bold">Tips</h2>
          </div>
          <FilterBar
            sports={tipSports}
            activeSport={tipSport}
            onSportChange={setTipSport}
            activePremium={tipPremium}
            onPremiumChange={setTipPremium}
            status={tipStatus}
            onStatusChange={setTipStatus}
            sort={tipSort}
            onSortChange={setTipSort}
            day={tipDay}
            onDayChange={setTipDay}
            totalItems={tips.length}
            filteredItems={filteredTips.length}
          />
        </section>

        {/* Tips list */}
        {loading && tips.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card p-3 space-y-2 animate-pulse">
                <div className="h-3 w-28 rounded bg-white/[0.06]" />
                <div className="h-8 rounded bg-white/[0.05]" />
                <div className="h-12 rounded bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : error && tips.length === 0 ? (
          <div className="surface-card p-6 text-center space-y-3">
            <p className="text-sm text-white/70">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-white/[0.12] text-sm font-semibold text-white/80 active:bg-white/[0.06]"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : tips.length === 0 ? (
          <div className="surface-card p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.07] mx-auto flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-white/25" />
            </div>
            <p className="font-display font-semibold text-white/75">No tips yet</p>
            <p className="text-[12px] text-white/45">Check back soon — new predictions are published daily.</p>
          </div>
        ) : filteredTips.length === 0 ? (
          <div className="surface-card p-8 text-center space-y-3">
            <p className="font-display font-semibold text-white/75">No tips match your filters</p>
            <p className="text-[12px] text-white/45">Try clearing the filters to see all picks.</p>
            <button
              onClick={clearFilters}
              className="h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.1] text-sm font-semibold text-white/80 active:bg-white/[0.1]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredTips.map((tip) => (
              <TipCard key={tip.id} tip={tip} userIsPremium={isPremium} />
            ))}
          </div>
        )}

        {/* Premium upsell */}
        {!isPremium && (
          <PremiumUpsell lockedCount={lockedPremiumCount} className="mt-2" />
        )}

        {/* Footer */}
        <footer className="pt-4 pb-2 border-t border-white/[0.06] space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/privacy" className="text-[11px] text-white/35 hover:text-white/60">Privacy</Link>
            <Link to="/terms" className="text-[11px] text-white/35 hover:text-white/60">Terms</Link>
            <Link to="/deletion" className="text-[11px] text-white/35 hover:text-white/60">Delete account</Link>
            <a
              href="mailto:greatsportbets@gmail.com"
              className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60"
            >
              <Sparkles className="w-3 h-3" />
              Help
            </a>
          </div>
          <p
            onClick={handleFooterTap}
            className="text-center text-[10px] text-white/25 select-none cursor-pointer"
          >
            © 2026 Great Sport Bets
          </p>
        </footer>
      </main>

      <BottomNav />
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </div>
  );
};

export default Index;
