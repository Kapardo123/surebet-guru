import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Tip } from "@/components/TipCard";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Minus, Clock, Shield, ChevronDown, PlusCircle,
} from "@/components/icons/gsb";

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
  if (status === "won") return <Check className="w-3 h-3" />;
  if (status === "lost") return <X className="w-3 h-3" />;
  return <Minus className="w-3 h-3" />;
};

const kickoffTime = (kickoff: string) => {
  try {
    const d = new Date(String(kickoff).replace(" ", "T"));
    if (isNaN(d.getTime())) return "TBD";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "TBD";
  }
};

interface TipTileProps {
  tip: Tip;
  locked: boolean;
  selected: boolean;
  onToggle: () => void;
  /** Opens the on-page checkout for locked premium picks. */
  onUnlock?: () => void;
}

/** Card-style tip for the public board: time, match, prediction, odds, betslip. */
const TipTile = ({ tip, locked, selected, onToggle, onUnlock }: TipTileProps) => {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const settled = tip.status !== "upcoming";
  const isWon = tip.status === "won";
  const odds = Number(tip.odds) || 0;

  const accent = isWon
    ? "from-emerald-500"
    : tip.isPremium
      ? "from-pink-500"
      : "from-white/40";

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      className={`group relative overflow-hidden rounded-2xl border bg-card/80 shadow-lg shadow-black/20 transition-colors ${
        selected
          ? "border-pink-500/55 shadow-pink-500/10"
          : isWon
            ? "border-emerald-500/30 hover:border-emerald-500/50"
            : tip.isPremium
              ? "border-pink-500/25 hover:border-pink-500/45"
              : "border-white/[0.07] hover:border-white/20"
      }`}
    >
      <div className={`h-[2px] w-full bg-gradient-to-r ${accent} via-pink-500/60 to-cyan-500/70`} />

      <div className="p-4 space-y-3.5">
        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-bold text-white/90 tabular-nums">
            <Clock className="w-3 h-3 text-white/40" />
            {kickoffTime(tip.kickoff)}
          </span>
          <span className="truncate text-[11px] text-white/45 font-medium">{tip.league}</span>
          {settled && (
            <Badge variant={statusVariant[tip.status]} className="gap-1 shrink-0 text-[9px] px-2 py-0.5">
              <StatusIcon status={tip.status} />
              <span className="whitespace-nowrap">{statusLabel[tip.status]}</span>
            </Badge>
          )}
        </div>

        {/* Match */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center shrink-0">
              <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={24} sport={tip.sport} />
            </div>
            <span className="truncate text-sm font-bold text-foreground">{tip.homeTeam}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/25 shrink-0">vs</span>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            <span className="truncate text-sm font-bold text-foreground text-right">{tip.awayTeam}</span>
            <div className="w-9 h-9 rounded-full bg-pink-500/[0.06] ring-1 ring-pink-500/20 flex items-center justify-center shrink-0">
              <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={24} sport={tip.sport} />
            </div>
          </div>
        </div>

        {/* Prediction + odds */}
        <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
          isWon
            ? "bg-emerald-500/5 border-emerald-500/15"
            : tip.isPremium
              ? "bg-pink-500/[0.06] border-pink-500/20"
              : "bg-white/[0.02] border-white/[0.07]"
        }`}>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.18em] text-white/40 font-bold">Prediction</p>
            {locked ? (
              <button
                type="button"
                onClick={onUnlock}
                className="inline-flex items-center gap-1.5 text-[13px] font-bold text-pink-300 hover:text-pink-200 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                Unlock prediction
              </button>
            ) : (
              <p className="truncate text-[13px] font-bold text-white/90">{tip.prediction}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Odds</p>
            <p className={`text-2xl font-black leading-none tabular-nums ${isWon ? "text-emerald-400" : "text-cyan-400"}`}>
              {odds > 0 ? odds.toFixed(2) : "—"}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {tip.description && !locked && (
            <button
              type="button"
              onClick={() => setShowAnalysis((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-display font-bold uppercase tracking-wider text-white/50 hover:text-pink-400 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAnalysis ? "rotate-180" : ""}`} />
              Read more
            </button>
          )}

          {settled ? (
            <div className="ml-auto flex items-center gap-2">
              {tip.finalScore && (
                <span className="text-[11px] font-display font-bold text-white/55 uppercase tracking-wider">
                  FT {tip.finalScore}
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              disabled={odds <= 0}
              aria-pressed={selected}
              aria-label={selected ? "Remove from accumulator" : "Add to accumulator"}
              className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-display font-black uppercase tracking-wider transition-all disabled:opacity-30 ${
                selected
                  ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md shadow-pink-500/30"
                  : "border border-white/[0.12] bg-white/[0.04] text-white/65 hover:border-pink-500/40 hover:text-pink-300"
              }`}
            >
              {selected ? <Check className="w-3.5 h-3.5 brightness-0 invert" /> : <PlusCircle className="w-3.5 h-3.5" />}
              {selected ? "In slip" : "Add"}
            </button>
          )}
        </div>

        {/* Analysis */}
        <AnimatePresence initial={false}>
          {showAnalysis && tip.description && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <p className="border-l-2 border-pink-500/30 pl-3 py-1 text-[12px] leading-relaxed italic text-white/65">
                {tip.description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
};

export default TipTile;
