import TeamLogo from "@/components/TeamLogo";
import StatusTag, { PremiumTag } from "@/components/StatusTag";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState, memo } from "react";
import { kickoffParts } from "@/lib/format";
import { PenCircle, PenNote, PenTick } from "@/components/RedPen";

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
    <span className="print shrink-0"><TeamLogo teamName={name} logoUrl={logo} size={20} sport={sport} /></span>
    <span className="font-display font-extrabold uppercase text-[25px] leading-[1.02] tracking-[0.005em] text-foreground truncate">
      {name}
    </span>
  </div>
);

const TipCard = ({ tip, userIsPremium = false }: { tip: Tip; userIsPremium?: boolean; index?: number }) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const isSettled = tip.status !== "upcoming";
  const isLost = tip.status === "lost";
  const locked = tip.isPremium && !userIsPremium && !isSettled;
  const ko = kickoffParts(tip.kickoff);
  const minsToKo = (new Date(tip.kickoff).getTime() - Date.now()) / 60000;
  const startsSoon = tip.status === "upcoming" && minsToKo > 0 && minsToKo <= 90;

  return (
    <article className="relative py-4 grid grid-cols-[52px_1fr_auto] gap-x-3">
      {/* Kick-off, like a race card */}
      <div className={`pt-0.5 ${isLost ? "opacity-55" : ""}`}>
        {startsSoon ? (
          <PenCircle delay={0.2}>
            <p className="num font-black text-[22px] leading-none text-foreground">{ko.time}</p>
          </PenCircle>
        ) : (
          <p className="num font-black text-[22px] leading-none text-foreground">{ko.time}</p>
        )}
        <p className="font-mono text-[11px] uppercase tracking-[0.04em] text-muted-foreground mt-1">{ko.day}</p>
        {startsSoon && (
          <PenNote delay={0.7} rotate={-8} className="mt-1 text-[30px]">soon!</PenNote>
        )}
      </div>

      <div className={`min-w-0 ${isLost ? "opacity-55" : ""}`}>
        <div className="flex items-center gap-2 mb-1.5 min-w-0">
          <p className="label truncate">{tip.league || tip.sport}</p>
          {tip.isPremium && <PremiumTag className="shrink-0" />}
        </div>
        <TeamLine name={tip.homeTeam} logo={tip.homeTeamLogo} sport={tip.sport} />
        <TeamLine name={tip.awayTeam} logo={tip.awayTeamLogo} sport={tip.sport} />

        <div className="mt-2.5 border-l-[3px] border-red pl-2.5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-red">Our pick</p>
          {locked ? (
            <Link to="/premium" className="block mt-1">
              <span className="flex items-center gap-2">
                <span className="redact w-[62%] max-w-[200px] h-[1.15em]" />
                <span className="redact w-7 h-[1.15em]" />
              </span>
              <span className="mt-1.5 inline-block font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground underline decoration-red decoration-2 underline-offset-4">
                Members only · see rates →
              </span>
            </Link>
          ) : (
            <p className="mt-0.5 font-serif font-semibold text-[19px] leading-snug text-foreground">{tip.prediction}</p>
          )}
        </div>

        {!locked && tip.description && (
          <>
            <button
              onClick={() => setShowAnalysis((v) => !v)}
              aria-expanded={showAnalysis}
              className="mt-2.5 h-8 font-mono text-[12px] font-medium uppercase tracking-[0.06em] text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
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
                  <p className="pt-1 font-serif text-[17px] leading-[1.55] text-foreground">{tip.description}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Odds column */}
      <div className="text-right pt-[20px] min-w-[58px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground mb-1">Odds</p>
        {locked ? (
          <span className="num font-black text-[36px] leading-none text-foreground/20">?.??</span>
        ) : (
          <span
            className={`num font-black text-[36px] leading-none ${
              isLost ? "text-muted-foreground line-through decoration-2" : "text-foreground"
            }`}
          >
            {tip.odds.toFixed(2)}
          </span>
        )}
        {isSettled && (
          <div className="mt-2.5 flex items-center justify-end gap-0.5">
            {tip.status === "won" && <PenTick delay={0.45} size={26} />}
            <StatusTag status={tip.status} />
          </div>
        )}
      </div>
    </article>
  );
};

export default memo(TipCard);
