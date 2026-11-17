import { useState, useEffect, useMemo, memo } from "react";
import { Play, Loader2, ChevronDown } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick, loadFeaturedPick } from "@/lib/featuredPickStorage";
import StatusTag from "@/components/StatusTag";
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

  const handleWatchAd = () => {
    showRewardedAd().catch(() => {});
    setTimeout(() => {
      setIsUnlocked(true);
      localStorage.setItem("hotTipUnlocked", "true");
      if (pick) {
        const currentTipId = `${pick.homeTeam}-${pick.awayTeam}-${pick.kickoff}`;
        localStorage.setItem("lastUnlockedTipId", currentTipId);
      }
    }, 5000);
  };

  const settled = data.status && data.status !== "upcoming";

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-[3px] bg-primary" aria-hidden />

      <div className="px-4 pt-4 pb-4 md:px-6 md:pt-5">
        {/* Meta */}
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-primary">Pick of the day</p>
          {settled ? (
            <StatusTag status={data.status as "won" | "lost" | "draw"} />
          ) : countdown ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              {countdown.expired ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-loss">
                  <span className="w-1.5 h-1.5 rounded-full bg-loss animate-pulse" /> Live
                </span>
              ) : (
                <>Starts in <span className="text-foreground font-medium">{countdown.text}</span></>
              )}
            </p>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground mt-1.5">
          {data.league} · {formatKickoff(data.kickoff)}
        </p>

        {/* Teams */}
        <div className="mt-4 space-y-2">
          {[{ n: data.homeTeam, l: data.homeTeamLogo }, { n: data.awayTeam, l: data.awayTeamLogo }].map((t) => (
            <div key={t.n} className="flex items-center gap-3 min-w-0">
              <TeamLogo teamName={t.n} logoUrl={t.l} size={30} />
              <span className="font-display font-semibold uppercase text-[28px] md:text-[32px] leading-none tracking-[0.005em] text-foreground truncate">
                {t.n}
              </span>
            </div>
          ))}
        </div>

        {/* Pick */}
        <AnimatePresence mode="wait" initial={false}>
          {!isUnlocked ? (
            <motion.div
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-5 space-y-3"
            >
              <div className="flex items-end justify-between gap-3 rounded-lg bg-secondary/70 px-3 py-3">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">Our pick</p>
                  <div className="h-4 w-36 rounded bg-muted-foreground/20" />
                </div>
                <div className="h-6 w-12 rounded bg-muted-foreground/20" />
              </div>
              <button
                onClick={handleWatchAd}
                disabled={isLoading || !isRewardedAdReady}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 active:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {!isRewardedAdReady ? "Preparing ad…" : "Watch a short ad to reveal"}
              </button>
              {error && <p className="text-loss text-xs text-center">{error}</p>}
              <p className="text-xs text-muted-foreground text-center">About 30 seconds. Premium members skip the ad.</p>
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-5"
            >
              <div className="flex items-end justify-between gap-4 rounded-lg bg-secondary/70 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Our pick</p>
                  <p className="text-base font-semibold text-foreground leading-snug">{data.prediction}</p>
                  {data.confidence && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Confidence <span className="text-secondary-foreground font-medium">{data.confidence}</span>
                    </p>
                  )}
                </div>
                <p className="num text-[38px] font-semibold leading-none text-primary">{data.odds}</p>
              </div>

              {data.description && (
                <>
                  <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    aria-expanded={showAnalysis}
                    className="mt-3 flex items-center gap-1 text-sm font-medium text-secondary-foreground hover:text-foreground"
                  >
                    {showAnalysis ? "Hide analysis" : "Read the analysis"}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAnalysis ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {showAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="pt-3 text-sm leading-relaxed text-secondary-foreground">{data.description}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default memo(TodayHotTip);
