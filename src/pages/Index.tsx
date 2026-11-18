import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import AppHeader, { headerLink, goldButton } from "@/components/AppHeader";
import StadiumBackdrop from "@/components/StadiumBackdrop";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { Tip } from "@/components/TipCard";
import { LogIn, User as UserIcon } from "lucide-react";
import PremiumBadge from "@/components/PremiumBadge";
import FilterBar, { PremiumFilter } from "@/components/FilterBar";
import FormGuide from "@/components/FormGuide";
import DailyPack from "@/components/DailyPack";
import BinderStrip from "@/components/BinderStrip";
import CardInspector from "@/components/CardInspector";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link, useSearchParams } from "react-router-dom";
import UnlockSheet from "@/components/UnlockSheet";
import { loadTipUnlocks, verifyCheckout, nativeSingleTipPrice } from "@/lib/tipUnlocks";
import { SINGLE_TIP_CENTS, usd } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import { track } from "@/lib/analytics";
import Onboarding, { needsOnboarding } from "@/components/Onboarding";
import { AnimatePresence } from "framer-motion";
import StreakBar from "@/components/StreakBar";
import { play } from "@/lib/sfx";
import {
  StreakState, TimeWindow, collectCard, coveredByPass, loadCredits, loadWeekendPasses, newlySettled, recordDailyOpen,
} from "@/lib/engagement";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const dayKey = new Date().toISOString().slice(0, 10);
const readLS = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeLS = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};

const weekday = new Date().toLocaleDateString("en-GB", { weekday: "long" });

