import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { play } from "@/lib/sfx";

const THRESHOLD = 80;

/**
 * Pull-to-refresh for touch screens: pull down at the top of the page and
 * three card backs fan out as you pull; let go past the line and they
 * shuffle while the feed reloads.
 */
const PullToShuffle = ({ onRefresh }: { onRefresh: () => Promise<unknown> | void }) => {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const down = (e: TouchEvent) => {
      if (busyRef.current || window.scrollY > 0 || document.body.style.overflow === "hidden") return;
      start.current = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // Rubber band: the further you pull, the harder it gets.
      const p = Math.min(140, dy * 0.5);
      if (pullRef.current < THRESHOLD && p >= THRESHOLD) {
        try {
          navigator.vibrate?.(10);
        } catch {
          /* unsupported */
        }
      }
      pullRef.current = p;
      setPull(p);
    };
    const up = async () => {
      if (start.current == null) return;
      start.current = null;
      if (pullRef.current >= THRESHOLD) {
        busyRef.current = true;
        setBusy(true);
        setPull(THRESHOLD);
        play("rustle");
        const t0 = Date.now();
        try {
          await onRefresh();
        } finally {
          // Let the shuffle play at least once.
          const rest = Math.max(0, 900 - (Date.now() - t0));
          window.setTimeout(() => {
            busyRef.current = false;
            setBusy(false);
            pullRef.current = 0;
            setPull(0);
          }, rest);
        }
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [onRefresh]);

  const p = Math.min(1, pull / THRESHOLD);
  if (pull === 0 && !busy) return null;

  return (
    <div className="fixed left-0 right-0 z-30 flex flex-col items-center pointer-events-none" style={{ top: `calc(env(safe-area-inset-top) + ${12 + pull * 0.6}px)` }} aria-live="polite">
      <div className="flex flex-col items-center rounded-[20px] bg-background/85 backdrop-blur-xl border border-white/10 px-5 pt-3.5 pb-2.5 shadow-[0_14px_30px_-12px_rgba(0,0,0,.9)]">
      <div className="relative w-[34px] h-[48px]">
        {[-1, 0, 1].map((k) => (
          <motion.div
            key={k}
            className={`absolute inset-0 rounded-[6px] p-[2px] shadow-[0_6px_14px_-4px_rgba(0,0,0,.8)] ${k === 0 ? "foil-gold" : "bg-stock"}`}
            style={{ zIndex: k === 0 ? 2 : 1 }}
            animate={
              busy
                ? { x: [0, k * 22, -k * 22, 0], rotate: [k * 14, -k * 10, k * 10, k * 14], y: [0, -6, 0] }
                : { x: k * 16 * p, rotate: k * 14 * p, y: 0 }
            }
            transition={busy ? { duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: (k + 1) * 0.05 } : { duration: 0 }}
          >
            <div className="h-full rounded-[4px] card-back" />
          </motion.div>
        ))}
      </div>
      <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/70">
        {busy ? "Shuffling…" : p >= 1 ? "Release to shuffle" : "Pull to shuffle"}
      </span>
      </div>
    </div>
  );
};

export default PullToShuffle;
