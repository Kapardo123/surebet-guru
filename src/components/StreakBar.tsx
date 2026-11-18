import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Daily streak: seven segments towards the next free Gold card.
 * Signed-out readers see their device streak and a nudge to sign in.
 */
const StreakBar = ({ streak, credits, local }: { streak: number; credits: number; local: boolean }) => {
  const inCycle = streak === 0 ? 0 : ((streak - 1) % 7) + 1;
  const toGo = 7 - inCycle;

  return (
    <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.07] px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <motion.span
            className="grid place-items-center w-9 h-9 rounded-full bg-[radial-gradient(circle_at_50%_70%,#ffb347,#ff5e3a)] shadow-[0_0_18px_-2px_rgba(255,120,60,.7)] shrink-0"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="w-5 h-5 text-white fill-white/80" />
          </motion.span>
          <div className="min-w-0">
            <p className="font-display font-black text-[17px] leading-none">
              {streak}-day streak
            </p>
            <p className="text-[12.5px] text-muted-foreground mt-1 truncate">
              {local ? (
                <>
                  <Link to="/auth" className="text-primary font-semibold">Sign in</Link> to earn free Gold cards
                </>
              ) : toGo === 0 ? (
                "Free Gold card earned today!"
              ) : (
                <>
                  {toGo} more {toGo === 1 ? "day" : "days"} to a free <span className="foil-gold-text font-bold">Gold card</span>
                </>
              )}
            </p>
          </div>
        </div>
        {credits > 0 && (
          <span className="shrink-0 h-8 px-3 rounded-full foil-gold text-stock-ink text-[12.5px] font-bold grid place-items-center">
            {credits} free {credits === 1 ? "card" : "cards"}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1.5" aria-label={`Day ${inCycle} of 7`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="relative h-2 rounded-full bg-white/[0.08] overflow-hidden">
            {i < inCycle && (
              <motion.div
                className={`absolute inset-0 rounded-full ${i === 6 ? "foil-gold" : "bg-[linear-gradient(90deg,#ff5e3a,#ffb347)]"}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{ originX: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreakBar;