const SkeletonCard = () => (
  <div className="rounded-[16px] p-[5px] bg-[hsl(232_30%_20%)] h-[300px]">
    <div className="h-full rounded-[12px] card-back relative overflow-hidden grid place-items-center">
      <div className="absolute inset-0 back-shimmer" />
      <span className="font-display font-black text-[16px] foil-gold-text opacity-70">GSB</span>
    </div>
  </div>
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
  // Bump to refetch the feed (e.g. after a card is unlocked server-side).
  const [reloadKey, setReloadKey] = useState(0);
  const [onboarding, setOnboarding] = useState(needsOnboarding);
  const [inspect, setInspect] = useState<Tip | null>(null);
  const [seen, setSeen] = useState<number[]>(() => readLS(`gsb_seen_${dayKey}`, []));
  const [packOpen, setPackOpen] = useState<boolean>(() => readLS(`gsb_pack_${dayKey}`, false));

  const [unlocks, setUnlocks] = useState<number[]>([]);
  const unlocksRef = useRef<number[]>([]);
  unlocksRef.current = unlocks;
  const [sheetTip, setSheetTip] = useState<Tip | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [unlockPrice, setUnlockPrice] = useState(usd(SINGLE_TIP_CENTS));
  const [passes, setPasses] = useState<TimeWindow[]>([]);
  const passesRef = useRef<TimeWindow[]>([]);
  passesRef.current = passes;
  const [credits, setCredits] = useState(0);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const userRef = useRef<string | null>(null);
  const owns = useCallback(
    (t: Tip) => unlocks.includes(t.id) || coveredByPass(t, passes),
    [unlocks, passes],
  );

  const openCard = useCallback((tip: Tip, fresh = false) => {
    const owned = unlocksRef.current.includes(tip.id) || coveredByPass(tip, passesRef.current);
    if ((tip.isPremium && !isPremiumRef.current && tip.status === "upcoming" && !owned) || (tip.masked && !owned)) {
      setSheetTip(tip);
      track("unlock_sheet_opened", { tip: tip.id });
      return;
    }
    setCelebrate(fresh);
    setInspect(tip);
    track("card_inspected", { tip: tip.id, gold: !!tip.isPremium });
    if (userRef.current) collectCard(userRef.current, tip.id).catch(() => {});
    setSeen((prev) => {
      if (prev.includes(tip.id)) return prev;
      const next = [...prev, tip.id];
      writeLS(`gsb_seen_${dayKey}`, next);
      return next;
    });
  }, []);
  const closeCard = useCallback(() => {
    setInspect(null);
    setCelebrate(false);
  }, []);
  const openPack = useCallback(() => {
    track("pack_opened");
    setPackOpen(true);
    writeLS(`gsb_pack_${dayKey}`, true);
  }, []);
  const { active: isPremium, daysLeft: premiumDaysLeft, loading: premiumLoading } = usePremiumStatus();
  const { user } = useAuth();
  userRef.current = user?.id ?? null;
  const isPremiumRef = useRef(isPremium);
  isPremiumRef.current = isPremium;
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    nativeSingleTipPrice().then((p) => p && setUnlockPrice(p));
  }, []);

  // Cards this user bought one at a time.
  useEffect(() => {
    if (!user) {
      setUnlocks([]);
      setPasses([]);
      setCredits(0);
      return;
    }
    loadTipUnlocks(user.id).then(setUnlocks);
    loadWeekendPasses(user.id).then(setPasses);
    loadCredits(user.id).then(setCredits);
  }, [user, reloadKey]);

  // Daily streak: counted once the day's pack has been opened.
  const streakFor = useRef<string | null>(null);
  useEffect(() => {
    if (!packOpen) return;
    const key = `${user?.id ?? "anon"}:${dayKey}`;
    if (streakFor.current === key) return;
    streakFor.current = key;
    recordDailyOpen(!!user).then((st) => {
      setStreak(st);
      if (!st.local) setCredits(st.credits);
      if (st.rewarded) {
        track("streak_reward", { streak: st.streak });
        play("coin");
        toast({ title: "Free Gold card earned!", description: `${st.streak} days in a row. Tap any Gold card to use it.` });
      }
    });
  }, [packOpen, user, toast]);

  // Back from Stripe Checkout after buying a single card.
  const pendingUnlock = useRef<number | null>(null);
  useEffect(() => {
    const sessionId = params.get("session_id");
    const tipId = Number(params.get("unlocked"));
    const weekend = params.get("weekend") === "1";
    if (!sessionId || (!tipId && !weekend) || !user) return;
    setParams({}, { replace: true });
    verifyCheckout(sessionId)
      .then(async () => {
        setUnlocks(await loadTipUnlocks(user.id));
        setReloadKey((k) => k + 1);
        if (tipId) pendingUnlock.current = tipId;
        toast(
          weekend
            ? { title: "Weekend pack unlocked", description: "Every Gold card from Friday to Sunday is yours." }
            : { title: "Card unlocked", description: "It's yours. Flip it for the analysis." },
        );
      })
      .catch((e) => toast({ title: "Payment not confirmed yet", description: e.message, variant: "destructive" }));
  }, [params, user, setParams, toast]);

  // Open the freshly bought card once both the tips and the unlock are in.
  useEffect(() => {
    const id = pendingUnlock.current;
    if (!id || tips.length === 0 || !unlocks.includes(id)) return;
    const t = tips.find((x) => x.id === id);
    // Wait for the refetched feed: the old copy still has the pick masked.
    if (!t || t.masked) return;
    pendingUnlock.current = null;
    setPackOpen(true);
    openCard(t, true);
  }, [tips, unlocks, openCard]);

  const handleUnlocked = useCallback(async (tip: Tip) => {
    track("unlock_succeeded", { tip: tip.id });
    setSheetTip(null);
    unlocksRef.current = [...unlocksRef.current, tip.id];
    pendingUnlock.current = tip.id;
    if (user) setUnlocks(await loadTipUnlocks(user.id));
    setReloadKey((k) => k + 1);
    // Feed without server masking (migration not run yet): open straight away.
    if (!tip.masked) {
      pendingUnlock.current = null;
      openCard(tip, true);
    }
  }, [user]);

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
      // Cards that won since the last visit get a toast (their seal animates in).
      const won = newlySettled(visibleTips).filter((t) => t.status === "won");
      if (won.length) {
        toast({
          title: won.length === 1 ? "Your card won!" : `${won.length} cards won!`,
          description: won.map((t) => `${t.homeTeam} v ${t.awayTeam}: ${t.prediction || "Gold pick"}`).join(" · "),
        });
      }
      setCoupons(visibleCoupons);
      setLoading(false);
    };

    fetchData();
  }, [isPremium, user, reloadKey]);

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
      className={`relative flex-1 h-11 rounded-full flex items-center justify-center gap-2 text-[14.5px] font-bold transition-colors ${
        activeTab === value ? "text-background" : "text-foreground/70 hover:text-foreground"
      }`}
    >
      {activeTab === value && (
        <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
      )}
      <span className="relative">{label}</span>
      <span className={`relative min-w-6 h-6 px-1.5 rounded-full grid place-items-center text-[12px] ${activeTab === value ? "bg-background/15" : "bg-white/10"}`}>
        {count}
      </span>
    </button>
  );

  return (
    <div className="relative isolate min-h-screen pb-28 md:pb-10">
      <StadiumBackdrop height={460} />
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
              {loading ? (
                "Shuffling…"
              ) : (
                <>
                  <span className="foil-gold-text">{openCount}</span> {openCount === 1 ? "card" : "cards"} in play
                </>
              )}
            </h1>
          </div>
          {!loading && tips.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: "Open", v: String(openCount) },
                { k: "Gold", v: String(tips.filter((t) => t.isPremium && t.status === "upcoming").length), gold: true },
                {
                  k: "Top odds",
                  v: (() => {
                    const free = tips.filter((t) => t.status === "upcoming" && (!t.isPremium || isPremium || owns(t)));
                    return free.length ? Math.max(...free.map((t) => t.odds)).toFixed(2) : "—";
                  })(),
                },
              ].map((x) => (
                <div key={x.k} className="rounded-[16px] bg-white/[0.04] border border-white/[0.07] px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{x.k}</p>
                  <p className={`num font-black text-[22px] leading-none mt-1.5 ${x.gold ? "foil-gold-text" : ""}`}>{x.v}</p>
                </div>
              ))}
            </div>
          )}
          {!loading && packOpen && (
            <BinderStrip tips={tips} seen={seen} userIsPremium={isPremium} onSlot={openCard} />
          )}
          {streak && packOpen && <StreakBar streak={streak.streak} credits={credits} local={streak.local} />}
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
              {!loading && !packOpen && tips.length > 0 ? (
                <DailyPack tips={tips} onOpen={openPack} />
              ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 [&>*]:min-w-0">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : filteredTips.length === 0
                  ? <EmptyState title="Deck's empty" body="New cards usually land by midday." />
                  : filteredTips.map((tip, i) => (
                      <TipCard
                        key={tip.id}
                        tip={tip}
                        index={i}
                        total={filteredTips.length}
                        userIsPremium={isPremium}
                        onInspect={openCard}
                        unlocked={owns(tip)}
                        onLockedTap={setSheetTip}
                        unlockPrice={unlockPrice}
                        layoutId={`card-${tip.id}`}
                        ghost={inspect?.id === tip.id}
                      />
                    ))}
              </div>
              )}
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

      <AnimatePresence>{onboarding && <Onboarding key="onboarding" onDone={() => setOnboarding(false)} />}</AnimatePresence>

      <CardInspector tip={inspect} userIsPremium={isPremium || (!!inspect && owns(inspect))} celebrate={celebrate} onClose={closeCard} />
      <UnlockSheet
        tip={sheetTip}
        signedIn={!!user}
        credits={credits}
        onClose={() => setSheetTip(null)}
        onUnlocked={handleUnlocked}
      />

      {/* Admin login dialog - opened by 3 taps on the footer copyright */}
      <AdminLoginDialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen} />
    </div>
  );
};

export default Index;
