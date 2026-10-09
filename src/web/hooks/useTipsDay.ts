import { useEffect, useMemo, useState } from "react";
import type { Tip } from "@/components/TipCard";
import { chipDayDate, chipDayLabel, dayKeyOfKickoff, warsawDayKey } from "@/web/lib/days";

export interface DayMeta {
  key: string;
  label: string;
  date: string;
  count: number;
}

/** Day filter (Warsaw timezone): available days + current selection.
 *  Defaults to today (or the first day that has tips). */
export const useTipsDay = (tips: Tip[]) => {
  const [day, setDay] = useState<string>("__auto__");

  const days = useMemo<DayMeta[]>(() => {
    const map = new Map<string, number>();
    for (const t of tips) {
      const k = dayKeyOfKickoff(t.kickoff);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => (a === "tbd" ? 1 : b === "tbd" ? -1 : a.localeCompare(b)))
      .map(([key, count]) => ({ key, count, label: chipDayLabel(key), date: chipDayDate(key) }));
  }, [tips]);

  const todayKey = warsawDayKey(Date.now());

  // First selection: today if it has tips, otherwise the first available day.
  useEffect(() => {
    if (day !== "__auto__") return;
    if (days.length === 0) {
      setDay("all");
      return;
    }
    setDay(days.some((d) => d.key === todayKey) ? todayKey : days[0].key);
  }, [days, day, todayKey]);

  // Keep the selection valid when filters change the available days.
  useEffect(() => {
    if (day === "all" || day === "__auto__" || days.length === 0) return;
    if (!days.some((d) => d.key === day)) {
      setDay(days.some((d) => d.key === todayKey) ? todayKey : days[0].key);
    }
  }, [days, day, todayKey]);

  const dayTips = useMemo(() => {
    if (day === "all" || day === "__auto__") return tips;
    return tips.filter((t) => dayKeyOfKickoff(t.kickoff) === day);
  }, [tips, day]);

  const activeIndex = days.findIndex((d) => d.key === day);
  const activeDay = activeIndex >= 0 ? days[activeIndex] : null;

  const step = (delta: number) => {
    if (days.length === 0) return;
    const from = activeIndex < 0 ? (delta > 0 ? -1 : days.length) : activeIndex;
    const next = Math.min(days.length - 1, Math.max(0, from + delta));
    setDay(days[next].key);
  };

  return { day, setDay, days, dayTips, activeDay, activeIndex, step, allDays: day === "all" };
};
