import { motion } from "framer-motion";
import { Ticket, X } from "@/components/icons/gsb";
import AnimatedNumber from "./AnimatedNumber";
import type { AccaApi } from "@/web/hooks/useAcca";

interface AccaPanelProps {
  acca: AccaApi;
}

/** "Best odds / Stake / Winnings" box — the visible accumulator panel. */
const AccaPanel = ({ acca }: AccaPanelProps) => {
  const empty = acca.count === 0;

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-3xl border p-6 md:p-8 transition-colors ${
        empty
          ? "border-white/[0.07] bg-white/[0.02]"
          : "border-pink-500/30 bg-gradient-to-br from-pink-500/[0.07] via-white/[0.02] to-cyan-500/[0.05] shadow-xl shadow-pink-500/10"
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-cyan-500" />

      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-9 h-9 rounded-xl bg-pink-500/10 ring-1 ring-pink-500/25 flex items-center justify-center">
          <Ticket className="w-4 h-4 text-pink-400" />
        </span>
        <div>
          <p className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">
            Your accumulator
          </p>
          <p className="text-[11px] text-white/45">
            {empty ? "Tap + on any tip to start building" : `${acca.count} ${acca.count === 1 ? "pick" : "picks"} in the slip`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 items-end">
        {/* Best odds */}
        <div className="col-span-1">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-bold">Best odds</p>
          <AnimatedNumber
            value={acca.totalOdds}
            className={`block mt-1 text-4xl md:text-5xl font-black leading-none tabular-nums ${
              empty
                ? "text-white/15"
                : "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-pink-300"
            }`}
          />
        </div>

        {/* Stake */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-bold">Stake</p>
          <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-2">
            <span className="text-white/45 text-lg font-black">$</span>
            <input
              type="number"
              min={1}
              value={acca.stake}
              onChange={(e) => acca.setStake(Math.max(0, Number(e.target.value) || 0))}
              aria-label="Stake"
              className="w-full bg-transparent text-2xl font-black tabular-nums outline-none"
            />
          </div>
        </div>

        {/* Winnings */}
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-bold">Winnings</p>
          <AnimatedNumber
            value={acca.winnings}
            prefix="$"
            className={`block mt-1 text-4xl md:text-5xl font-black leading-none tabular-nums ${
              empty
                ? "text-white/15"
                : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400"
            }`}
          />
        </div>

        {/* Actions */}
        {!empty && (
          <div className="col-span-2 md:col-span-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={acca.clear}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:border-white/25 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Legs */}
      {!empty && (
        <div className="mt-6 pt-5 border-t border-white/[0.07] flex flex-wrap items-center gap-2">
          {acca.selectedTips.map((tip) => (
            <button
              key={tip.id}
              type="button"
              onClick={() => acca.toggle(tip)}
              aria-label={`Remove ${tip.homeTeam} vs ${tip.awayTeam}`}
              className="group inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] py-1.5 pl-3 pr-2 text-xs text-white/75 hover:border-pink-500/40 hover:text-white transition-colors"
            >
              <span className="max-w-[13rem] truncate">
                {tip.homeTeam} <span className="text-white/35">vs</span> {tip.awayTeam}
              </span>
              <span className="font-black text-cyan-400 tabular-nums">{(Number(tip.odds) || 0).toFixed(2)}</span>
              <span className="w-4 h-4 rounded-full bg-white/10 group-hover:bg-pink-500 flex items-center justify-center">
                <X className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AccaPanel;
