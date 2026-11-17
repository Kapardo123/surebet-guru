import { Link } from "react-router-dom";
import { useState, memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, RotateCw } from "lucide-react";
import HoloCard from "@/components/HoloCard";
import SportGlyph from "@/components/SportGlyph";
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
/** Round odds medallion that overlaps the art, like a stat on a game card. */
const OddsMedal = ({ value, gold, struck }: { value: string; gold: boolean; struck?: boolean }) => (
  <span
    className={`grid place-items-center w-[54px] h-[54px] rounded-full p-[3px] shadow-[0_6px_14px_rgba(0,0,0,.45)] ${gold ? "foil-gold" : "bg-stock"}`}
  >
    <span className="w-full h-full rounded-full bg-[hsl(232_42%_12%)] grid place-items-center text-center leading-none">
      <span>
        <span className={`block num font-black text-[15px] ${gold ? "foil-gold-text" : "text-white"} ${struck ? "line-through opacity-60" : ""}`}>{value}</span>
        <span className="block text-[7.5px] font-bold uppercase tracking-[0.14em] text-white/55 mt-0.5">Odds</span>
      </span>
    </span>
  </span>
);

interface TipCardProps {
  tip: Tip;
  userIsPremium?: boolean;
  index?: number;
  total?: number;
  /** Open the full-screen inspector instead of flipping in place. */
  onInspect?: (tip: Tip) => void;
  /** Shared-element id so the card can fly into the inspector. */
  layoutId?: string;
  /** Keep the slot but hide the card (it is open in the inspector). */
  ghost?: boolean;
  /** Skip the deal-in animation. */
  still?: boolean;
  /** Controlled flip (inspector). */
  flipped?: boolean;
  /** Bought individually for $0.99. */
  unlocked?: boolean;
  /** Called when a locked Gold card is tapped (offer the single unlock). */
  onLockedTap?: (tip: Tip) => void;
  /** Price label for the single unlock, e.g. "$0.99". */
  unlockPrice?: string;
}

