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

const TeamLine = ({ name, logo, sport }: { name: string; logo?: string | null; sport: string }) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="print shrink-0"><TeamLogo teamName={name} logoUrl={logo} size={18} sport={sport} /></span>
    <span className="font-display font-extrabold uppercase text-[23px] leading-[1.02] tracking-[0.005em] text-foreground truncate">
      {name}
    </span>
  </div>
);

const TipCard = ({ tip, userIsPremium = false, index }: { tip: Tip; userIsPremium?: boolean; index?: number }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const isSettled = tip.status !== "upcoming";
  const isLost = tip.status === "lost";
  const locked = tip.isPremium && !userIsPremium && !isSettled;

  return (
    <article className="relative py-4 grid grid-cols-[30px_1fr_auto] gap-x-3">
      {/* Running number */}
      <span className="num font-black text-[15px] leading-[1.6] text-muted-foreground">
        {index !== undefined ? String(index + 1).padStart(2, "0") : ""}
      </span>

      <div className={`min-w-0 ${isLost ? "opacity-55" : ""}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <p className="label truncate">
            {tip.league || tip.sport} <span className="text-foreground/40">/</span> {formatKickoff(tip.kickoff)}
          </p>
          {tip.isPremium && <PremiumTag className="shrink-0" />}
        </div>
        <TeamLine name={tip.homeTeam} logo={tip.homeTeamLogo} sport={tip.sport} />
        <TeamLine name={tip.awayTeam} logo={tip.awayTeamLogo} sport={tip.sport} />

        {locked ? (
          <Link to="/premium" className="mt-2 block">
            <span className="flex items-center gap-2">
              <span className="redact w-[58%] max-w-[190px]" />
              <span className="redact w-6" />
            </span>
            <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-red underline underline-offset-[3px] decoration-1">
              Members only, see rates
            </span>
          </Link>
        ) : (
          <p className="mt-1.5 font-serif italic text-[17px] leading-snug text-foreground">
            {tip.prediction}
          </p>
        )}

        {!locked && tip.description && (
          <>
            <button
              onClick={() => setShowAnalysis((v) => !v)}
              aria-expanded={showAnalysis}
              className="mt-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
            >
              {showAnalysis ? "Close analysis −" : "Read analysis +"}
            </button>
            <AnimatePresence initial={false}>
              {showAnalysis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="pt-2 font-serif text-[15.5px] leading-[1.55] text-secondary-foreground">
                    {tip.description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Odds column */}
      <div className="text-right pt-[18px] min-w-[54px]">
        {locked ? (
          <span className="num font-black text-[34px] leading-none text-foreground/20">?.??</span>
        ) : (
          <span
            className={`num font-black text-[34px] leading-none ${
              isLost ? "text-muted-foreground line-through decoration-2" : "text-foreground"
            }`}
          >
            {tip.odds.toFixed(2)}
          </span>
        )}
        {isSettled && (
          <div className="mt-2 flex justify-end">
            <StatusTag status={tip.status} />
          </div>
        )}
      </div>
    </article>
  );
};

export default memo(TipCard);
