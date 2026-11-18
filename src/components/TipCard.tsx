import { Link } from "react-router-dom";
import { useState, memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock3, Crosshair, Lock, RotateCw } from "lucide-react";
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
  /** Server withheld the pick/odds (viewer isn't entitled). */
  masked?: boolean;
}

/**
 * A tip as a collector card. Free = cream stock in the sport's colour,
 * members' = gold foil frame. Tap to flip for the analysis.
 */
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
  const locked = (tip.isPremium && !userIsPremium && !unlocked && !isSettled) || !!tip.masked;
  const owned = tip.isPremium && !userIsPremium && unlocked;
  const ko = kickoffParts(tip.kickoff);
  const theme = sportTheme(tip.sport);
  const canFlip = !locked && !!tip.description;
  const no = index !== undefined ? String(index + 1).padStart(2, "0") : "";
  const of = total ? String(total).padStart(2, "0") : "";
  // Shrink long names so most fit on one line before truncating.
  const nameSize = (n: string) => (n.length > 15 ? "text-[10px]" : n.length > 11 ? "text-[11px]" : "text-[12.5px]");

  const gold = !!tip.isPremium;
  // Common frames: the sport colour as a brushed, bevelled metal; Gold: foil.
  const frameStyle = gold
    ? undefined
    : {
        backgroundColor: theme.frame,
        backgroundImage: `linear-gradient(145deg, hsl(${theme.hue} 60% 62% / .9), transparent 38%, transparent 62%, hsl(${theme.hue} 60% 18% / .85)), repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 1px, transparent 1px 4px)`,
      };
  const frame = gold ? "foil-gold" : "";
  const oddsText = locked ? "?.??" : tip.odds.toFixed(2);

  const front = (
    <div
      className={`card-sheen flip-face [grid-area:1/1] rounded-[16px] p-[5px] bevel ${gold ? "foil-gold foil-weave" : ""} ${
        tip.status === "won" ? "shadow-[0_0_0_1px_hsl(var(--gold)/.6),0_0_26px_-4px_hsl(var(--gold)/.75),0_12px_26px_-12px_rgba(0,0,0,.75)]" : ""
      }`}
      style={frameStyle}
    >
      <div
        className={`relative h-full rounded-[12px] text-stock-ink overflow-hidden flex flex-col ${gold ? "bg-[linear-gradient(170deg,hsl(44_70%_93%),hsl(40_45%_87%))]" : "paper bg-stock"} ${isLost ? "grayscale-[.85] opacity-80" : ""}`}
      >
        {/* Thin printed keyline inside the frame */}
        <span className={`pointer-events-none absolute inset-[3px] rounded-[9px] border ${gold ? "border-[#b98a2a]/45" : "border-stock-ink/12"}`} aria-hidden />

        {/* Title bar: sport on the left, odds as the headline stat */}
        <div className="relative flex items-center gap-1.5 pl-2.5 pr-2 h-9">
          <span
            className="grid place-items-center w-5 h-5 rounded-full text-white shrink-0 shadow-[inset_0_-1px_0_rgba(0,0,0,.25)]"
            style={{ background: gold ? "linear-gradient(135deg,#b98a2a,#f6dc8a)" : theme.frame }}
          >
            <SportGlyph sport={tip.sport} size={12} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] truncate min-w-0 flex-1">{tip.sport}</span>
          <span className="shrink-0 flex flex-col items-end leading-none">
            <span className="text-[7px] font-black uppercase tracking-[0.14em] opacity-50 mb-0.5">Odds</span>
            <span
              className={`num font-black text-[19px] leading-none ${gold ? "foil-gold-text" : ""} ${isLost ? "line-through decoration-2 opacity-60" : ""}`}
              style={gold ? { WebkitTextStroke: "0.3px #6b4a0e" } : undefined}
            >
              {oddsText}
            </span>
          </span>
        </div>

        {/* Art window */}
        <div className="relative mx-[7px]">
          <CardArt
            sport={tip.sport}
            home={tip.homeTeam}
            away={tip.awayTeam}
            homeLogo={tip.homeTeamLogo}
            awayLogo={tip.awayTeamLogo}
            size={26}
            holo={gold && !locked}
            className="h-[94px] rounded-[7px] ring-[1.5px] ring-black/20 shadow-[inset_0_2px_6px_rgba(0,0,0,.35)]"
          />
          {/* glass gloss + stamped set mark */}
          <span className="pointer-events-none absolute inset-0 rounded-[7px] bg-[linear-gradient(160deg,rgba(255,255,255,.28),transparent_38%)]" aria-hidden />
          <span className="pointer-events-none absolute left-1.5 top-1 font-display font-black text-[7px] tracking-[0.1em] text-white/70 drop-shadow" aria-hidden>
            GSB
          </span>
          {isSettled && <StatusTag status={tip.status} className="absolute -top-2 -right-1 z-10 scale-[.85] origin-top-right" />}
          {owned && !isSettled && (
            <span className="absolute top-1.5 left-1.5 z-10 h-5 px-2 rounded-full foil-gold text-stock-ink text-[9.5px] font-black uppercase tracking-[0.12em] grid place-items-center shadow">
              Owned
            </span>
          )}
        </div>

        {/* Name banner, notched like a ribbon, overlapping the art */}
        <div className="relative -mt-2.5 mx-1 z-[1]">
          <div
            className={`px-3 py-1.5 text-center shadow-[0_3px_6px_rgba(0,0,0,.25)] ${gold ? "bg-[linear-gradient(180deg,#2a2f55,#161a33)]" : "bg-[linear-gradient(180deg,hsl(232_32%_20%),hsl(232_38%_12%))]"}`}
            style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%, 6px 50%)" }}
          >
            <p className={`font-display font-extrabold uppercase leading-[1.15] tracking-[-0.01em] truncate text-white ${nameSize(tip.homeTeam)}`} title={tip.homeTeam}>
              {tip.homeTeam}
            </p>
            <p className={`font-display font-extrabold uppercase leading-[1.15] tracking-[-0.01em] truncate ${gold ? "text-[#e7c35e]" : "text-white/60"} ${nameSize(tip.awayTeam)}`} title={tip.awayTeam}>
              {tip.awayTeam}
            </p>
          </div>
        </div>
        <p className="px-2.5 text-[10.5px] font-medium opacity-60 truncate mt-1.5 text-center">{tip.league}</p>

        {/* Pick, set like an ability box */}
        <div
          className="relative mx-2 mt-1.5 rounded-[8px] pl-3 pr-2 py-1.5 flex-1 overflow-hidden"
          style={{ background: gold ? "hsl(40 60% 50% / .14)" : `hsl(${theme.hue} 50% 40% / .10)` }}
        >
          <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: gold ? "linear-gradient(#b98a2a,#f6dc8a)" : theme.frame }} aria-hidden />
          <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] opacity-55">
            <Crosshair className="w-2.5 h-2.5" /> Pick
          </p>
          {locked ? (
            <span className="block mt-1 mb-0.5 redact w-[85%] h-[1.05em]" />
          ) : (
            <p className="text-[14px] font-semibold leading-snug">{tip.prediction}</p>
          )}
        </div>

        {/* Footer: kick-off, set symbol, card number */}
        <div className="mt-1.5 flex items-center justify-between px-2.5 pb-2 text-[10.5px]">
          <span className="flex items-center gap-1 font-semibold tabular-nums whitespace-nowrap min-w-0">
            <Clock3 className="w-3 h-3 opacity-50" />
            {ko.time} <span className="font-medium opacity-55">{ko.day}</span>
          </span>
          <span className="flex items-center gap-1 font-display font-bold text-[9px] opacity-55 whitespace-nowrap">
            <span
              className="w-2 h-2 rotate-45 rounded-[1px]"
              style={{ background: gold ? "linear-gradient(135deg,#b98a2a,#fff1b8)" : "currentColor", opacity: gold ? 1 : 0.6 }}
              aria-label={gold ? "Gold" : "Common"}
            />
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
        <button type="button" onClick={() => onLockedTap(tip)} aria-label={label} className="flip-scene block w-full text-left rounded-[16px] active:scale-[0.98] transition-transform duration-200 md:hover:-translate-y-1.5 md:hover:drop-shadow-[0_18px_24px_hsl(var(--gold)/.35)]">
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
      className={`flip-scene block w-full text-left rounded-[16px] ${onInspect || canFlip ? "active:scale-[0.98] transition-transform duration-200 md:hover:-translate-y-1.5 md:hover:drop-shadow-[0_18px_24px_rgba(0,0,0,.45)]" : "cursor-default"}`}
    >
      <HoloCard holo={false} maxTilt={6}>{body}</HoloCard>
    </button>
  );
};

export default memo(TipCard);
