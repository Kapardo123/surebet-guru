import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HoloCard from "@/components/HoloCard";
import PackArt from "@/components/PackArt";
import PackOpening from "@/components/PackOpening";
import { Tip } from "@/components/TipCard";

/**
 * Today's sealed pack on the table. Tapping it starts the full-screen
 * opening sequence; when that finishes the parent deals the grid (onOpen).
 */
const DailyPack = ({ tips, onOpen }: { tips: Tip[]; onOpen: () => void }) => {
  const [opening, setOpening] = useState(false);
  const reduce = useReducedMotion();
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const goldCount = tips.filter((t) => t.isPremium).length;

  const start = () => {
    if (opening) return;
    if (reduce) return onOpen();
    setOpening(true);
  };

  return (
    <div className="relative flex flex-col items-center py-6 select-none">
      <motion.button
        onClick={start}
        aria-label={`Open today's pack, ${tips.length} cards`}
        className="relative"
        animate={opening ? { opacity: 0, scale: 0.9 } : { y: [0, -6, 0], opacity: 1 }}
        transition={opening ? { duration: 0.25 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.97 }}
      >
        <HoloCard holo={false} maxTilt={14}>
          <PackArt date={date} count={tips.length} goldCount={goldCount} />
        </HoloCard>
      </motion.button>
      <span className="mt-3 h-2 w-[180px] rounded-[50%] bg-black/50 blur-[5px]" aria-hidden />

      <motion.p
        className="mt-4 text-[14px] font-semibold text-foreground/80"
        animate={opening ? { opacity: 0 } : { opacity: [0.55, 1, 0.55] }}
        transition={opening ? { duration: 0.2 } : { duration: 2, repeat: Infinity }}
      >
        Tap to tear it open
      </motion.p>

      {createPortal(
        <AnimatePresence>{opening && <PackOpening key="opening" tips={tips} date={date} onDone={onOpen} />}</AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

export default DailyPack;
