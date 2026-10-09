import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import playBadge from "@/assets/brand/google-play-badge.png";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import WebFilterBar, { type PremiumFilter } from "@/web/components/WebFilterBar";
import TipTile from "@/web/components/TipTile";
import CouponTicket from "@/web/components/CouponTicket";
import AccaPanel from "@/web/components/AccaPanel";
import HeroPickCard from "@/web/components/HeroPickCard";
import AuthDialog, { type AuthMode } from "@/web/components/AuthDialog";
import PremiumCheckout from "@/web/components/PremiumCheckout";
import { useTipsDay } from "@/web/hooks/useTipsDay";
import { useAcca } from "@/web/hooks/useAcca";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, type Coupon } from "@/lib/couponStorage";
import { warsawDayKey } from "@/web/lib/days";
import type { Tip } from "@/components/TipCard";
import {
  Target, Ticket, Crown, Sparkles, Trophy, Clock,
} from "@/components/icons/gsb";

const TIP_SORTS = [
  { value: "kickoff", label: "Kickoff (soonest)" },
  { value: "odds_desc", label: "Odds: high → low" },
  { value: "odds_asc", label: "Odds: low → high" },
];

const FALLBACK_SPORTS = ["Football", "Tennis", "Basketball", "Hockey", "Handball"];

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.surebet.guru";

const navItems = [
  { label: "Tips", nav: "tips" as const },
  { label: "Coupons", nav: "coupons" as const },
  { label: "Pricing", nav: "pricing" as const },
];

