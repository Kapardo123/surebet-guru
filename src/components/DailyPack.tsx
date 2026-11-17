import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import HoloCard from "@/components/HoloCard";

const CRIMP =
  "linear-gradient(#000 0 0) center / 100% calc(100% - 16px) no-repeat, " +
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 12px 8px repeat-x, " +
  "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 12px 8px repeat-x";

const FOIL = "linear-gradient(150deg,#1d2a6b 0%,#4b2a86 30%,#16466f 55%,#2a1a5e 80%,#122050)";

/**
 * Today's sealed pack. Tap to tear the top off; the cards burst out and the
 * parent swaps in the dealt grid via onOpen.
 */
const DailyPack = ({ count, goldCount, onOpen }: { count: number; goldCount: number; onOpen: () => void }) => {
  const [tearing, setTearing] = useState(false);
  const reduce = useReducedMotion();

  const open = () => {
    if (tearing) return;
    if (reduce) return onOpen();
    setTearing(true);
    window.setTimeout(onOpen, 1050);
  };

  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="relative flex flex-col items-center py-6 select-none">
      {/* Cards that burst out */}
      <AnimatePresence>
        {tearing &&
          Array.from({ length: Math.min(count, 6) }).map((_, i, arr) => {
            const spread = (i - (arr.length - 1) / 2) * 34;
            return (
              <motion.div
                key={i}
                className={`absolute top-[90px] w-[86px] h-[120px] rounded-[10px] p-[3px] shadow-[0_10px_24px_-8px_rgba(0,0,0,.8)] ${i < goldCount ? "foil-gold" : "bg-stock"}`}
                initial={{ y: 60, rotate: 0, opacity: 0, scale: 0.7 }}
                animate={{ y: -120 - Math.abs(spread) * 0.4, x: spread * 2.2, rotate: spread * 0.5, opacity: [0, 1, 1, 0], scale: 1 }}
                transition={{ duration: 1.05, delay: 0.25 + i * 0.05, ease: [0.2, 0.8, 0.3, 1], times: [0, 0.15, 0.8, 1] }}
              >
                <div className="h-full rounded-[7px] card-back grid place-items-center">
                  <span className="font-display font-black text-[12px] foil-gold-text">GSB</span>
                </div>
              </motion.div>
            );
          })}
      </AnimatePresence>

      <motion.button
        onClick={open}
        aria-label={`Open today's pack, ${count} cards`}
        className="relative z-10"
        animate={
          tearing
            ? { scale: [1, 1.04, 0.92], y: [0, -4, 40], opacity: [1, 1, 0], transition: { duration: 1, times: [0, 0.25, 1] } }
            : { y: [0, -6, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }
        }
        whileTap={{ scale: 0.97 }}
      >
        <HoloCard holo={false} maxTilt={14}>
          <div className="holo holo-idle relative w-[230px] h-[318px] text-white" style={{ WebkitMask: CRIMP, mask: CRIMP }}>
            <div className="absolute inset-0" style={{ background: FOIL }} />
            <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.05)_0_2px,transparent_2px_9px)]" />
            {/* Tear strip */}
            <motion.div
              className="absolute inset-x-0 top-0 h-[54px] foil-gold z-10 flex items-end justify-center pb-2"
              animate={tearing ? { y: -90, x: 40, rotate: 18, opacity: 0 } : { y: 0, x: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.5, 0, 0.6, 1] }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stock-ink/80">Tear here ✂</span>
            </motion.div>
            <div className="absolute inset-x-0 top-[54px] border-t-2 border-dashed border-white/40" />

            <div className="absolute inset-0 pt-[74px] px-5 flex flex-col items-center text-center">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">{date}</span>
              <span className="font-display font-black uppercase text-[30px] leading-[0.95] tracking-[-0.02em] mt-3">
                Today's
                <br />
                <span className="foil-gold-text">pack</span>
              </span>
              <span className="mt-5 grid place-items-center w-[92px] h-[92px] rounded-full foil-gold shadow-[0_8px_20px_rgba(0,0,0,.45)]">
                <span className="w-[80px] h-[80px] rounded-full bg-[hsl(232_45%_12%)] grid place-items-center">
                  <span className="text-center leading-none">
                    <span className="block num font-black text-[30px] foil-gold-text">{count}</span>
                    <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-white/60 mt-1">cards</span>
                  </span>
                </span>
              </span>
              {goldCount > 0 && (
                <span className="mt-3 text-[11.5px] font-semibold text-white/75">
                  incl. <span className="foil-gold-text font-bold">{goldCount} Gold</span>
                </span>
              )}
            </div>
          </div>
        </HoloCard>
      </motion.button>

      <motion.p
        className="mt-6 text-[14px] font-semibold text-foreground/80"
        animate={tearing ? { opacity: 0 } : { opacity: [0.55, 1, 0.55] }}
        transition={tearing ? { duration: 0.2 } : { duration: 2, repeat: Infinity }}
      >
        Tap to tear it open
      </motion.p>
    </div>
  );
};

export default DailyPack;
