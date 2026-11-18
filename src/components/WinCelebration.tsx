import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Share2, Loader2 } from "lucide-react";
import TipCard, { Tip } from "@/components/TipCard";
import { play } from "@/lib/sfx";
import { shareCard } from "@/lib/shareCard";
import { track } from "@/lib/analytics";

const COLORS = ["#f6dc8a", "#fff1b8", "#b98a2a", "#ffffff", "#ff7a45", "#3fbf74"];

/** Gold confetti bursting from the centre and drifting down. */
const Confetti = ({ count = 70 }: { count?: number }) => {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const r = 160 + Math.random() * 260;
        return {
          x: Math.cos(a) * r,
          y: Math.sin(a) * r * 0.7 - 120,
          fall: 380 + Math.random() * 380,
          rot: Math.random() * 720 - 360,
          w: 6 + Math.random() * 8,
          h: 3 + Math.random() * 5,
          c: COLORS[i % COLORS.length],
          d: Math.random() * 0.25,
        };
      }),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[1px]"
          style={{ width: b.w, height: b.h, background: b.c }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: [0, b.x, b.x * 1.1], y: [0, b.y, b.y + b.fall], rotate: [0, b.rot, b.rot * 2], opacity: [1, 1, 0] }}
          transition={{ duration: 2.6, delay: 0.55 + b.d, times: [0, 0.3, 1], ease: ["easeOut", "easeIn"] }}
        />
      ))}
    </div>
  );
};

/**
 * Full-screen moment for cards that won since the last visit: the card slams
 * in, a gold WIN seal stamps down, confetti and coins. Several wins are
 * shown one after another.
 */
const WinCelebration = ({ wins, onDone }: { wins: Tip[]; onDone: () => void }) => {
  const [i, setI] = useState(0);
  const [sharing, setSharing] = useState(false);
  const reduce = useReducedMotion();
  const tip = wins[i];

  useEffect(() => {
    if (!tip) return;
    const t1 = window.setTimeout(() => play("stamp"), reduce ? 0 : 520);
    const t2 = window.setTimeout(() => play("chime"), reduce ? 0 : 700);
    try {
      navigator.vibrate?.([30, 60, 40]);
    } catch {
      /* unsupported */
    }
    track("card_inspected", { tip: tip.id, from: "win" });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = prev;
    };
  }, [tip, reduce]);

  if (!tip) return null;
  const last = i === wins.length - 1;
  const profit = (tip.odds - 1).toFixed(2);

  const share = async () => {
    setSharing(true);
    track("card_shared", { tip: tip.id, from: "win" });
    try {
      await shareCard(tip, true);
    } finally {
      setSharing(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[85] flex flex-col items-center justify-center px-6 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Your card won"
    >
      <div className="absolute inset-0 bg-[hsl(232_45%_4%/.92)] backdrop-blur-md" />
      <motion.div
        className="absolute w-[820px] h-[820px] rounded-full"
        style={{
          background: "repeating-conic-gradient(from 0deg, rgba(255,226,140,.22) 0deg 8deg, transparent 8deg 22deg)",
          WebkitMaskImage: "radial-gradient(circle, #000 16%, transparent 62%)",
          maskImage: "radial-gradient(circle, #000 16%, transparent 62%)",
        }}
        initial={{ scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: 120 }}
        transition={{ scale: { duration: 0.7, delay: 0.4 }, rotate: { duration: 20, ease: "linear" } }}
      />
      <div className="absolute w-[460px] h-[460px] rounded-full bg-[radial-gradient(circle,rgba(255,214,120,.35),transparent_62%)]" />

      <AnimatePresence mode="wait">
        <motion.div key={tip.id} className="relative flex flex-col items-center">
          <motion.p
            className="font-display font-black uppercase text-[34px] leading-none tracking-[-0.03em] text-center"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.75, type: "spring", stiffness: 260, damping: 16 }}
          >
            <span className="foil-gold-text">Your card won!</span>
          </motion.p>

          {/* The card slams down onto the table */}
          <motion.div
            className="relative mt-6 w-[220px]"
            initial={reduce ? false : { y: -500, rotate: -25, scale: 1.3, opacity: 0 }}
            animate={{ y: 0, rotate: -3, scale: 1, opacity: 1 }}
            exit={{ x: -400, rotate: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
          >
            {/* Shown face up as "open" so the big seal below is the only stamp;
                a settled pick is public, so it's never locked. */}
            <TipCard tip={{ ...tip, status: "upcoming", masked: false }} userIsPremium still />
            {/* The seal stamps down a beat later */}
            <motion.span
              className="absolute -top-6 -right-6 grid place-items-center w-[96px] h-[96px] rounded-full foil-gold ring-4 ring-[#fff1b8] shadow-[0_12px_30px_rgba(0,0,0,.6)] font-display font-black uppercase text-[24px] text-stock-ink"
              initial={reduce ? false : { scale: 3, rotate: -40, opacity: 0 }}
              animate={{ scale: 1, rotate: -14, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 420, damping: 13 }}
            >
              Win
            </motion.span>
          </motion.div>

          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <p className="text-[15px] text-muted-foreground">
              {tip.prediction} @ <span className="num font-bold text-foreground">{tip.odds.toFixed(2)}</span>
            </p>
            <p className="num font-black text-[28px] mt-1 foil-gold-text">+{profit} units</p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {!reduce && <Confetti key={tip.id} />}

      <motion.div
        className="relative mt-7 flex items-center gap-2.5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <button
          onClick={share}
          className="h-13 py-3.5 px-6 rounded-full bg-white/10 border border-white/15 font-bold text-[15px] flex items-center gap-2"
        >
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          Show it off
        </button>
        <button
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="h-13 py-3.5 px-7 rounded-full bg-primary text-primary-foreground font-bold text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--primary)/.7)]"
        >
          {last ? "Nice!" : `Next win (${wins.length - i - 1})`}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WinCelebration;
