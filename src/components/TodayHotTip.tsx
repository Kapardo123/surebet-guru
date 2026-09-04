import { useState, useEffect, useMemo, memo } from "react";
import { Flame, Play, Loader2, Gem, Shield, Crosshair, ChevronDown, Clock, Target, TrendingUp, Zap } from "lucide-react";
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
      return { expired: false, text: `${hours}h ${minutes}m ${seconds}s`, hours, minutes, seconds };
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
    if (isPremium) {
      setIsUnlocked(true);
      return;
    }

    loadFeaturedPick().then((featured) => {
      if (featured) {
        setPick(featured);

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

  return (
    <motion.div
      layout
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <motion.div
          className="absolute -top-20 -left-20 w-60 h-60 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)", filter: "blur(40px)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <div className="relative rounded-2xl backdrop-blur-sm border border-white/[0.08] bg-gradient-to-br from-card/80 via-purple-950/10 to-pink-950/5 shadow-2xl shadow-black/20 overflow-hidden">
        {/* Animated top accent */}
        <motion.div
          className="h-[2px] w-full"
          style={{ background: "linear-gradient(90deg, transparent, #a855f7, #ec4899, #a855f7, transparent)" }}
          animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <motion.div
              className="flex items-center gap-1.5 bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-full border border-purple-500/20"
              animate={{ borderColor: ["rgba(168,85,247,0.2)", "rgba(236,72,153,0.3)", "rgba(168,85,247,0.2)"] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <Flame className="w-3.5 h-3.5" />
              </motion.div>
              <span className="text-[10px] font-display font-bold uppercase tracking-wider">Today's Hot Tip</span>
            </motion.div>
            <div className="flex items-center gap-2">
              {isPremium && isUnlocked && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-0.5 bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded-full border border-pink-500/15 text-[9px] font-bold uppercase tracking-wider"
                >
                  <Gem className="w-2.5 h-2.5" />
                  Premium
                </motion.span>
              )}
              {(data.status && data.status !== "upcoming") && (
                <Badge variant={statusVariant[data.status]} className="gap-1 text-[9px] px-2 py-0.5">
                  <span className="whitespace-nowrap">{statusLabel[data.status]}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* League + Countdown */}
          <div className="flex items-center justify-between">
            <p className="text-white/30 text-[10px] uppercase tracking-[0.2em] font-medium">
              {data.league}
            </p>
            {countdown && (
              <motion.div
                className="flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]"
                animate={countdown.expired ? { borderColor: ["rgba(239,68,68,0.3)", "rgba(239,68,68,0.6)", "rgba(239,68,68,0.3)"] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Clock className="w-3 h-3 text-white/40" />
                <span className={`text-[11px] font-mono font-bold tabular-nums ${countdown.expired ? "text-red-400" : "text-white/60"}`}>
                  {countdown.expired ? (
                    <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      LIVE
                    </motion.span>
                  ) : (
                    countdown.text
                  )}
                </span>
              </motion.div>
            )}
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between gap-4 py-3">
            <motion.div
              className="flex flex-col items-center gap-2 flex-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-lg" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-500/10 to-transparent flex items-center justify-center ring-2 ring-purple-500/15">
                  <TeamLogo teamName={data.homeTeam} logoUrl={data.homeTeamLogo} size={32} />
                </div>
              </div>
              <span className="font-display text-sm font-bold text-foreground text-center truncate w-full">{data.homeTeam}</span>
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-1 flex-shrink-0"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <span className="text-xs font-display font-bold text-white/30">VS</span>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-2 flex-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-pink-500/10 blur-lg" />
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-pink-500/10 to-transparent flex items-center justify-center ring-2 ring-pink-500/15">
                  <TeamLogo teamName={data.awayTeam} logoUrl={data.awayTeamLogo} size={32} />
                </div>
              </div>
              <span className="font-display text-sm font-bold text-foreground text-center truncate w-full">{data.awayTeam}</span>
            </motion.div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {!isUnlocked ? (
              <motion.div
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-3"
              >
                {/* Locked preview */}
                <div className="rounded-xl px-4 py-3 border border-white/[0.06] bg-white/[0.02]">
                  <div className="flex items-center justify-center gap-2 text-white/40 mb-3">
                    <Shield className="w-4 h-4" />
                    <span className="font-display text-[10px] font-bold uppercase tracking-wider">Premium Content Locked</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 opacity-30">
                    <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                      <Target className="w-3.5 h-3.5 text-white/40 mx-auto mb-1" />
                      <p className="text-[9px] text-white/40 uppercase">Prediction</p>
                      <p className="text-[10px] font-bold text-white">???</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                      <TrendingUp className="w-3.5 h-3.5 text-white/40 mx-auto mb-1" />
                      <p className="text-[9px] text-white/40 uppercase">Odds</p>
                      <p className="text-[10px] font-bold text-white">?.??</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                      <Zap className="w-3.5 h-3.5 text-white/40 mx-auto mb-1" />
                      <p className="text-[9px] text-white/40 uppercase">Confidence</p>
                      <p className="text-[10px] font-bold text-white">???</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <Button
                  onClick={handleWatchAd}
                  disabled={isLoading || !isRewardedAdReady}
                  className="w-full h-11 font-bold uppercase tracking-wider text-xs text-white rounded-xl relative overflow-hidden group transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-white/10 to-purple-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative flex items-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {!isRewardedAdReady ? "Preparing Ad..." : "Watch Ad - Unlock Free"}
                  </span>
                </Button>

                {error && <p className="text-red-400/70 text-[10px] text-center">{error}</p>}
                <p className="text-[9px] text-white/25 text-center">~30 seconds · No purchase necessary</p>
              </motion.div>
            ) : (
              <motion.div
                key="unlocked"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-3"
              >
                {/* Stats grid - interactive */}
                <div className="grid grid-cols-3 gap-2">
                  <motion.div
                    className="rounded-xl px-3 py-3 border border-white/[0.06] bg-white/[0.02] text-center cursor-default group/stat hover:border-purple-500/20 hover:bg-purple-500/5 transition-all"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Target className="w-4 h-4 text-purple-400/50 mx-auto mb-1.5 group-hover/stat:text-purple-400 transition-colors" />
                    <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">Prediction</p>
                    <p className="font-display font-bold text-foreground text-xs">{data.prediction}</p>
                  </motion.div>
                  <motion.div
                    className="rounded-xl px-3 py-3 border border-purple-500/10 bg-purple-500/5 text-center cursor-default group/stat hover:border-purple-500/25 hover:bg-purple-500/10 transition-all"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Crosshair className="w-4 h-4 text-purple-400/50 mx-auto mb-1.5 group-hover/stat:text-purple-400 transition-colors" />
                    <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">Odds</p>
                    <p className="font-display font-bold text-purple-400 text-sm">{data.odds}</p>
                  </motion.div>
                  <motion.div
                    className="rounded-xl px-3 py-3 border border-emerald-500/10 bg-emerald-500/5 text-center cursor-default group/stat hover:border-emerald-500/25 hover:bg-emerald-500/10 transition-all"
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Zap className="w-4 h-4 text-emerald-400/50 mx-auto mb-1.5 group-hover/stat:text-emerald-400 transition-colors" />
                    <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">Confidence</p>
                    <p className="font-display font-bold text-emerald-400 text-xs">{data.confidence}</p>
                  </motion.div>
                </div>

                {/* Analysis toggle */}
                {data.description && (
                  <div>
                    <button
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-wider text-white/40 hover:text-purple-400 transition-colors w-full"
                    >
                      <motion.div animate={{ rotate: showAnalysis ? 180 : 0 }} transition={{ duration: 0.25 }}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.div>
                      {showAnalysis ? "Hide Analysis" : "Show Analysis"}
                    </button>

                    <AnimatePresence>
                      {showAnalysis && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <p className="text-[11px] text-white/50 leading-relaxed italic">
                              {data.description}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(TodayHotTip);
