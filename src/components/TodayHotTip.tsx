import { useState, useEffect, useMemo, memo } from "react";
import { Play, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick, loadFeaturedPick } from "@/lib/featuredPickStorage";
import StatusTag from "@/components/StatusTag";
import HoloCard from "@/components/HoloCard";
import CardArt from "@/components/CardArt";
import { formatKickoff } from "@/lib/format";
import { useAdMob } from "@/hooks/useAdMob";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const useCountdown = (kickoff: string) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    try {
      const target = new Date(kickoff).getTime();
      if (isNaN(target)) return null;
      const diff = target - now;
      if (diff <= 0) return { expired: true, text: "LIVE", hours: 0, minutes: 0, seconds: 0 };
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");
      return { expired: false, text: `${hours}:${pad(minutes)}:${pad(seconds)}`, hours, minutes, seconds };
    } catch {
      return null;
    }
  }, [kickoff, now]);
};

const TodayHotTip = () => {
  const [pick, setPick] = useState<FeaturedPick | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const { isLoading, isRewardedAdReady, error, showRewardedAd } = useAdMob();
  const { active: isPremium } = usePremiumStatus();

  const [loaded, setLoaded] = useState(false);
  const data = pick || {
    league: "UEFA Champions League",
    kickoff: new Date(Date.now() + 3600000 * 3).toISOString(),
    homeTeam: "Real Madrid",
    awayTeam: "Bayern Munich",
    prediction: "Real Madrid Win",
    odds: "2.15",
    confidence: "High",
    status: "upcoming" as const,
  };

  const countdown = useCountdown(data.kickoff);

  useEffect(() => {
    if (isPremium) setIsUnlocked(true);

    loadFeaturedPick().then((featured) => {
      setLoaded(true);
      if (featured) {
        setPick(featured);
        if (isPremium) return;

        // Admin unlocked hero without ad — show immediately
        if (featured.unlockFree) {
          setIsUnlocked(true);
          return;
        }

        const currentTipId = `${featured.homeTeam}-${featured.awayTeam}-${featured.kickoff}`;
        const savedTipId = localStorage.getItem("lastUnlockedTipId");
        
        if (!isPremium && savedTipId && savedTipId !== currentTipId) {
          setIsUnlocked(false);
          localStorage.setItem("hotTipUnlocked", "false");
          return;
        }

        const savedUnlocked = localStorage.getItem("hotTipUnlocked");
        if (savedUnlocked === "true") {
          setIsUnlocked(true);
        }
      }
    });
  }, [isPremium]);

  
  const [burst, setBurst] = useState(false);

  const [adFailed, setAdFailed] = useState(false);

  const handleWatchAd = async () => {
    setAdFailed(false);
    // Only reveal when the ad network confirms the reward (web: always true).
    const rewarded = await showRewardedAd().catch(() => false);
    if (!rewarded) {
      setAdFailed(true);
      return;
    }
    setBurst(true);
    window.setTimeout(() => setBurst(false), 1600);
    setIsUnlocked(true);
    localStorage.setItem("hotTipUnlocked", "true");
    if (pick) {
      const currentTipId = `${pick.homeTeam}-${pick.awayTeam}-${pick.kickoff}`;
      localStorage.setItem("lastUnlockedTipId", currentTipId);
    }
  };

  const settled = data.status && data.status !== "upcoming";
  const stars = { High: 3, Medium: 2, Low: 1 }[data.confidence as string] ?? 0;
  const sport = pick?.sport;

  const countdownPill = !settled && countdown && (
    <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-black/40 text-white text-[11px] font-semibold tabular-nums">
      {countdown.expired ? (
        <><span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" /> LIVE</>
      ) : (
        <>Starts in {countdown.text}</>
      )}
    </span>
  );

  const front = (
    <div aria-hidden={!isUnlocked} className="flip-face [grid-area:1/1] rounded-[22px] p-[6px] holo-frame">
      <div className="h-full rounded-[17px] bg-[hsl(232_42%_11%)] text-white overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 h-10">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="foil-gold-text">Holo rare</span>
            <span className="text-white/40">·</span>
            <span className="text-white/80">Pick of the day</span>
          </span>
        </div>

        <div className="relative mx-2.5">
          <CardArt sport={sport} home={data.homeTeam} away={data.awayTeam} homeLogo={data.homeTeamLogo} awayLogo={data.awayTeamLogo} size={46} holo sparkles className="h-[156px] rounded-[12px]" />
          <div className="absolute left-2.5 bottom-2.5 z-10">{countdownPill}</div>
          <span className="absolute -bottom-8 right-3 z-10 grid place-items-center w-[76px] h-[76px] rounded-full p-[4px] foil-gold shadow-[0_10px_24px_rgba(0,0,0,.55)]">
            <span className="w-full h-full rounded-full bg-[hsl(232_45%_10%)] grid place-items-center text-center leading-none">
              <span>
                <span className="block num font-black text-[21px] foil-gold-text">{isUnlocked ? data.odds : "?.??"}</span>
                <span className="block text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/55 mt-1">Odds</span>
              </span>
            </span>
          </span>
          {settled && <StatusTag status={data.status as "won" | "lost" | "draw"} className="absolute -top-3 -right-2 scale-125" />}
        </div>

        <div className="px-4 pt-3.5 pr-[96px]">
          <h3 className="font-display font-black uppercase text-[24px] leading-[1.02] tracking-[-0.02em]">
            {data.homeTeam}
            <span className="block text-[12px] text-primary tracking-[0.1em] my-0.5">versus</span>
            {data.awayTeam}
          </h3>
          <p className="text-[13px] text-white/60 mt-1.5">{data.league} · {formatKickoff(data.kickoff)}</p>
        </div>

        <div className="grid grid-cols-[1.7fr_1fr] gap-1.5 mx-2.5 mt-3">
          <div className="rounded-[10px] bg-white/[0.07] px-3 py-2.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">Pick</p>
            <p className="text-[15px] font-semibold leading-tight mt-1">{isUnlocked ? data.prediction : "—"}</p>
          </div>
          <div className="rounded-[10px] bg-white/[0.07] px-3 py-2.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/50">Conf.</p>
            <p className="text-[16px] leading-none mt-1.5 tracking-[0.05em]" aria-label={`Confidence ${data.confidence}`}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={n <= stars ? "text-primary" : "text-white/20"}>★</span>
              ))}
            </p>
          </div>
        </div>

        {data.description && isUnlocked ? (
          <div className="px-4 pt-3 pb-4">
            <p className={`text-[14.5px] leading-[1.5] text-white/80 ${showAnalysis ? "" : "line-clamp-3"}`}>{data.description}</p>
            <button
              onClick={() => setShowAnalysis(!showAnalysis)}
              aria-expanded={showAnalysis}
              className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-primary"
            >
              {showAnalysis ? "Show less" : "Read the analysis"}
            </button>
          </div>
        ) : (
          <div className="h-4" />
        )}
      </div>
    </div>
  );

  const back = (
    <div aria-hidden={isUnlocked} className="flip-face flip-back [grid-area:1/1] rounded-[22px] p-[6px] holo-frame">
      <div className="h-full rounded-[17px] card-back text-white flex flex-col items-center justify-center text-center px-6 py-8">
        <div className="relative w-28 h-28 rounded-full foil-gold grid place-items-center shadow-[0_10px_30px_rgba(0,0,0,.5)] foil-shimmer">
          <div className="w-[96px] h-[96px] rounded-full bg-[hsl(232_45%_14%)] grid place-items-center">
            <span className="font-display font-black text-[26px] foil-gold-text leading-none">GSB</span>
          </div>
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] foil-gold-text">Holo rare · Face down</p>
        <p className="font-display font-black uppercase text-[24px] leading-[1.05] mt-2">
          Today's<br />pick of the day
        </p>
        <p className="text-[14px] text-white/65 mt-2">{data.league} · {formatKickoff(data.kickoff)}</p>
        {!settled && countdown && <div className="mt-3">{countdownPill}</div>}

        <button
          onClick={handleWatchAd}
          disabled={isLoading || !isRewardedAdReady || isUnlocked}
          className="mt-6 w-full max-w-[300px] h-13 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-[15px] flex items-center justify-center gap-2 shadow-[0_8px_24px_-6px_hsl(var(--primary)/.6)] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {!isRewardedAdReady ? "Preparing ad…" : "Watch an ad to flip it"}
        </button>
        {(error || adFailed) && (
          <p className="text-red text-[13px] mt-2">{error ?? "The ad didn't finish, so the card stays face down. Try again."}</p>
        )}
        <p className="text-[13px] text-white/55 mt-3">About 30 seconds. Members' cards are always face up.</p>
      </div>
    </div>
  );

  // No pick of the day in the database: show nothing rather than a placeholder match.
  if (!pick) {
    return loaded ? null : <div className="max-w-[440px] mx-auto h-[520px] rounded-[22px] bg-white/[0.04] animate-pulse" />;
  }

  return (
    <section className="relative max-w-[440px] mx-auto">
      {/* Gold burst when the card is revealed */}
      <AnimatePresence>
        {burst && (
          <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => {
              const a = (i / 18) * Math.PI * 2;
              const r = 140 + (i % 3) * 40;
              return (
                <motion.span
                  key={i}
                  className="absolute sparkle !opacity-100 !animate-none"
                  style={{ width: 10 + (i % 4) * 5, height: 10 + (i % 4) * 5, background: i % 2 ? "#ffe08a" : "#fff" }}
                  initial={{ x: 0, y: 0, scale: 0, rotate: 0 }}
                  animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: [0, 1.3, 0], rotate: 180 }}
                  transition={{ duration: 1.1, delay: 0.35 + (i % 5) * 0.03, ease: [0.15, 0.8, 0.3, 1] }}
                />
              );
            })}
            <motion.span
              className="absolute w-40 h-40 rounded-full bg-[radial-gradient(circle,rgba(255,236,170,.75),transparent_65%)]"
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 3, opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, delay: 0.3 }}
            />
          </div>
        )}
      </AnimatePresence>
      {/* Aura in the frame's colours */}
      <div className="pointer-events-none absolute -inset-3 rounded-[30px] holo-frame blur-2xl opacity-35" aria-hidden />
      <HoloCard holo={false} maxTilt={8} innerClassName="rounded-[22px]">
        <div className="flip-scene">
          <div className={`flip-inner grid grid-cols-[minmax(0,1fr)] ${isUnlocked ? "" : "is-flipped"}`}>
            {front}
            {back}
          </div>
        </div>
      </HoloCard>
    </section>
  );
};

export default memo(TodayHotTip);
