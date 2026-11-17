import { Link } from "react-router-dom";
import { useState, memo } from "react";
import { Lock, RotateCw } from "lucide-react";
import StatusTag from "@/components/StatusTag";
import CardArt from "@/components/CardArt";
import { kickoffParts } from "@/lib/format";
import { sportTheme } from "@/lib/sport";

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

/**
 * A tip as a collector card. Free = cream stock in the sport's colour,
 * members' = gold foil frame. Tap to flip for the analysis.
 */
const TipCard = ({ tip, userIsPremium = false, index }: { tip: Tip; userIsPremium?: boolean; index?: number }) => {
  const [flipped, setFlipped] = useState(false);

  const isSettled = tip.status !== "upcoming";
  const isLost = tip.status === "lost";
  const locked = tip.isPremium && !userIsPremium && !isSettled;
  const ko = kickoffParts(tip.kickoff);
  const theme = sportTheme(tip.sport);
  const canFlip = !locked && !!tip.description;
  const no = index !== undefined ? String(index + 1).padStart(2, "0") : "";

  const frame = tip.isPremium ? "foil-gold" : "";
  const frameStyle = tip.isPremium ? undefined : { background: theme.frame };

  const front = (
    <div
      className={`flip-face [grid-area:1/1] rounded-[16px] p-[5px] shadow-[0_10px_24px_-10px_rgba(0,0,0,.7)] ${frame}`}
      style={frameStyle}
    >
      <div className={`h-full rounded-[12px] bg-stock text-stock-ink overflow-hidden flex flex-col ${isLost ? "grayscale-[.85] opacity-80" : ""}`}>
        {/* Title bar */}
        <div className="flex items-center justify-between gap-2 px-2.5 h-7">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.1em] truncate">{tip.sport}</span>
          <span className="font-display text-[10px] font-bold opacity-50 shrink-0">{tip.isPremium ? "GOLD" : "#"}{no && ` ${no}`}</span>
        </div>

        <div className="relative mx-1.5">
          <CardArt sport={tip.sport} home={tip.homeTeam} away={tip.awayTeam} homeLogo={tip.homeTeamLogo} awayLogo={tip.awayTeamLogo} size={30} className="h-[92px] rounded-[8px]" />
          {isSettled && <StatusTag status={tip.status} className="absolute -top-2 -right-1" />}
        </div>

        {/* Name plate */}
        <div className="px-2.5 pt-2">
          <p className="font-display font-extrabold uppercase text-[12.5px] leading-[1.15] tracking-[-0.01em] line-clamp-2">
            {tip.homeTeam} <span className="opacity-40">v</span> {tip.awayTeam}
          </p>
          <p className="text-[11px] font-medium opacity-60 truncate mt-0.5">{tip.league}</p>
        </div>

        {/* Pick */}
        <div className="mx-2.5 mt-2 pt-2 border-t-[1.5px] border-dashed border-stock-ink/20 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-50">Pick</p>
          {locked ? (
            <span className="block mt-1 redact w-[85%] h-[1.1em]" />
          ) : (
            <p className="text-[14px] font-semibold leading-snug mt-0.5">{tip.prediction}</p>
          )}
        </div>

        {/* Stat bar */}
        <div className="mt-2 flex items-end justify-between px-2.5 pb-2.5">
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] opacity-50">Odds</p>
            <p className={`num font-black text-[26px] leading-none ${isLost ? "line-through decoration-2 opacity-60" : ""}`}>
              {locked ? "?.??" : tip.odds.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="num font-bold text-[14px] leading-none">{ko.time}</p>
            <p className="text-[10.5px] font-medium opacity-60 mt-0.5">{ko.day}</p>
          </div>
        </div>

        {canFlip && (
          <div className="flex items-center justify-center gap-1 h-6 bg-stock-ink/[0.06] text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
            <RotateCw className="w-3 h-3" /> Tap for analysis
          </div>
        )}
        {locked && (
          <div className="flex items-center justify-center gap-1.5 h-7 foil-gold text-stock-ink text-[10.5px] font-bold uppercase tracking-[0.1em]">
            <Lock className="w-3 h-3" /> Members' card
          </div>
        )}
      </div>
    </div>
  );

  const back = canFlip ? (
    <div
      className={`flip-face flip-back [grid-area:1/1] rounded-[16px] p-[5px] ${frame}`}
      style={frameStyle}
    >
      <div className="h-full rounded-[12px] card-back text-foreground p-3 flex flex-col">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">The read</p>
        <p className="font-display font-extrabold uppercase text-[12px] leading-tight mt-1 line-clamp-2">
          {tip.homeTeam} v {tip.awayTeam}
        </p>
        <p className="mt-2 text-[13px] leading-[1.45] text-foreground/85 overflow-y-auto flex-1 pr-1">{tip.description}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/50 flex items-center gap-1">
          <RotateCw className="w-3 h-3" /> Tap to turn back
        </p>
      </div>
    </div>
  ) : null;

  const body = (
    <div className={`flip-inner grid h-full ${flipped ? "is-flipped" : ""}`}>
      {front}
      {back}
    </div>
  );

  if (locked) {
    return (
      <Link to="/premium" className="flip-scene block active:scale-[0.98] transition-transform" aria-label={`Members' card: ${tip.homeTeam} v ${tip.awayTeam}`}>
        <div className="foil-shimmer rounded-[16px]">{body}</div>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => canFlip && setFlipped((f) => !f)}
      aria-pressed={canFlip ? flipped : undefined}
      aria-label={canFlip ? (flipped ? "Show card front" : "Show analysis") : undefined}
      className={`flip-scene block w-full text-left ${canFlip ? "active:scale-[0.98] transition-transform" : "cursor-default"}`}
    >
      {body}
    </button>
  );
};

export default memo(TipCard);