const Landing = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tipsLoading, setTipsLoading] = useState(true);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [boardTab, setBoardTab] = useState<"tips" | "coupons">("tips");
  const [tipSport, setTipSport] = useState("All");
  const [tipPremium, setTipPremium] = useState<PremiumFilter>("all");
  const [tipSort, setTipSort] = useState("kickoff");

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadTips().catch(() => [] as Tip[]),
      loadCoupons().catch(() => [] as Coupon[]),
    ])
      .then(([loadedTips, allCoupons]) => {
        if (!alive) return;
        setTips(loadedTips);

        // Same visibility rule as the app: active/pending slips always show,
        // settled ones only for 12h after the result.
        const COUPON_WINDOW_MS = 12 * 60 * 60 * 1000;
        setCoupons(
          allCoupons.filter((c) => {
            if (c.status === "active" || c.status === "pending") return true;
            const ts = c.wonAt ? new Date(c.wonAt).getTime() : new Date(c.createdAt).getTime();
            return Date.now() - ts < COUPON_WINDOW_MS;
          }),
        );
      })
      .finally(() => {
        if (alive) {
          setTipsLoading(false);
          setCouponsLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const tipSports = useMemo(
    () => Array.from(new Set(tips.map((t) => t.sport).filter(Boolean) as string[])).sort(),
    [tips],
  );

  const filteredTips = useMemo(() => {
    // Only today's and upcoming matches — yesterday's (and older) results are removed.
    const todayKey = warsawDayKey(Date.now());
    const arr = tips.filter((tip) => {
      const ms = new Date(tip.kickoff).getTime();
      if (!isNaN(ms) && warsawDayKey(ms) < todayKey) return false;
      if (tipSport !== "All" && tip.sport !== tipSport) return false;
      if (tipPremium === "premium" && !tip.isPremium) return false;
      if (tipPremium === "free" && tip.isPremium) return false;
      return true;
    });
    if (tipSort === "odds_desc") arr.sort((a, b) => b.odds - a.odds);
    else if (tipSort === "odds_asc") arr.sort((a, b) => a.odds - b.odds);
    else arr.sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || ""));
    return arr;
  }, [tips, tipSport, tipPremium, tipSort]);

  const { dayTips, activeDay, allDays } = useTipsDay(filteredTips);
  const acca = useAcca(tips);

  const { user, signOut } = useAuth();
  const { active: isPremium, daysLeft, loading: premiumLoading } = usePremiumStatus();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const openAuth = (mode: AuthMode = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  // HashRouter uses "#/..." — plain "#section" anchors would break routing,
  // so navigation scrolls via JS instead.
  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollTo = (id: string) => (e: MouseEvent) => {
    e.preventDefault();
    jumpTo(id);
  };

  /** Top nav: Tips/Coupons switch the board tab, Pricing jumps to checkout. */
  const handleNav = (nav: "tips" | "coupons" | "pricing") => (e: MouseEvent) => {
    e.preventDefault();
    if (nav === "pricing") {
      jumpTo("pricing");
      return;
    }
    setBoardTab(nav);
    jumpTo("tips");
  };

  // Stripe returns to "#/premium?success=true&session_id=..." — verify the
  // payment here, then clean the URL so a refresh doesn't re-verify.
  const verifyRan = useRef(false);
  useEffect(() => {
    if (verifyRan.current) return;
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    if (success !== "true" || !sessionId) return;
    verifyRan.current = true;

    (async () => {
      let verified = false;
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        verified = true;
      } catch (e: any) {
        toast({
          title: "Could not verify payment",
          description: e?.message || "Please contact support.",
          variant: "destructive",
        });
      } finally {
        window.history.replaceState(null, "", `${window.location.pathname}#/`);
        if (verified) {
          // Premium was just granted — reload so every status check on the page
          // (nav badge, cart, unlocked picks) picks it up from fresh state.
          try { sessionStorage.setItem("gsb_payment_ok", "1"); } catch { /* ignore */ }
          window.location.reload();
        }
      }
    })();
  }, [searchParams, toast]);

  // Payment-success toast, shown after the reload above.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("gsb_payment_ok") === "1") {
        sessionStorage.removeItem("gsb_payment_ok");
        toast({
          title: "Payment successful! 🎉",
          description: "Premium is active — every prediction and analysis is now unlocked.",
        });
      }
    } catch {
      /* storage unavailable — skip the toast */
    }
  }, [toast]);

  // Password-recovery emails land on "#/auth?mode=update-password".
  const authUrlRan = useRef(false);
  useEffect(() => {
    if (authUrlRan.current) return;
    if (searchParams.get("mode") === "update-password") {
      authUrlRan.current = true;
      setAuthMode("update");
      setAuthOpen(true);
    }
  }, [searchParams]);

  const visibleTiles = dayTips;

  // Structured data (JSON-LD) for Google: site, organization, the Android app
  // and today's matches as SportsEvents. Built at runtime so the URLs always
  // match the live domain (works on any domain without a rebuild).
  const jsonLd = useMemo(() => {
    const origin = window.location.origin;
    const events = filteredTips
      .map((tip) => {
        const iso = new Date(String(tip.kickoff).replace(" ", "T"));
        if (isNaN(iso.getTime())) return null;
        return {
          "@type": "SportsEvent",
          name: `${tip.homeTeam} vs ${tip.awayTeam}`,
          startDate: iso.toISOString(),
          eventStatus: "https://schema.org/EventScheduled",
          sport: tip.sport || "Soccer",
          performer: [
            { "@type": "SportsTeam", name: tip.homeTeam },
            { "@type": "SportsTeam", name: tip.awayTeam },
          ],
          url: `${origin}/`,
        };
      })
      .filter(Boolean)
      .slice(0, 15);

    return JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: "Great Sport Bets",
          url: `${origin}/`,
          inLanguage: "en",
        },
        {
          "@type": "Organization",
          name: "Great Sport Bets",
          url: `${origin}/`,
          logo: `${origin}/logo.png`,
          sameAs: [PLAY_STORE_URL],
        },
        {
          "@type": "SoftwareApplication",
          name: "Great Sport Bets",
          applicationCategory: "SportsApplication",
          operatingSystem: "Android",
          url: PLAY_STORE_URL,
          offer: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
        ...events,
      ],
    });
  }, [filteredTips]);

  const headingDate = allDays
    ? "ALL DAYS"
    : activeDay
      ? activeDay.key === "tbd"
        ? "TBD"
        : `${activeDay.key.slice(8, 10)}-${activeDay.key.slice(5, 7)}-${activeDay.key.slice(0, 4)}`
      : "…";

  return (
    <div className="relative min-h-screen overflow-clip bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", opacity: 0.18, filter: "blur(70px)" }} />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full" style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)", opacity: 0.16, filter: "blur(70px)" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] landing-grid" />

      {/* Sticky nav (tipsbetting-style top bar) */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0a0015]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 h-16 md:h-20 flex items-center justify-between gap-4">
          <Link to="/"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-white/55">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.nav === "pricing" ? "#pricing" : "#tips"}
                onClick={handleNav(item.nav)}
                className="hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden md:block max-w-[9rem] truncate text-xs text-white/50">{user.email}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-sm font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="inline-flex h-10 items-center rounded-full border border-white/10 px-4 text-sm font-semibold text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                Sign In
              </button>
            )}
            {isPremium && !premiumLoading ? (
              <button
                type="button"
                onClick={() => jumpTo("pricing")}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-pink-500/40 bg-pink-500/15 px-3.5 text-xs font-black uppercase tracking-wider text-pink-300 transition-colors hover:bg-pink-500/25 hover:scale-105"
                title="Your Premium is active"
              >
                <Crown className="w-3.5 h-3.5" />
                Premium · {daysLeft}d
              </button>
            ) : (
              <a
                href="#pricing"
                onClick={scrollTo("pricing")}
                className="inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 60%, #06b6d4 130%)" }}
              >
                <Crown className="w-4 h-4 brightness-0 invert" />
                Go Premium
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pt-12 pb-16 md:pt-16 md:pb-20">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-pink-500/25 bg-pink-500/10 text-pink-300 text-[11px] font-display font-bold uppercase tracking-[0.15em]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Betting tips · Updated daily
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.95]"
            >
              Bet <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">smarter</span>,<br />
              not harder.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 text-base md:text-lg text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Betting tips, football predictions and high-value accumulators — researched by our
              team, delivered before kickoff, tracked to the final whistle.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <a
                href="#tips"
                onClick={scrollTo("tips")}
                className="inline-flex h-12 items-center gap-2 px-7 rounded-full font-bold text-white shadow-xl shadow-pink-500/25 transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
              >
                <Target size={18} />
                See today's tips
              </a>
            </motion.div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-white/40">
              <div className="flex items-center gap-2 text-xs"><Trophy className="w-4 h-4" /> 5 sports &amp; esports</div>
              <div className="flex items-center gap-2 text-xs"><Clock className="w-4 h-4" /> New picks daily</div>
            </div>
          </div>

          {/* Hero pick — real featured pick from the database */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-pink-500/20 to-cyan-500/10 blur-2xl" />
            <HeroPickCard />
          </motion.div>
        </div>
      </section>

      <section id="tips" className="relative z-10 border-t border-white/[0.05] bg-white/[0.01] scroll-mt-24">
        <div className="mx-auto max-w-7xl px-5 py-16 md:py-20 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-display font-bold uppercase tracking-[0.2em] text-cyan-300">
                <Ticket className="w-3.5 h-3.5" /> Tips board
              </span>
              <h2 className="mt-3 text-3xl md:text-4xl font-black uppercase tracking-tight">
                Betting tips <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">& predictions</span>
              </h2>
              <p className="mt-3 max-w-2xl text-white/55">
                Switch between daily picks and our analysts' accumulators — add tips to the slip
                and watch best odds, stake and winnings calculate live.
              </p>
            </div>
          </div>

          {/* Tips / Coupons tabs */}
          <Tabs value={boardTab} onValueChange={setBoardTab} className="space-y-6">
            <TabsList className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.04] p-1.5 shadow-lg shadow-black/10 sm:w-auto">
              <TabsTrigger
                value="tips"
                className="flex-1 gap-2 rounded-xl py-3 font-display text-xs uppercase tracking-wider transition-all text-white/60 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/20 sm:flex-none"
              >
                <Target size={16} className={boardTab === "tips" ? "brightness-0 invert" : ""} />
                Single Tips
              </TabsTrigger>
              <TabsTrigger
                value="coupons"
                className="flex-1 gap-2 rounded-xl py-3 font-display text-xs uppercase tracking-wider transition-all text-white/60 hover:text-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/20 sm:flex-none"
              >
                <Ticket size={16} className={boardTab === "coupons" ? "brightness-0 invert" : ""} />
                Coupons
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tips" className="space-y-6">
          {/* Sport / type / sort bar */}
          <WebFilterBar
            sports={tipSports.length > 0 ? tipSports : undefined}
            activeSport={tipSport}
            onSportChange={setTipSport}
            activePremium={tipPremium}
            onPremiumChange={setTipPremium}
            totalItems={tips.length}
            filteredItems={filteredTips.length}
            sortOptions={TIP_SORTS}
            sortBy={tipSort}
            onSortChange={setTipSort}
          />

          {/* "Today's Tips <date>" heading */}
          <div className="flex items-center gap-3 md:gap-4 pt-2">
            <div className="w-1.5 h-8 md:h-9 bg-gradient-to-b from-pink-500 to-pink-600 rounded-full shrink-0" />
            <h3 className="font-display text-xl md:text-3xl font-black uppercase tracking-tight text-white">
              Today's Tips <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">{headingDate}</span>
            </h3>
            <span className="text-xs text-white/55 font-display font-medium bg-white/[0.05] border border-white/[0.07] px-3 py-1 rounded-full whitespace-nowrap">
              {dayTips.length} {dayTips.length === 1 ? "pick" : "picks"}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-white/[0.12] to-transparent" />
          </div>

          {/* Tip grid */}
          {tipsLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] h-64 animate-pulse" />
              ))}
            </div>
          ) : visibleTiles.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] mx-auto flex items-center justify-center">
                <Ticket className="w-6 h-6 text-white/25" />
              </div>
              <p className="text-white/70 font-display font-bold">No tips for this selection</p>
              <p className="text-white/45 text-sm">Fresh picks are published daily — try another sport.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleTiles.map((tip) => (
                <TipTile
                  key={tip.id}
                  tip={tip}
                  locked={tip.isPremium && !isPremium && tip.status === "upcoming"}
                  selected={acca.isSelected(tip.id)}
                  onToggle={() => acca.toggle(tip)}
                  onUnlock={() => jumpTo("pricing")}
                />
              ))}
            </div>
          )}

          {/* Accumulator — best odds / stake / winnings */}
          <AccaPanel acca={acca} />
            </TabsContent>

            <TabsContent value="coupons" className="space-y-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-cyan-500 to-cyan-600" />
                  <h3 className="font-display text-xl md:text-3xl font-black uppercase tracking-tight">Coupons</h3>
                  {!couponsLoading && coupons.length > 0 && (
                    <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/60">
                      {coupons.length} {coupons.length === 1 ? "slip" : "slips"}
                    </span>
                  )}
                </div>
                <p className="max-w-2xl text-sm text-white/50">
                  Real parlays built by our analysts — every leg, its odds and the result on a single
                  slip, exactly like the one in the app.
                </p>
              </div>

              {couponsLoading ? (
                <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-72 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" />
                  ))}
                </div>
              ) : coupons.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                    <Ticket className="h-6 w-6 text-white/25" />
                  </div>
                  <p className="font-display font-bold text-white/70">No coupons right now</p>
                  <p className="text-sm text-white/45">Accumulators are posted daily — check back soon.</p>
                </div>
              ) : (
                <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
                  {coupons.map((coupon) => (
                    <CouponTicket
                      key={coupon.id}
                      coupon={coupon}
                      locked={
                        !!coupon.isPremium &&
                        !isPremium &&
                        coupon.status !== "won" &&
                        coupon.status !== "lost" &&
                        coupon.status !== "void"
                      }
                      onUnlock={() => jumpTo("pricing")}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
      {/* Google Play strip — link to the Android app (below the tips) */}
      <section className="relative z-10 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="mx-auto max-w-7xl px-5 py-8">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-4 sm:text-left">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Get Great Sport Bets on Google Play"
                className="group inline-flex shrink-0 transition-transform duration-300 hover:scale-105"
              >
                <img src={playBadge} alt="Get it on Google Play" className="h-16 w-auto" loading="lazy" />
              </a>
              <div>
                <p className="font-display text-sm font-bold text-white">
                  Take the tips with you
                </p>
                <p className="text-[13px] text-white/50">
                  Great Sport Bets for Android — same picks, push alerts before kickoff.
                </p>
              </div>
            </div>
            <a
              href="#tips"
              onClick={scrollTo("tips")}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 text-sm font-bold text-white/85 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Browse tips
            </a>
          </div>
        </div>
      </section>

      {/* Premium checkout — cart lives on this page */}
      <PremiumCheckout onNeedAuth={() => openAuth("login")} />

      {/* CTA */}
      <section className="relative z-10 border-t border-white/[0.05]">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-24 text-center">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight">
              Ready for <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">better picks</span>?
            </h2>
            <p className="mt-4 text-white/55 max-w-xl mx-auto">Matches, kickoff times and odds are open to everyone — Premium unlocks every prediction and analysis.</p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#pricing"
                onClick={scrollTo("pricing")}
                className="inline-flex h-12 items-center gap-2 rounded-full px-8 font-bold text-white shadow-xl shadow-pink-500/25 transition-transform hover:scale-105"
                style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
              >
                <Crown size={18} /> Go Premium
              </a>
              {!user && (
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-8 font-bold text-white/85 transition-colors hover:bg-white/[0.08]"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
      </section>

      {/* Footer — tipsbetting-style columns */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 py-14 grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/"><Logo /></Link>
            <p className="text-sm text-white/45 leading-relaxed max-w-xs">
              Betting tips, predictions and accumulators across football, tennis, basketball,
              hockey and handball.
            </p>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-400/50 text-[11px] font-black text-red-400">
              18+
            </span>
          </div>

          <div>
            <h4 className="text-[11px] font-display font-black uppercase tracking-[0.2em] text-white/70 mb-4">Betting Tips</h4>
            <ul className="space-y-2.5">
              {(tipSports.length > 0 ? tipSports : FALLBACK_SPORTS).map((sport) => (
                <li key={sport}>
                  <a
                    href="#tips"
                    onClick={scrollTo("tips")}
                    className="text-sm text-white/45 hover:text-pink-300 transition-colors"
                  >
                    {sport} Tips
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-display font-black uppercase tracking-[0.2em] text-white/70 mb-4">Premium</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#pricing" onClick={scrollTo("pricing")} className="text-sm text-white/45 hover:text-pink-300 transition-colors">
                  Buy Premium
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openAuth("login")}
                  className="text-sm text-white/45 hover:text-pink-300 transition-colors"
                >
                  {user ? "My account" : "Sign In"}
                </button>
              </li>
              <li><a href="#pricing" onClick={scrollTo("pricing")} className="text-sm text-white/45 hover:text-pink-300 transition-colors">Pricing</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-display font-black uppercase tracking-[0.2em] text-white/70 mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><Link to="/privacy" className="text-sm text-white/45 hover:text-pink-300 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-white/45 hover:text-pink-300 transition-colors">Terms of Service</Link></li>
              <li><Link to="/deletion" className="text-sm text-white/45 hover:text-pink-300 transition-colors">Delete Account</Link></li>
              <li><a href="mailto:greatsportbets@gmail.com" className="text-sm text-white/45 hover:text-pink-300 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/[0.05]">
          <div className="mx-auto max-w-7xl px-5 py-5 flex flex-col md:flex-row items-center justify-center md:justify-between gap-4 text-center md:text-left">
            <p className="text-xs text-white/30">© 2026 Great Sport Bets. All rights reserved.</p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <p className="text-[11px] text-white/35">
                Please gamble responsibly — never stake more than you can afford to lose.
              </p>
              <a
                href="https://www.begambleaware.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-white/45 hover:text-white/70 underline underline-offset-4 transition-colors"
              >
                BeGambleAware
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Inline login panel — never navigates away from this page */}
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
    </div>
  );
};

export default Landing;
