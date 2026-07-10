import { useState, useEffect } from "react";
import { Zap, Play, Gift, Loader2, Crown, Lock } from "lucide-react";
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
  won: "Won ✓",
  lost: "Lost ✗",
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
          console.log('🔄 New tip detected - resetting unlock status');
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
          className="relative overflow-hidden rounded-2xl glass gradient-border p-6"
        >
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
              style={{ background: "radial-gradient(circle, hsl(280 100% 60%), transparent 70%)" }}
              animate={{
                x: ["-10%", "10%", "-5%"],
                y: ["-10%", "10%", "-5%"],
              }}
              transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full">
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Today's Hot Tip</span>
                </div>
              </div>
              {(data.status && data.status !== "upcoming") && (
                <Badge variant={statusVariant[data.status]} className="gap-1 py-1 px-2.5">
                  <span className="font-display font-bold uppercase tracking-wider text-[9px]">
                    {statusLabel[data.status]}
                  </span>
                </Badge>
              )}
            </div>

            {/* Match Info */}
            <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] text-center font-medium">
              {data.league} • {data.kickoff}
            </p>

            {/* Teams Preview */}
            <div className="flex flex-col items-center gap-3 py-3">
              {/* Home Team */}
              <div className="flex items-center gap-3 w-full justify-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center ring-2 ring-purple-500/30">
                  <TeamLogo teamName={data.homeTeam} logoUrl={data.homeTeamLogo} size={32} />
                </div>
                <span className="font-display text-lg font-bold text-foreground">{data.homeTeam}</span>
              </div>

              {/* VS Badge */}
              <div className="px-3 py-1.5 bg-muted/60 border border-border/40 rounded-lg">
                <span className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider">VS</span>
              </div>

              {/* Away Team */}
              <div className="flex items-center gap-3 w-full justify-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center ring-2 ring-purple-500/30">
                  <TeamLogo teamName={data.awayTeam} logoUrl={data.awayTeamLogo} size={32} />
                </div>
                <span className="font-display text-lg font-bold text-foreground">{data.awayTeam}</span>
              </div>
            </div>

            {/* Locked Content Overlay */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/25 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-purple-400">
                <Lock className="w-4 h-4" />
                <span className="font-display text-sm font-bold uppercase tracking-wider">Premium Content Locked</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 opacity-30">
                <div className="bg-background/40 rounded-lg p-2 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase">Prediction</p>
                  <p className="text-xs font-bold text-foreground">???</p>
                </div>
                <div className="bg-background/40 rounded-lg p-2 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase">Odds</p>
                  <p className="text-xs font-bold text-foreground">?.??</p>
                </div>
                <div className="bg-background/40 rounded-lg p-2 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase">Confidence</p>
                  <p className="text-xs font-bold text-foreground">???</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleWatchAd}
              disabled={isLoading || !isRewardedAdReady}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {!isRewardedAdReady ? "Preparing Ad..." : "Watch Ad - Free"}
            </Button>

            {error && (
              <p className="text-red-500 text-xs text-center">{error}</p>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              ~30 seconds • No purchase necessary
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl glass gradient-border p-6"
        >
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-25"
              style={{ background: "radial-gradient(circle, hsl(280 100% 60%), transparent 70%)" }}
              animate={{
                x: ["-10%", "10%", "-5%"],
                y: ["-10%", "10%", "-5%"],
              }}
              transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full">
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Today's Hot Tip</span>
                </div>
                {isPremium && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 px-2 py-1 rounded-full border border-pink-500/30">
                    <Crown className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Premium</span>
                  </div>
                )}
              </div>
              {(data.status && data.status !== "upcoming") && (
                <Badge variant={statusVariant[data.status]} className="gap-1.5 py-1.5 px-3">
                  <span className="font-display font-bold uppercase tracking-wider text-[10px]">
                    {statusLabel[data.status]}
                  </span>
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
                {data.league} • {data.kickoff}
              </p>

              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center ring-2 ring-purple-500/30">
                  <TeamLogo teamName={data.homeTeam} logoUrl={data.homeTeamLogo} size={32} />
                </div>
                <div className="text-center">
                  <p className="font-display text-xl font-bold text-foreground">
                    {data.homeTeam}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">vs</p>
                  <p className="font-display text-xl font-bold text-foreground mt-1">
                    {data.awayTeam}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center ring-2 ring-purple-500/30">
                  <TeamLogo teamName={data.awayTeam} logoUrl={data.awayTeamLogo} size={32} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">Prediction</p>
                  <p className="font-display font-bold text-primary text-sm">{data.prediction}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">Odds</p>
                  <p className="font-display font-bold text-purple-400 text-sm">{data.odds}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">Confidence</p>
                  <p className="font-display font-bold text-success text-sm">{data.confidence}</p>
                </div>
              </div>

              {data.description && (
                <div className="mt-5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="w-full gap-2 h-9 text-xs font-display uppercase tracking-wider text-accent hover:bg-accent/10 hover:text-accent border border-accent/20 rounded-lg transition-all"
                  >
                    <Gift className={`w-4 h-4 transition-transform ${showAnalysis ? 'rotate-180' : ''}`} />
                    {showAnalysis ? 'Hide Analysis' : 'Show Analysis'}
                    {showAnalysis ? (
                      <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Button>

                  <AnimatePresence>
                    {showAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-2 p-4 bg-gradient-to-br from-accent/5 to-transparent rounded-xl border border-accent/20 overflow-hidden"
                      >
                        <div className="flex items-start gap-2">
                          <Gift className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground leading-relaxed italic">{data.description}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default TodayHotTip;
