import { ChevronDown, Lock } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import StatusTag, { PremiumTag } from "@/components/StatusTag";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, memo } from "react";
import { formatKickoff } from "@/lib/format";

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

const TeamRow = ({ name, logo, sport }: { name: string; logo?: string | null; sport: string }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <TeamLogo teamName={name} logoUrl={logo} size={22} sport={sport} />
    <span className="text-[15px] font-medium text-foreground truncate">{name}</span>
  </div>
);

const TipCard = ({ tip, userIsPremium = false }: { tip: Tip; userIsPremium?: boolean }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const isSettled = tip.status !== "upcoming";
  const isWon = tip.status === "won";
  const isLost = tip.status === "lost";
  const locked = tip.isPremium && !userIsPremium && !isSettled;

  const oddsColor = isWon ? "text-success" : isLost ? "text-muted-foreground line-through decoration-1" : "text-primary";

  return (
    <article
      className={`rounded-xl border bg-card transition-colors ${
        tip.isPremium && !isSettled ? "border-gold/25" : "border-border"
      } ${isLost ? "opacity-60" : ""}`}
    >
      {/* Meta */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <p className="eyebrow truncate">
          {tip.sport}
          {tip.league && <span className="text-muted-foreground/60"> · {tip.league}</span>}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {tip.isPremium && <PremiumTag />}
          <StatusTag status={tip.status} />
        </div>
      </div>

      {/* Teams */}
      <div className="px-4 pt-3 pb-3.5 space-y-2">
        <TeamRow name={tip.homeTeam} logo={tip.homeTeamLogo} sport={tip.sport} />
        <TeamRow name={tip.awayTeam} logo={tip.awayTeamLogo} sport={tip.sport} />
      </div>

      {/* Pick */}
      {locked ? (
        <Link
          to="/premium"
          className="flex items-center justify-between gap-3 mx-2 mb-2 rounded-lg bg-secondary/70 px-3 py-3 active:bg-secondary"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <Lock className="w-4 h-4 text-gold shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Premium pick</span>
              <span className="block text-xs text-muted-foreground">Unlock the prediction and odds</span>
            </span>
          </span>
          <span className="text-xs font-semibold text-gold shrink-0">See plans</span>
        </Link>
      ) : (
        <div className="flex items-end justify-between gap-3 mx-2 mb-2 rounded-lg bg-secondary/70 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground mb-0.5">Our pick</p>
            <p className="text-[15px] font-semibold text-foreground leading-snug">{tip.prediction}</p>
          </div>
          <p className={`num text-[26px] font-semibold leading-none ${oddsColor}`}>{tip.odds.toFixed(2)}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
        <span className="text-xs text-muted-foreground tabular-nums">{formatKickoff(tip.kickoff)}</span>
        {!locked && tip.description && (
          <button
            onClick={() => setShowAnalysis((v) => !v)}
            aria-expanded={showAnalysis}
            className="flex items-center gap-1 text-xs font-medium text-secondary-foreground hover:text-foreground"
          >
            {showAnalysis ? "Hide analysis" : "Analysis"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAnalysis ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {!locked && showAnalysis && tip.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-sm leading-relaxed text-secondary-foreground border-t border-border pt-3">
              {tip.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};

export default memo(TipCard);
