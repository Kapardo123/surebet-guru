import { useEffect, useState } from "react";

/** Current time, refreshed every `ms` (shared ticker per interval). */
const subs = new Map<number, { set: Set<(n: number) => void>; id: number }>();

export const useNow = (ms = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let entry = subs.get(ms);
    if (!entry) {
      const set = new Set<(n: number) => void>();
      entry = { set, id: window.setInterval(() => set.forEach((f) => f(Date.now())), ms) };
      subs.set(ms, entry);
    }
    entry.set.add(setNow);
    return () => {
      entry!.set.delete(setNow);
      if (!entry!.set.size) {
        clearInterval(entry!.id);
        subs.delete(ms);
      }
    };
  }, [ms]);
  return now;
};

/** Minutes since kick-off while a match is plausibly in play (< 2h15). */
export const liveMinute = (kickoff: string, now: number): number | null => {
  const ko = Date.parse(kickoff);
  if (isNaN(ko)) return null;
  const m = Math.floor((now - ko) / 60000);
  return m >= 0 && m < 135 ? m : null;
};
