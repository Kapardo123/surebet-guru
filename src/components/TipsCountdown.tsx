import { useEffect, useMemo, useState } from "react";
import { Hourglass, Zap } from "lucide-react";
import { motion } from "framer-motion";

// Publikacja typów z poczekalni: codziennie o 03:00 czasu polskiego.
// 01:00 UTC pokrywa CEST (UTC+2); zimą cron zadziała o 02:00 PL.
const RELEASE_UTC_HOURS = [1, 2];
const GRACE_MINUTES = 15;

interface WarsawClock {
  date: string; // "YYYY-MM-DD"
  hour: number;
  minute: number;
}

const warsawWallClock = (ms: number): WarsawClock => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
};

/** Najbliższa godzina 03:00 PL (jako instant UTC) późniejsza od `now`. */
export const nextReleaseInstant = (now: number): number => {
  const candidates: number[] = [];
  for (const dayOffset of [0, 1]) {
    const { date } = warsawWallClock(now + dayOffset * 24 * 60 * 60 * 1000);
    for (const utcHour of RELEASE_UTC_HOURS) {
      candidates.push(
        new Date(`${date}T${String(utcHour).padStart(2, "0")}:00:00Z`).getTime(),
      );
    }
  }
  const future = candidates.filter((c) => c > now);
  return future.length ? Math.min(...future) : now + 24 * 60 * 60 * 1000;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const DigitPill = ({ value }: { value: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-[30px] md:min-w-[34px] px-1 py-0.5 rounded-lg bg-white/[0.07] border border-white/[0.12] font-mono text-base md:text-lg font-black text-pink-300 tabular-nums"
    style={{ textShadow: "0 0 12px rgba(236,72,153,0.6)" }}
  >
    {value}
  </span>
);

const Colon = () => (
  <span className="font-mono text-sm md:text-base font-black text-pink-500/50 animate-pulse">:</span>
);

const TipsCountdown = () => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { releasing, target } = useMemo(() => {
    const clock = warsawWallClock(now);
    const isGrace = clock.hour === 3 && clock.minute < GRACE_MINUTES;
    return { releasing: isGrace, target: nextReleaseInstant(now) };
  }, [now]);

  const remaining = Math.max(0, target - now);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-r from-[#12001f]/90 via-[#1a002e]/90 to-[#0a0015]/90 backdrop-blur-xl shadow-lg shadow-pink-500/10"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: "radial-gradient(ellipse 60% 140% at 50% 0%, rgba(236,72,153,0.14), transparent 70%)" }}
      />
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />

      {releasing ? (
        <div className="relative flex items-center justify-center gap-2.5 px-3 py-2.5">
          <div className="w-6 h-6 rounded-full bg-pink-500/15 ring-1 ring-pink-500/40 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Zap className="w-3 h-3 text-pink-400" />
          </div>
          <p className="text-xs md:text-sm font-display font-bold text-white">
            New tips are being added <span className="text-pink-400">right now!</span>
          </p>
        </div>
      ) : (
        <div className="relative flex items-center justify-center gap-2 md:gap-2.5 px-3 py-2.5">
          <div className="w-6 h-6 rounded-full bg-pink-500/15 ring-1 ring-pink-500/30 flex items-center justify-center flex-shrink-0">
            <Hourglass className="w-3 h-3 text-pink-400" />
          </div>
          <span className="text-[9px] md:text-[11px] uppercase tracking-[0.2em] text-white/45 font-display font-bold whitespace-nowrap">
            New tips in
          </span>
          <div className="flex items-center gap-0.5 md:gap-1">
            <DigitPill value={pad2(hours)} />
            <Colon />
            <DigitPill value={pad2(minutes)} />
            <Colon />
            <DigitPill value={pad2(seconds)} />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TipsCountdown;
