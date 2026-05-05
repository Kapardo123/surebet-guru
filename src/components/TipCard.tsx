import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Crown, Flame, ChevronDown, ChevronUp, ThumbsUp } from "lucide-react";
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
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  description?: string | null;
  fireCount?: number;
  likesCount?: number;
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
  const [localFire, setLocalFire] = useState(tip.fireCount || 0);
  const [localLikes, setLocalLikes] = useState(tip.likesCount || 0);
  const [reacted, setReacted] = useState<{fire: boolean, like: boolean}>({ fire: false, like: false });

  useEffect(() => {
    const saved = localStorage.getItem(`reaction_${tip.id}`);
    if (saved) setReacted(JSON.parse(saved));
  }, [tip.id]);

  const handleReaction = async (type: 'fire' | 'like') => {
    if (reacted[type]) return;

    const newReacted = { ...reacted, [type]: true };
    setReacted(newReacted);
    localStorage.setItem(`reaction_${tip.id}`, JSON.stringify(newReacted));

    if (type === 'fire') setLocalFire(prev => prev + 1);
    else setLocalLikes(prev => prev + 1);

    await incrementReaction(tip.id, type);
  };

  // Premium tips are locked ONLY if they are 'upcoming' and the user is NOT premium.
  // Once they are won/lost/draw, they are visible to everyone.
  const isSettled = tip.status !== "upcoming";
  const locked = tip.isPremium && !userIsPremium && !isSettled;

  const formatKickoff = (kickoffStr: string) => {
    try {
      if (!kickoffStr) return "TBD";
      
      // Handle case where [object Object] might have been saved in the string
      const cleanKickoff = String(kickoffStr).replace(/\[object Object\]/g, "").trim();
      
      // If it's an ISO string, format it to user's local time
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
    return String(kickoffStr); // Fallback to original string if not a date
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative overflow-hidden rounded-xl group ${locked ? "select-none" : ""}`}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div
        className={`relative rounded-xl bg-card border ${tip.isPremium ? 'border-accent/40 shadow-[0_0_20px_rgba(236,72,153,0.15)]' : 'border-border/50'} overflow-hidden transition-all duration-300 group-hover:border-primary/30 group-hover:-translate-y-0.5`}
        style={{ boxShadow: tip.isPremium ? "0 0 25px rgba(236,72,153,0.1)" : "var(--card-shadow)" }}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${tip.isPremium ? 'bg-gradient-to-r from-accent via-primary to-accent' : 'bg-gradient-to-r from-primary via-accent to-primary'}`} />

        {tip.isPremium && !isSettled && (
          <div className="absolute top-[2px] left-0 z-10">
            <div className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider rounded-br-xl flex items-center gap-1.5 shadow-lg">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {tip.isPremium && (
                <Badge variant="confidence" className="gap-1 py-0.5 px-2 shadow-sm border-accent/20">
                  <Crown className="w-3 h-3 animate-pulse" />
                  <span className="font-bold text-[9px] md:text-[10px]">PREMIUM</span>
                </Badge>
              )}
              <Badge variant="sport" className="text-[10px]">{tip.sport}</Badge>
              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[80px] md:max-w-none">{tip.league}</span>
            </div>
            <Badge variant={statusVariant[tip.status]} className="gap-1.5 shrink-0">
              {tip.isPremium && isSettled && <Crown className="w-3 h-3" />}
              <span className="whitespace-nowrap">{statusLabel[tip.status]}</span>
            </Badge>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={28} />
              </div>
              <span className="font-display font-bold text-foreground text-sm leading-tight">{tip.homeTeam}</span>
            </div>

            <div className="px-3">
              <span className="text-xs font-display font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">VS</span>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end text-right">
              <span className="font-display font-bold text-foreground text-sm leading-tight">{tip.awayTeam}</span>
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={28} />
              </div>
            </div>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex flex-col items-center justify-center py-8 gap-2.5 rounded-xl bg-gradient-to-b from-muted/60 to-muted/30 border border-border/50 cursor-pointer hover:border-accent/40 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-accent" />
                </div>
                <p className="font-display text-sm font-bold text-accent">Unlock with Premium</p>
                <p className="text-[11px] text-muted-foreground">Click to view plans</p>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Prediction & Odds */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3.5 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">Prediction</p>
                  <p className="font-display font-bold text-primary text-sm">{tip.prediction}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3.5 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">Odds</p>
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-accent" />
                    <p className="font-display font-bold text-accent text-lg leading-none">{tip.odds.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.preventDefault(); handleReaction('fire'); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${reacted.fire ? 'bg-orange-500/20 text-orange-500 ring-1 ring-orange-500/30' : 'bg-muted/50 text-muted-foreground hover:bg-orange-500/10 hover:text-orange-400'}`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${reacted.fire ? 'fill-orange-500' : ''}`} />
                    <span className="text-[11px] font-black">{localFire}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); handleReaction('like'); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all ${reacted.like ? 'bg-primary/20 text-primary ring-1 ring-primary/30' : 'bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${reacted.like ? 'fill-primary' : ''}`} />
                    <span className="text-[11px] font-black">{localLikes}</span>
                  </button>
                </div>

                {tip.description && (
                  <button 
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                  >
                    {showAnalysis ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                      <div className="mt-2 p-3.5 rounded-xl bg-accent/5 border border-accent/10">
                        <p className="text-xs text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                          "{tip.description}"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Footer */}
              <div className="flex items-center pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{formatKickoff(tip.kickoff)}</span>
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