const TipCard = ({
  tip, userIsPremium = false, index, total, onInspect, layoutId, ghost, still, flipped: flippedProp,
  unlocked = false, onLockedTap, unlockPrice = "$0.99",
}: TipCardProps) => {
  const [flippedState, setFlipped] = useState(false);
  const flipped = flippedProp ?? flippedState;
  const reduce = useReducedMotion();

  const isSettled = tip.status !== "upcoming";
  const isLost = tip.status === "lost";
  const locked = tip.isPremium && !userIsPremium && !unlocked && !isSettled;
  const owned = tip.isPremium && !userIsPremium && unlocked;
  const ko = kickoffParts(tip.kickoff);
  const theme = sportTheme(tip.sport);
  const canFlip = !locked && !!tip.description;
  const no = index !== undefined ? String(index + 1).padStart(2, "0") : "";
  const of = total ? String(total).padStart(2, "0") : "";
  // Shrink long names so most fit on one line before truncating.
  const nameSize = (n: string) => (n.length > 15 ? "text-[10px]" : n.length > 11 ? "text-[11px]" : "text-[12.5px]");

  const frame = tip.isPremium ? "foil-gold" : "";
  const frameStyle = tip.isPremium ? undefined : { background: theme.frame };

  const front = (
    <div
      className={`flip-face [grid-area:1/1] rounded-[16px] p-[5px] bevel ${frame}`}
      style={frameStyle}
    >
      <div
        className={`h-full rounded-[12px] text-stock-ink overflow-hidden flex flex-col shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)] ${tip.isPremium ? "bg-[linear-gradient(170deg,hsl(44_70%_92%),hsl(40_45%_88%))]" : "paper bg-stock"} ${isLost ? "grayscale-[.85] opacity-80" : ""}`}
      >
        {/* Title bar */}
        <div className="flex items-center gap-1.5 px-2.5 h-8">
          <span
            className="grid place-items-center w-5 h-5 rounded-full text-white shrink-0"
            style={{ background: tip.isPremium ? "linear-gradient(135deg,#b98a2a,#f6dc8a)" : theme.frame }}
          >
            <SportGlyph sport={tip.sport} size={12} />
          </span>
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] truncate">{tip.sport}</span>
        </div>

        <div className="relative mx-1.5">
          <CardArt
            sport={tip.sport}
            home={tip.homeTeam}
            away={tip.awayTeam}
            homeLogo={tip.homeTeamLogo}
            awayLogo={tip.awayTeamLogo}
            size={26}
            holo={!!tip.isPremium && !locked}
            className="h-[88px] rounded-[8px]"
          />
          <span className="absolute -bottom-6 right-1.5 z-10">
            <OddsMedal value={locked ? "?.??" : tip.odds.toFixed(2)} gold={!!tip.isPremium} struck={isLost} />
          </span>
          {isSettled && <StatusTag status={tip.status} className="absolute -top-2 -left-1 z-10" />}
          {owned && !isSettled && (
            <span className="absolute top-1.5 left-1.5 z-10 h-5 px-2 rounded-full foil-gold text-stock-ink text-[9.5px] font-black uppercase tracking-[0.12em] grid place-items-center shadow">
              Owned
            </span>
          )}
        </div>

        {/* Name plate */}
        <div className="px-2.5 pt-2">
          <p className={`font-display font-extrabold uppercase leading-[1.2] tracking-[-0.01em] truncate pr-[58px] ${nameSize(tip.homeTeam)}`} title={tip.homeTeam}>
            {tip.homeTeam}
          </p>
          <p className={`font-display font-extrabold uppercase leading-[1.2] tracking-[-0.01em] truncate opacity-55 ${nameSize(tip.awayTeam)}`} title={tip.awayTeam}>
            {tip.awayTeam}
          </p>
        </div>
        <p className="px-2.5 text-[11px] font-medium opacity-60 truncate mt-1">{tip.league}</p>

        {/* Pick */}
        <div
          className="mx-2 mt-2 rounded-[8px] px-2 py-1.5 flex-1"
          style={{ background: tip.isPremium ? "hsl(40 60% 50% / .14)" : `hsl(${theme.hue} 50% 40% / .10)` }}
        >
          <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] opacity-55">Pick</p>
          {locked ? (
            <span className="block mt-1 mb-0.5 redact w-[85%] h-[1.05em]" />
          ) : (
            <p className="text-[14px] font-semibold leading-snug">{tip.prediction}</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-1.5 flex items-center justify-between px-2.5 pb-2 text-[11px]">
          <span className="font-semibold tabular-nums">
            {ko.time} <span className="font-medium opacity-55">{ko.day}</span>
          </span>
          <span className="flex items-center gap-1 font-display font-bold text-[9.5px] opacity-50">
            <span className={tip.isPremium ? "text-[#b98a2a] opacity-100" : ""}>{tip.isPremium ? "◆" : "●"}</span>
            {no}{of && `/${of}`}
          </span>
        </div>

        {canFlip && (
          <div className="flex items-center justify-center gap-1 h-6 bg-stock-ink/[0.06] text-[10px] font-bold uppercase tracking-[0.12em] opacity-70">
            <RotateCw className="w-3 h-3" /> {onInspect ? "Tap to inspect" : "Tap for analysis"}
          </div>
        )}
        {locked && (
          <div className="relative flex items-center justify-between h-8 pl-2.5 pr-1 foil-gold text-stock-ink">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em]">
              <Lock className="w-3 h-3" /> Unlock
            </span>
            {/* Price sticker */}
            <span className="relative h-6 pl-3 pr-2 rounded-[6px] bg-[hsl(232_42%_12%)] text-white num font-black text-[12px] grid place-items-center -rotate-3 shadow-[0_3px_8px_rgba(0,0,0,.35)]">
              <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[hsl(42_45%_90%)]" />
              {unlockPrice}
            </span>
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
    <div className={`flip-inner grid grid-cols-[minmax(0,1fr)] h-full ${flipped ? "is-flipped" : ""}`}>
      {front}
      {back}
    </div>
  );

  const wrap = (node: React.ReactNode) => (
    <motion.div layoutId={ghost ? undefined : layoutId} className={ghost ? "invisible" : ""}>
      {node}
    </motion.div>
  );

  const deal = (node: React.ReactNode) =>
    reduce || still ? (
      wrap(node)
    ) : (
      <motion.div
        initial={{ opacity: 0, y: 36, rotate: (index ?? 0) % 2 ? 5 : -5, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 170, damping: 18, delay: Math.min(index ?? 0, 8) * 0.06 }}
      >
        {wrap(node)}
      </motion.div>
    );

  if (locked) {
    const inner = (
      <HoloCard holo={false} maxTilt={6}>
        <div className="foil-shimmer rounded-[16px]">{body}</div>
      </HoloCard>
    );
    const label = `Gold card: ${tip.homeTeam} v ${tip.awayTeam}. Unlock for ${unlockPrice}`;
    return deal(
      onLockedTap ? (
        <button type="button" onClick={() => onLockedTap(tip)} aria-label={label} className="flip-scene block w-full text-left active:scale-[0.98] transition-transform">
          {inner}
        </button>
      ) : (
        <Link to="/premium" aria-label={label} className="flip-scene block active:scale-[0.98] transition-transform">
          {inner}
        </Link>
      )
    );
  }

  return deal(
    <button
      type="button"
      onClick={() => (onInspect ? onInspect(tip) : canFlip && setFlipped((f) => !f))}
      aria-pressed={!onInspect && canFlip ? flipped : undefined}
      aria-label={onInspect ? `Open card: ${tip.homeTeam} v ${tip.awayTeam}` : canFlip ? (flipped ? "Show card front" : "Show analysis") : undefined}
      className={`flip-scene block w-full text-left ${onInspect || canFlip ? "active:scale-[0.98] transition-transform" : "cursor-default"}`}
    >
      <HoloCard holo={false} maxTilt={6}>{body}</HoloCard>
    </button>
  );
};

export default memo(TipCard);
