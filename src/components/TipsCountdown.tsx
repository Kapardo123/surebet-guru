import { useEffect, useMemo, useState } from "react";
import { Hourglass, Zap } from "lucide-react";
import { motion } from "framer-motion";

// Publikacja typów z poczekalni obsługiwana jest przez cron o 01:00 UTC codziennie.
// Latem (CEST, UTC+2) to 03:00 czasu polskiego, zimą (CET, UTC+1) 02:00.
const RELEASE_UTC_HOUR = 1;
const GRACE_MINUTES = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ostatnia i najbliższa publikacja (01:00 UTC codziennie) + okno "właśnie dodawane".
 *  Liczone wprost w UTC, żeby zmiana czasu (DST) nie przesuwała countdownu. */
const computeRelease = (now: number) => {
  const d = new Date(now);
  const todayRelease = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    RELEASE_UTC_HOUR,
    0,
    0,
  );
  const last = now >= todayRelease ? todayRelease : todayRelease - DAY_MS;
  const next = last + DAY_MS;
  const releasing = now - last < GRACE_MINUTES * 60 * 1000;
  return { last, next, releasing };
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const DigitPill = ({ value }: { value: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-[30px] md:min-w-[34px] px-1 py-0.5 rounded-lg bg-white/[0.07] border border-white/[0.12] font-mono text-base md:text-lg font-black text-pink-300 tabular-nums"
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
    const { releasing, next } = computeRelease(now);
    return { releasing, target: next };
  }, [now]);

  const remaining = Math.max(0, target - now);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-r from-[#12001f]/90 via-[#1a002e]/90 to-[#0a0015]/90 shadow-lg shadow-black/20"
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
