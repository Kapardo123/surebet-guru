import { useCallback, useMemo, useState } from "react";
import type { Tip } from "@/components/TipCard";

export interface AccaApi {
  selectedTips: Tip[];
  count: number;
  totalOdds: number;
  winnings: number;
  stake: number;
  setStake: (value: number) => void;
  toggle: (tip: Tip) => void;
  clear: () => void;
  isSelected: (id: number) => boolean;
}

/** Accumulator state: selected picks + stake -> best odds / winnings.
 *  `pool` should be the full (unfiltered) tip list so selections survive
 *  sport/day filtering. */
export const useAcca = (pool: Tip[]): AccaApi => {
  const [selected, setSelected] = useState<number[]>([]);
  const [stake, setStake] = useState(100);

  const selectedTips = useMemo(() => {
    const set = new Set(selected);
    return pool.filter((t) => set.has(t.id) && (Number(t.odds) || 0) > 0);
  }, [selected, pool]);

  const totalOdds = useMemo(() => {
    if (selectedTips.length === 0) return 0;
    return selectedTips.reduce((acc, t) => acc * (Number(t.odds) || 1), 1);
  }, [selectedTips]);

  const winnings = totalOdds * (stake || 0);

  const toggle = useCallback((tip: Tip) => {
    const odds = Number(tip.odds) || 0;
    if (odds <= 0) return;
    setSelected((prev) =>
      prev.includes(tip.id) ? prev.filter((x) => x !== tip.id) : [...prev, tip.id],
    );
  }, []);

  const clear = useCallback(() => setSelected([]), []);
  const isSelected = useCallback((id: number) => selected.includes(id), [selected]);

  return {
    selectedTips,
    count: selectedTips.length,
    totalOdds,
    winnings,
    stake,
    setStake,
    toggle,
    clear,
    isSelected,
  };
};
