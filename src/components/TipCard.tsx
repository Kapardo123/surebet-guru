import { Badge } from "@/components/ui/badge";
import { Timer, Shield, Gem, ChevronDown, ChevronUp, Crosshair, BadgeCheck, BadgeX, Minus } from "lucide-react";
import TeamLogo, { SportIcon } from "@/components/TeamLogo";
import { IconTargetReal } from "@/components/icons/RealisticIcons";
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
  status: "upcoming" | "won" | "lost" | "draw" | "void";
  isPremium?: boolean;
  isPublished?: boolean;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  description?: string | null;
  likesCount?: number;
  wonAt?: string | null;
  // "Yesterday's Results": oficjalny wynik meczu (np. "2:1") ustawiany przy rozstrzygnięciu
  finalScore?: string | null;
  // Poczekalnia: tip dodany przez admina, publikowany automatycznie o 3:00
  queued?: boolean;
}

const statusVariant = {
  upcoming: "outline" as const,
  won: "win" as const,
  lost: "loss" as const,
  draw: "draw" as const,
  void: "draw" as const,
};

const statusLabel = {
  upcoming: "Upcoming",
  won: "Won",
  lost: "Lost",
  draw: "Draw",
  void: "Void",
};

const StatusIcon = ({ status }: { status: Tip["status"] }) => {
  if (status === "won") return <BadgeCheck className="w-3 h-3 text-emerald-400" />;
  if (status === "lost") return <BadgeX className="w-3 h-3 text-red-400" />;
  if (status === "draw" || status === "void") return <Minus className="w-3 h-3 text-amber-400" />;
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
        return date.toLocaleString("pl-PL", {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
      return cleanKickoff || "TBD";
    } catch {
      /* invalid date — fall back to the raw string */
    }
    return String(kickoffStr);
  }, []);

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl group ${locked ? "select-none" : ""} ${
        isLost ? "opacity-70" : ""
      }`}
    >
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
          isWon
            ? "bg-card border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
            : tip.isPremium
            ? "bg-card border border-pink-500/25 shadow-lg shadow-black/20 group-hover:-translate-y-0.5 group-hover:border-pink-500/40"
            : "bg-card border border-white/[0.08] shadow-lg shadow-black/20 group-hover:border-white/15 group-hover:-translate-y-0.5"
        }`}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${
          isWon ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent" :
          tip.isPremium
            ? "bg-gradient-to-r from-transparent via-pink-500/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/15 to-transparent"
        }`} />

        <div className="p-3.5 space-y-2.5">
          {/* Top row: badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <IconTargetReal size={17} className="flex-shrink-0 opacity-90" />
              {tip.isPremium && !isSettled && (
                <span className="bg-pink-500 text-white px-2.5 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                  <Gem className="w-2.5 h-2.5 fill-white" />
                  Premium
                </span>
              )}
              <Badge variant="sport" className="text-[10px] bg-white/[0.04] text-white/60 border-white/10 gap-1 inline-flex">
                <SportIcon sport={tip.sport} size={8} />
                {tip.sport}
              </Badge>
              <span className="text-[11px] text-white/55 font-medium truncate max-w-[120px]">{tip.league}</span>
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
                tip.isPremium ? "ring-1 ring-pink-500/25 bg-pink-500/5" : "ring-1 ring-white/10 bg-white/[0.03]"
              }`}>
                <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={26} sport={tip.sport} />
              </div>
              <span className="font-display font-bold text-foreground text-xs sm:text-sm leading-tight text-center truncate w-full">{tip.homeTeam}</span>
            </div>

            {/* VS + Odds center */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
              <span className="text-[10px] font-display font-semibold text-muted-foreground/50 uppercase tracking-widest">VS</span>
              <div className={`text-xl font-black font-display tabular-nums ${
                isWon ? "text-emerald-400" : "text-cyan-400"
              }`}>
                {tip.odds.toFixed(2)}
              </div>
            </div>

            {/* Away Team */}
            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
                isWon ? "ring-2 ring-emerald-500/30 bg-emerald-500/5" :
                tip.isPremium ? "ring-1 ring-pink-500/25 bg-pink-500/5" : "ring-1 ring-white/10 bg-white/[0.03]"
              }`}>
                <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={26} sport={tip.sport} />
              </div>
              <span className="font-display font-bold text-foreground text-xs sm:text-sm leading-tight text-center truncate w-full">{tip.awayTeam}</span>
            </div>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center justify-center gap-3 py-5 rounded-xl bg-pink-500/[0.06] border border-pink-500/20 cursor-pointer hover:border-pink-500/35 transition-all"
              >
                <div className="w-9 h-9 rounded-full bg-pink-500/10 flex items-center justify-center ring-1 ring-pink-500/20">
                  <Shield className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold text-pink-400">Unlock with Premium</p>
                  <p className="text-[11px] text-muted-foreground/70">Click to view plans</p>
                </div>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Prediction box */}
              <div className={`rounded-xl px-3 py-2.5 border ${
                isWon ? "bg-emerald-500/5 border-emerald-500/15" :
                tip.isPremium ? "bg-pink-500/5 border-pink-500/15" : "bg-white/[0.02] border-white/[0.06]"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.12em] mb-1 font-medium">Prediction</p>
                    <p className="font-display font-bold text-foreground text-sm">{tip.prediction}</p>
                  </div>
                  <Crosshair className={`w-5 h-5 ${
                    isWon ? "text-emerald-400" : tip.isPremium ? "text-pink-400/60" : "text-white/50"
                  }`} />
                </div>
              </div>

              {/* Analysis toggle */}
              {tip.description && (
                <>
                  <button 
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      tip.isPremium ? "text-pink-400/80 hover:text-pink-400" : "text-white/60 hover:text-pink-400"
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
                        <p className="text-[12px] text-white/65 leading-relaxed italic border-l-2 border-pink-500/25 pl-3 py-1">
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
            <Timer className="w-3 h-3 text-white/45" />
            <span className="text-[11px] text-white/55 font-medium">{formatKickoff(tip.kickoff)}</span>
            {tip.finalScore && (
              <span className="ml-auto text-[11px] font-display font-bold text-white/65 uppercase tracking-wider">
                FT {tip.finalScore}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(TipCard);
