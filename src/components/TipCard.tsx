import { Badge } from "@/components/ui/badge";
import { Timer, Shield, Gem, ChevronDown, ChevronUp, Crosshair, BadgeCheck, BadgeX, Minus } from "lucide-react";
import TeamLogo, { SportIcon } from "@/components/TeamLogo";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, memo } from "react";

export interface Tip {
  id: number;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  kickoff: string;
  status: "upcoming" | "won" | "lost" | "draw";
  isPremium?: boolean;
  isPublished?: boolean;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  description?: string | null;
  wonAt?: string | null;
}

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

const StatusIcon = ({ status }: { status: Tip["status"] }) => {
  if (status === "won") return <BadgeCheck className="w-3 h-3 text-emerald-400" />;
  if (status === "lost") return <BadgeX className="w-3 h-3 text-red-400" />;
  if (status === "draw") return <Minus className="w-3 h-3 text-amber-400" />;
  return null;
};


const TipCard = ({ tip, userIsPremium = false }: { tip: Tip; userIsPremium?: boolean }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const isSettled = tip.status !== "upcoming";
  const isWon = tip.status === "won";
  const isLost = tip.status === "lost";
  const locked = tip.isPremium && !userIsPremium && !isSettled;

  const formatKickoff = useCallback((kickoffStr: string) => {
    try {
      if (!kickoffStr) return "TBD";
      
      const cleanKickoff = String(kickoffStr).replace(/\[object Object\]/g, "").trim();
      const date = new Date(cleanKickoff.replace(' ', 'T'));
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return cleanKickoff || "TBD";
    } catch (e) {}
    return String(kickoffStr);
  }, []);

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl group ${locked ? "select-none" : ""} ${
        isLost ? "opacity-70" : ""
      }`}
    >
      <div
        className={`relative rounded-2xl backdrop-blur-sm overflow-hidden transition-all duration-300 ${
          isWon
            ? "bg-gradient-to-br from-emerald-950/20 via-card to-card border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
            : tip.isPremium 
            ? "bg-gradient-to-br from-card via-pink-950/8 to-purple-950/10 border border-pink-500/25 shadow-xl shadow-pink-500/8 group-hover:shadow-pink-500/15 group-hover:-translate-y-0.5 group-hover:border-pink-500/40"
            : "bg-gradient-to-br from-card via-purple-950/5 to-background border border-white/[0.06] shadow-lg shadow-black/10 group-hover:border-purple-500/25 group-hover:-translate-y-0.5"
        }`}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${
          isWon ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent" :
          tip.isPremium 
            ? "bg-gradient-to-r from-transparent via-pink-500/70 to-transparent" 
            : "bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
        }`} />

        <div className="p-4 space-y-3">
          {/* Top row: badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {tip.isPremium && !isSettled && (
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-2.5 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-md shadow-pink-500/30">
                  <Gem className="w-2.5 h-2.5 fill-white" />
                  Premium
                </span>
              )}
              <Badge variant="sport" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20 gap-1 inline-flex">
                <SportIcon sport={tip.sport} size={8} />
                {tip.sport}
              </Badge>
              <span className="text-[10px] text-muted-foreground/70 font-medium truncate max-w-[120px]">{tip.league}</span>
            </div>
            <Badge variant={statusVariant[tip.status]} className="gap-1 shrink-0 text-[9px] px-2 py-0.5">
              <StatusIcon status={tip.status} />
              {tip.isPremium && isSettled && <Gem className="w-2.5 h-2.5" />}
              <span className="whitespace-nowrap">{statusLabel[tip.status]}</span>
            </Badge>
          </div>

          {/* Teams - Horizontal Layout */}
          <div className="flex items-center justify-between gap-2 py-2">
            {/* Home Team */}
            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                isWon ? "ring-2 ring-emerald-500/30 bg-emerald-500/5" :
                tip.isPremium ? "ring-2 ring-pink-500/20 bg-pink-500/5" : "ring-2 ring-purple-500/20 bg-purple-500/5"
              }`}>
                <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={24} sport={tip.sport} />
              </div>
              <span className="font-display font-bold text-foreground text-xs sm:text-sm leading-tight text-center truncate w-full">{tip.homeTeam}</span>
            </div>

            {/* VS + Odds center */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
              <span className="text-[10px] font-display font-semibold text-muted-foreground/50 uppercase tracking-widest">VS</span>
              <div className={`text-lg font-black font-display ${
                isWon ? "text-emerald-400" : tip.isPremium ? "text-pink-400" : "text-purple-400"
              }`}>
                {tip.odds.toFixed(2)}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                isWon ? "ring-2 ring-emerald-500/30 bg-emerald-500/5" :
                tip.isPremium ? "ring-2 ring-pink-500/20 bg-pink-500/5" : "ring-2 ring-purple-500/20 bg-purple-500/5"
              }`}>
                <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={24} sport={tip.sport} />
              </div>
              <span className="font-display font-bold text-foreground text-xs sm:text-sm leading-tight text-center truncate w-full">{tip.awayTeam}</span>
            </div>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center justify-center gap-3 py-5 rounded-xl bg-gradient-to-r from-pink-500/8 to-purple-900/8 border border-pink-500/15 cursor-pointer hover:border-pink-500/30 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/15 to-purple-600/15 flex items-center justify-center ring-1 ring-pink-500/20">
                  <Shield className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Unlock with Premium</p>
                  <p className="text-[10px] text-muted-foreground/60">Click to view plans</p>
                </div>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Prediction box */}
              <div className={`rounded-xl px-3 py-2.5 border ${
                isWon ? "bg-emerald-500/5 border-emerald-500/15" :
                tip.isPremium ? "bg-pink-500/5 border-pink-500/15" : "bg-purple-500/5 border-purple-500/15"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] mb-1 font-medium">Prediction</p>
                    <p className="font-display font-bold text-foreground text-sm">{tip.prediction}</p>
                  </div>
                  <Crosshair className={`w-5 h-5 ${
                    isWon ? "text-emerald-400" : tip.isPremium ? "text-pink-400/60" : "text-purple-400/60"
                  }`} />
                </div>
              </div>

              {/* Analysis toggle */}
              {tip.description && (
                <>
                  <button 
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      tip.isPremium ? "text-pink-400/70 hover:text-pink-400" : "text-purple-400/70 hover:text-purple-400"
                    }`}
                  >
                    {showAnalysis ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAnalysis ? "Hide Analysis" : "Show Analysis"}
                  </button>

                  <AnimatePresence>
                    {showAnalysis && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic border-l-2 border-purple-500/20 pl-3 py-1">
                          {tip.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-white/[0.04]">
            <Timer className="w-3 h-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/60 font-medium">{formatKickoff(tip.kickoff)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(TipCard);
