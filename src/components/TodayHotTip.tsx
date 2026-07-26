import { useState, useEffect } from "react";
import { Flame, Play, Loader2, Gem, Shield, Crosshair } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick, loadFeaturedPick } from "@/lib/featuredPickStorage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdMob } from "@/hooks/useAdMob";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const statusVariant = {
  upcoming: "outline" as const,
  won: "win" as const,
  lost: "loss" as const,
  draw: "draw" as const,
};

const statusLabel = {
  upcoming: "Upcoming",
  won: "Won",
  lost: "Lost",
  draw: "Draw",
};

const TodayHotTip = () => {
  const [pick, setPick] = useState<FeaturedPick | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [lastUnlockedTipId, setLastUnlockedTipId] = useState<string | null>(null);
  const { isLoading, isRewardedAdReady, error, showRewardedAd, loadRewardedAd } = useAdMob();
  const { active: isPremium } = usePremiumStatus();

  useEffect(() => {
    if (isPremium) {
      setIsUnlocked(true);
    }

    loadFeaturedPick().then((featured) => {
      if (featured) {
        setPick(featured);

        const currentTipId = `${featured.homeTeam}-${featured.awayTeam}-${featured.kickoff}`;
        const savedTipId = localStorage.getItem("lastUnlockedTipId");
        
        if (!isPremium && savedTipId && savedTipId !== currentTipId) {
          setIsUnlocked(false);
          localStorage.setItem("hotTipUnlocked", "false");
        }

        if (!isPremium) {
          const savedUnlocked = localStorage.getItem("hotTipUnlocked");
          if (savedUnlocked === "true") {
            setIsUnlocked(true);
            setLastUnlockedTipId(currentTipId);
          }
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
        setLastUnlockedTipId(currentTipId);
      }
    }, 5000);
  };

  const data = pick || {
    league: "UEFA Champions League",
    kickoff: "21:00",
    homeTeam: "Real Madrid",
    awayTeam: "Bayern Munich",
    prediction: "Real Madrid Win",
    odds: "2.15",
    confidence: "High",
    status: "upcoming" as const,
  };

  return (
    <>
      {!isUnlocked ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl backdrop-blur-sm border border-purple-500/15 bg-gradient-to-br from-card via-purple-950/10 to-pink-950/5 shadow-xl shadow-black/10"
        >
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/15">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
                <span className="text-[10px] font-display font-bold uppercase tracking-wider">Today's Hot Tip</span>
              </div>
              {(data.status && data.status !== "upcoming") && (
                <Badge variant={statusVariant[data.status]} className="gap-1 text-[9px] px-2 py-0.5">
                  <span className="whitespace-nowrap">{statusLabel[data.status]}</span>
                </Badge>
              )}
            </div>

            {/* League */}
            <p className="text-muted-foreground/50 text-[10px] uppercase tracking-[0.2em] text-center font-medium">
              {data.league} &bull; {data.kickoff}
            </p>

            {/* Teams - Horizontal */}
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-12 h-12 rounded-full bg-purple-500/5 flex items-center justify-center ring-1 ring-purple-500/15">
                  <TeamLogo teamName={data.homeTeam} logoUrl={data.homeTeamLogo} size={28} />
                </div>
                <span className="font-display text-sm font-bold text-foreground text-center truncate w-full">{data.homeTeam}</span>
              </div>
              <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
                <span className="text-xs font-display font-semibold text-muted-foreground/30 uppercase tracking-widest">VS</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-12 h-12 rounded-full bg-purple-500/5 flex items-center justify-center ring-1 ring-purple-500/15">
                  <TeamLogo teamName={data.awayTeam} logoUrl={data.awayTeamLogo} size={28} />
                </div>
                <span className="font-display text-sm font-bold text-foreground text-center truncate w-full">{data.awayTeam}</span>
              </div>
            </div>

            {/* Locked preview */}
            <div className="rounded-xl px-3 py-3 border border-purple-500/15 bg-purple-500/5">
              <div className="flex items-center justify-center gap-2 text-purple-400/70 mb-2">
                <Shield className="w-3.5 h-3.5" />
                <span className="font-display text-[10px] font-bold uppercase tracking-wider">Premium Content Locked</span>
              </div>
              <div className="grid grid-cols-3 gap-2 opacity-25">
                <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <p className="text-[7px] text-muted-foreground uppercase">Prediction</p>
                  <p className="text-[10px] font-bold text-foreground">???</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <p className="text-[7px] text-muted-foreground uppercase">Odds</p>
                  <p className="text-[10px] font-bold text-foreground">?.??</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-2 text-center">
                  <p className="text-[7px] text-muted-foreground uppercase">Confidence</p>
                  <p className="text-[10px] font-bold text-foreground">???</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleWatchAd}
              disabled={isLoading || !isRewardedAdReady}
              className="w-full h-10 font-bold uppercase tracking-wider text-xs text-white rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {!isRewardedAdReady ? "Preparing Ad..." : "Watch Ad - Free"}
            </Button>

            {error && <p className="text-red-400/70 text-[10px] text-center">{error}</p>}
            <p className="text-[9px] text-muted-foreground/40 text-center">~30 seconds &bull; No purchase necessary</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl backdrop-blur-sm border border-purple-500/15 bg-gradient-to-br from-card via-purple-950/10 to-pink-950/5 shadow-xl shadow-black/10"
        >
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/15">
                  <Flame className="w-3.5 h-3.5 animate-pulse" />
                  <span className="text-[10px] font-display font-bold uppercase tracking-wider">Today's Hot Tip</span>
                </div>
                {isPremium && (
                  <span className="flex items-center gap-0.5 bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/15 text-[9px] font-bold uppercase tracking-wider">
                    <Gem className="w-2.5 h-2.5" />
                    Premium
                  </span>
                )}
              </div>
              {(data.status && data.status !== "upcoming") && (
                <Badge variant={statusVariant[data.status]} className="gap-1 text-[9px] px-2 py-0.5">
                  <span className="whitespace-nowrap">{statusLabel[data.status]}</span>
                </Badge>
              )}
            </div>

            {/* League */}
            <p className="text-muted-foreground/50 text-[10px] uppercase tracking-[0.2em] font-medium">
              {data.league} &bull; {data.kickoff}
            </p>

            {/* Teams - Horizontal */}
            <div className="flex items-center justify-between gap-3 py-2">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-12 h-12 rounded-full bg-purple-500/5 flex items-center justify-center ring-1 ring-purple-500/15">
                  <TeamLogo teamName={data.homeTeam} logoUrl={data.homeTeamLogo} size={28} />
                </div>
                <span className="font-display text-sm font-bold text-foreground text-center truncate w-full">{data.homeTeam}</span>
              </div>
              <div className="flex flex-col items-center gap-1 flex-shrink-0 px-3">
                <span className="text-xs font-display font-semibold text-muted-foreground/30 uppercase tracking-widest">VS</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-12 h-12 rounded-full bg-purple-500/5 flex items-center justify-center ring-1 ring-purple-500/15">
                  <TeamLogo teamName={data.awayTeam} logoUrl={data.awayTeamLogo} size={28} />
                </div>
                <span className="font-display text-sm font-bold text-foreground text-center truncate w-full">{data.awayTeam}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl px-3 py-2.5 border border-white/[0.04] bg-white/[0.02] text-center">
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">Prediction</p>
                <p className="font-display font-bold text-foreground text-xs">{data.prediction}</p>
              </div>
              <div className="rounded-xl px-3 py-2.5 border border-purple-500/10 bg-purple-500/5 text-center">
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">Odds</p>
                <div className="flex items-center justify-center gap-1">
                  <Crosshair className="w-3 h-3 text-purple-400/60" />
                  <p className="font-display font-bold text-purple-400 text-xs">{data.odds}</p>
                </div>
              </div>
              <div className="rounded-xl px-3 py-2.5 border border-emerald-500/10 bg-emerald-500/5 text-center">
                <p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">Confidence</p>
                <p className="font-display font-bold text-emerald-400 text-xs">{data.confidence}</p>
              </div>
            </div>

            {/* Analysis toggle */}
            {data.description && (
              <div>
                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-purple-400/60 hover:text-purple-400 transition-colors"
                >
                  <svg className={`w-3 h-3 transition-transform ${showAnalysis ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showAnalysis ? "Hide Analysis" : "Show Analysis"}
                </button>

                <AnimatePresence>
                  {showAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-purple-500/20 pl-3 py-1">
                        {data.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
};

export default TodayHotTip;
