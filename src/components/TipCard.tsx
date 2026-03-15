import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Crown, Flame } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

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
  const locked = tip.isPremium && !userIsPremium;

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
        className="relative rounded-xl bg-card border border-border/50 overflow-hidden transition-all duration-300 group-hover:border-primary/30 group-hover:-translate-y-0.5"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-primary via-accent to-primary" />

        {tip.isPremium && (
          <div className="absolute top-[2px] right-0 z-10">
            <div className="bg-gradient-to-l from-accent to-accent/80 text-accent-foreground px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1.5 shadow-lg">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="sport" className="text-[10px]">{tip.sport}</Badge>
              <span className="text-[11px] text-muted-foreground font-medium">{tip.league}</span>
            </div>
            <Badge variant={statusVariant[tip.status]}>
              {statusLabel[tip.status]}
            </Badge>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                <TeamLogo teamName={tip.homeTeam} size={28} />
              </div>
              <span className="font-display font-bold text-foreground text-sm leading-tight">{tip.homeTeam}</span>
            </div>

            <div className="px-3">
              <span className="text-xs font-display font-bold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">VS</span>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end text-right">
              <span className="font-display font-bold text-foreground text-sm leading-tight">{tip.awayTeam}</span>
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                <TeamLogo teamName={tip.awayTeam} size={28} />
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

              {/* Footer */}
              <div className="flex items-center pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{tip.kickoff}</span>
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
