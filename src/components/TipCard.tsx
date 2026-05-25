import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Crown, ChevronDown, ChevronUp, ThumbsUp, TrendingUp, Sparkles } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { incrementReaction } from "@/lib/tipsStorage";

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
  likesCount?: number;
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
  won: "Won ✓",
  lost: "Lost ✗",
  draw: "Draw",
};


const TipCard = ({ tip, userIsPremium = false }: { tip: Tip; userIsPremium?: boolean }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [localLikes, setLocalLikes] = useState(tip.likesCount || 0);
  const [reacted, setReacted] = useState(false);

  useEffect(() => {
    if (!tip?.id) return;

    const saved = localStorage.getItem(`reaction_${tip.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReacted(typeof parsed === 'object' ? !!parsed.like : !!parsed);
      } catch (e) {
        setReacted(!!saved);
      }
    } else {
      setReacted(false);
    }
    
    const serverLikes = tip.likesCount || 0;
    setLocalLikes(prev => (serverLikes > prev ? serverLikes : prev));
  }, [tip.id, tip.likesCount]);

  const handleReaction = async () => {
    if (reacted) return;

    setReacted(true);
    localStorage.setItem(`reaction_${tip.id}`, JSON.stringify(true));
    setLocalLikes(prev => prev + 1);

    await incrementReaction(tip.id, 'like');
  };

  const isSettled = tip.status !== "upcoming";
  const locked = tip.isPremium && !userIsPremium && !isSettled;

  const formatKickoff = (kickoffStr: string) => {
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
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative overflow-hidden rounded-2xl group ${locked ? "select-none" : ""}`}
    >
      {/* Synthwave glow effect */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
        tip.isPremium 
          ? 'bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-transparent' 
          : 'bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-transparent'
      }`} />

      <div
        className={`relative rounded-2xl backdrop-blur-sm overflow-hidden transition-all duration-300 ${
          tip.isPremium 
            ? 'bg-gradient-to-br from-card via-pink-950/5 to-purple-950/10 border border-pink-500/30 shadow-xl shadow-pink-500/10 group-hover:shadow-pink-500/20 group-hover:-translate-y-1'
            : 'bg-gradient-to-br from-card via-purple-950/5 to-background border border-border/40 shadow-lg shadow-black/5 group-hover:border-purple-500/30 group-hover:-translate-y-1'
        }`}
      >
        {/* Top gradient line */}
        <div className={`h-[3px] w-full ${
          tip.isPremium 
            ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500' 
            : 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500'
        }`} />

        <div className="p-4 md:p-5 space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {tip.isPremium && !isSettled && (
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-2 md:px-2.5 py-0.5 md:py-1 text-[9px] md:text-[10px] font-display font-bold uppercase tracking-wider rounded-full flex items-center gap-1 md:gap-1.5 shadow-lg shadow-pink-500/40">
                  <Crown className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span>Premium</span>
                </div>
              )}
              <Badge variant="sport" className="text-[9px] md:text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">{tip.sport}</Badge>
              <span className="text-[10px] md:text-[11px] text-muted-foreground font-medium truncate max-w-[90px] sm:max-w-[130px] md:max-w-none">{tip.league}</span>
            </div>
            <Badge variant={statusVariant[tip.status]} className="gap-1 shrink-0 text-[10px] px-2 py-0.5">
              {tip.isPremium && isSettled && <Crown className="w-2.5 h-2.5" />}
              <span className="whitespace-nowrap text-[10px]">{statusLabel[tip.status]}</span>
            </Badge>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between py-2 md:py-3 px-0.5">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                tip.isPremium ? 'ring-2 ring-pink-500/30 bg-pink-500/5' : 'ring-2 ring-purple-500/30 bg-purple-500/5'
              }`}>
                <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={28} />
              </div>
              <span className="font-display font-bold text-foreground text-sm md:text-base leading-tight truncate">{tip.homeTeam}</span>
            </div>

            <div className="px-2 md:px-4 flex-shrink-0">
              <span className="text-[11px] md:text-xs font-display font-bold text-muted-foreground bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-border/30">VS</span>
            </div>

            <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end text-right min-w-0">
              <span className="font-display font-bold text-foreground text-sm md:text-base leading-tight truncate">{tip.awayTeam}</span>
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                tip.isPremium ? 'ring-2 ring-pink-500/30 bg-pink-500/5' : 'ring-2 ring-purple-500/30 bg-purple-500/5'
              }`}>
                <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={28} />
              </div>
            </div>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center py-8 md:py-10 gap-2.5 md:gap-3 rounded-xl bg-gradient-to-b from-pink-500/10 to-purple-900/10 border border-pink-500/20 cursor-pointer hover:border-pink-500/40 transition-all"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 flex items-center justify-center ring-2 ring-pink-500/30">
                  <Lock className="w-6 h-6 md:w-7 md:h-7 text-pink-400" />
                </div>
                <p className="font-display text-xs md:text-sm font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Unlock with Premium</p>
                <p className="text-[10px] md:text-[11px] text-muted-foreground">Click to view plans</p>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Prediction & Odds */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className={`rounded-xl p-3 md:p-4 border transition-all hover:scale-[1.02] ${
                  tip.isPremium 
                    ? 'bg-pink-500/5 border-pink-500/20' 
                    : 'bg-purple-500/5 border-purple-500/20'
                }`}>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5 md:mb-2 font-medium">Prediction</p>
                  <p className="font-display font-bold text-foreground text-xs md:text-sm">{tip.prediction}</p>
                </div>
                <div className={`rounded-xl p-3 md:p-4 border transition-all hover:scale-[1.02] ${
                  tip.isPremium 
                    ? 'bg-pink-500/5 border-pink-500/20' 
                    : 'bg-purple-500/5 border-purple-500/20'
                }`}>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5 md:mb-2 font-medium">Odds</p>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <TrendingUp className={`w-4 h-4 md:w-5 md:h-5 ${tip.isPremium ? 'text-pink-400' : 'text-purple-400'}`} />
                    <p className={`font-display font-bold text-lg md:text-xl leading-none ${tip.isPremium ? 'text-pink-400' : 'text-purple-400'}`}>{tip.odds.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 md:gap-4 py-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.preventDefault(); handleReaction(); }}
                    className={`group relative flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-full transition-all duration-300 ${
                      reacted 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25' 
                        : 'bg-muted/50 text-muted-foreground hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 hover:text-purple-400 hover:scale-105 active:scale-95 border border-border/30'
                    }`}
                  >
                    <motion.div
                      animate={reacted ? { scale: [1, 1.4, 1], rotate: [0, -20, 0] } : {}}
                      transition={{ duration: 0.45, ease: "backOut" }}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 md:w-4 md:h-4 ${reacted ? 'fill-white' : 'group-hover:fill-purple-400'}`} />
                    </motion.div>
                    <span className="text-[11px] md:text-[12px] font-black tracking-tight">{localLikes}</span>
                    
                    {reacted && (
                      <motion.span
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -20 }}
                        className="absolute top-0 left-1/2 -translate-x-1/2 text-white font-bold text-xs pointer-events-none"
                      >
                        +1
                      </motion.span>
                    )}
                  </button>
                </div>

                {tip.description && (
                  <button 
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className={`flex items-center gap-1.5 text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      tip.isPremium ? 'text-pink-400 hover:text-pink-300' : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    {showAnalysis ? <ChevronUp className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <ChevronDown className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                    {showAnalysis ? "Hide" : "Analysis"}
                  </button>
                )}
              </div>

              {/* Analysis / Description Toggle */}
              {tip.description && (
                <AnimatePresence>
                  {showAnalysis && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className={`mt-2 p-3 md:p-4 rounded-xl border ${
                        tip.isPremium 
                          ? 'bg-pink-500/5 border-pink-500/20' 
                          : 'bg-purple-500/5 border-purple-500/20'
                      }`}>
                        <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                          "{tip.description}"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Footer */}
              <div className="flex items-center pt-2 md:pt-3 border-t border-border/20">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Clock className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                  <span className="text-[10px] md:text-[11px] text-muted-foreground font-medium">{formatKickoff(tip.kickoff)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TipCard;
