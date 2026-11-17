import { useState, useEffect, useMemo, memo } from "react";
import { Play, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick, loadFeaturedPick } from "@/lib/featuredPickStorage";
import StatusTag from "@/components/StatusTag";
import { formatKickoff } from "@/lib/format";
import SectionHead from "@/components/SectionHead";
import PitchLines from "@/components/PitchLines";
import { PenArrow, PenNote, PenUnderline } from "@/components/RedPen";
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

  const [justUnlocked, setJustUnlocked] = useState(false);

  const handleWatchAd = () => {
    showRewardedAd().catch(() => {});
    setTimeout(() => {
      setJustUnlocked(true);
      setIsUnlocked(true);
      localStorage.setItem("hotTipUnlocked", "true");
      if (pick) {
        const currentTipId = `${pick.homeTeam}-${pick.awayTeam}-${pick.kickoff}`;
        localStorage.setItem("lastUnlockedTipId", currentTipId);
      }
    }, 5000);
  };

  const settled = data.status && data.status !== "upcoming";
  const penVerdict = { High: "Banker!", Medium: "Fair price", Low: "Long shot" }[data.confidence as string];
  const confidenceLevel = { High: 3, Medium: 2, Low: 1 }[data.confidence as string] ?? 0;

  return (
    <section>
      <SectionHead
        tone="red"
        right={
          !settled && countdown ? (
            <span className="font-mono text-[13px] font-medium tracking-[0.02em] tabular-nums text-foreground">
              {countdown.expired ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-red uppercase tracking-[0.1em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" /> Live
                </span>
              ) : (
                <>KO in {countdown.text}</>
              )}
            </span>
          ) : undefined
        }
      >
        Nap of the day
      </SectionHead>

      <p className="label mt-3 text-foreground">
        {data.league} <span className="text-foreground/40">/</span> {formatKickoff(data.kickoff)}
      </p>

      {/* Fixture + odds stamp */}
      <div className="relative mt-2">
        <PitchLines
          sport={pick?.sport}
          className="absolute -left-1 -top-2 h-[calc(100%+16px)] w-[calc(100%-96px)] md:w-[calc(100%-150px)] text-foreground/[0.11] -rotate-[1.2deg]"
        />
        <div className="relative pr-[104px] md:pr-[140px]">
          <h3 className="font-display font-black uppercase text-foreground leading-[0.86] tracking-[-0.005em] text-[clamp(46px,14vw,88px)] break-words">
            {data.homeTeam}
          </h3>
          <p className="font-serif italic text-[22px] leading-none text-red my-1.5 pl-1">versus</p>
          <h3 className="font-display font-black uppercase text-foreground leading-[0.86] tracking-[-0.005em] text-[clamp(46px,14vw,88px)] break-words">
            {data.awayTeam}
          </h3>
        </div>

        <div className="halftone absolute -right-4 -top-3 w-[132px] h-[132px] md:w-[170px] md:h-[170px] rounded-full" aria-hidden />
        <div
          key={isUnlocked ? "on" : "off"}
          className={`absolute right-0 top-1 w-[100px] h-[100px] md:w-[132px] md:h-[132px] rounded-full border-[3px] grid place-items-center bg-background/70 ${
            isUnlocked ? "border-red text-red stamp-in" : "border-foreground/30 text-foreground/30 rotate-[8deg]"
          }`}
          style={{ maskImage: "radial-gradient(circle at 35% 35%, #000 60%, rgba(0,0,0,.8) 80%, #000)", ["--stamp-rot" as string]: "8deg" }}
        >
          <div className="absolute inset-[5px] rounded-full border border-current opacity-60" />
          <div className="text-center leading-none">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">Price</p>
            <p className="num font-black text-[36px] md:text-[46px] leading-[0.95] mt-0.5">{isUnlocked ? data.odds : "?.??"}</p>
          </div>
        </div>
        {isUnlocked && !settled && penVerdict && (
          <div className="absolute right-0 top-[108px] md:top-[142px] w-[104px] flex flex-col items-center">
            <PenArrow delay={0.5} className="w-10 h-7 -mb-1 -ml-8 -rotate-[20deg]" />
            <PenNote delay={0.9} rotate={-7} className="text-[30px]">{penVerdict}</PenNote>
          </div>
        )}
        {settled && (
          <div className="absolute right-2 top-[104px] md:top-[140px]">
            <StatusTag status={data.status as "won" | "lost" | "draw"} className="text-[26px]" />
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-foreground/80" />

      <AnimatePresence mode="wait" initial={false}>
        {!isUnlocked ? (
          <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-3">
            <p className="label">The selection</p>
            <p className="mt-2 flex flex-wrap gap-2">
              <span className="redact w-40 h-[1.3em]" />
              <span className="redact w-16 h-[1.3em]" />
            </p>
            <div className="mt-3 space-y-1.5">
              <span className="block redact w-full opacity-15" />
              <span className="block redact w-[92%] opacity-15" />
              <span className="block redact w-[70%] opacity-15" />
            </div>
            <button
              onClick={handleWatchAd}
              disabled={isLoading || !isRewardedAdReady}
              className="mt-5 w-full h-14 bg-foreground text-background font-mono text-[13.5px] font-semibold uppercase tracking-[0.12em] flex items-center justify-center gap-2 active:translate-y-px disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {!isRewardedAdReady ? "Preparing ad…" : "Watch an ad to reveal"}
            </button>
            {error && <p className="text-red text-xs text-center mt-2 font-mono">{error}</p>}
            <p className="mt-2 text-center font-serif italic text-[16px] text-muted-foreground">
              About thirty seconds. Members never see the ad.
            </p>
          </motion.div>
        ) : (
          <motion.div key="unlocked" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="pt-3">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="label">The selection</p>
                <span className="relative inline-block mt-1">
                  <span className="block font-serif font-semibold text-[28px] leading-tight text-foreground">{data.prediction}</span>
                  <PenUnderline delay={justUnlocked ? 0.75 : 0.3} className="-mt-0.5" />
                  {justUnlocked && (
                    <motion.span
                      className="absolute left-0 right-0 top-1 h-[1.05em] text-[28px] bg-foreground origin-right"
                      initial={{ scaleX: 1 }}
                      animate={{ scaleX: 0 }}
                      transition={{ duration: 0.55, delay: 0.1, ease: [0.7, 0, 0.3, 1] }}
                      aria-hidden
                    />
                  )}
                </span>
              </div>
              {data.confidence && (
                <div className="shrink-0 text-right">
                  <p className="label">Confidence</p>
                  <div className="mt-1.5 flex justify-end gap-1" aria-label={`Confidence ${data.confidence}`}>
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`w-2.5 h-2.5 rounded-full border-[1.5px] border-foreground ${n <= confidenceLevel ? "bg-foreground" : ""}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {data.description && (
              <div className="mt-3">
                <p
                  className={`font-serif text-[18px] leading-[1.55] text-foreground first-letter:float-left first-letter:font-display first-letter:font-black first-letter:text-[60px] first-letter:text-red first-letter:leading-[0.8] first-letter:mr-2 first-letter:mt-1 ${
                    showAnalysis ? "" : "line-clamp-3"
                  }`}
                >
                  {data.description}
                </p>
                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  aria-expanded={showAnalysis}
                  className="mt-2 h-8 font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-foreground underline decoration-foreground/30 underline-offset-4"
                >
                  {showAnalysis ? "Show less −" : "Continue reading +"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default memo(TodayHotTip);
