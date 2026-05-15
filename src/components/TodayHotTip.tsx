import { useState } from "react";
import { Zap, Play, Gift, Loader2 } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { motion } from "framer-motion";
import { FeaturedPick, loadFeaturedPick } from "@/lib/featuredPickStorage";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdMob } from "@/hooks/useAdMob";

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
  const { isLoading, isRewardedAdReady, error, showRewardedAd, loadRewardedAd } = useAdMob();

  useEffect(() => {
    // Sprawdź, czy tip został już odblokowany w localStorage
    const savedUnlocked = localStorage.getItem("hotTipUnlocked");
    if (savedUnlocked === "true") {
      setIsUnlocked(true);
    }

    // Załaduj dane tipu
    loadFeaturedPick().then((featured) => {
      if (featured) {
        setPick(featured);
      }
    });
  }, []);

  const handleWatchAd = async () => {
    try {
      const reward = await showRewardedAd();
      if (reward) {
        // Użytkownik obejrzał reklamę do końca i otrzymał nagrodę!
        setIsUnlocked(true);
        localStorage.setItem("hotTipUnlocked", "true");
      }
    } catch (err) {
      console.error("Błąd podczas wyświetlania reklamy:", err);
      // Jeśli coś poszło nie tak, spróbuj załadować nową reklamę
      await loadRewardedAd();
    }
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
              style={{ background: "radial-gradient(circle, hsl(45 100% 50%), transparent 70%)" }}
              animate={{
                x: ["-10%", "10%", "-5%"],
                y: ["-10%", "10%", "-5%"],
              }}
              transition={{ duration: 6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full">
                <Zap className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider">Today's Hot Tip</span>
              </div>
            </div>

            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-amber-400" />
            </div>

            <h3 className="font-display text-xl font-bold mb-2">Unlock Premium Tip</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Watch a short ad to reveal our highest confidence pick for today
            </p>

            <Button
              onClick={handleWatchAd}
              disabled={isLoading || !isRewardedAdReady}
              className="w-full max-w-xs h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold uppercase tracking-wider text-sm shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {!isRewardedAdReady ? "Preparing Ad..." : "Watch Ad - Free"}
            </Button>

            {error && (
              <p className="text-red-500 text-xs mt-3">{error}</p>
            )}

            <p className="text-[10px] text-muted-foreground mt-3">
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
              style={{ background: "radial-gradient(circle, hsl(45 100% 50%), transparent 70%)" }}
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
                <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full">
                  <Zap className="w-4 h-4 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Today's Hot Tip</span>
                </div>
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
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center ring-2 ring-amber-500/30">
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
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center ring-2 ring-amber-500/30">
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
                  <p className="font-display font-bold text-amber-400 text-sm">{data.odds}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1">Confidence</p>
                  <p className="font-display font-bold text-success text-sm">{data.confidence}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};

export default TodayHotTip;
