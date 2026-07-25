import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Prosty, elegancki splash screen:
 *  - ciemne neonowe tlo z delikatna poswiata,
 *  - cool napis "GREAT SPORT BETS" (Bebas Neue, gradient + glow),
 *  - tagline (Space Grotesk),
 *  - koleczko ladowania (neonowy, obrotowy luk).
 * Pokazuje sie tylko raz na sesje i plynnie znika.
 */
const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Pokaz splash tylko raz na sesje
    if (sessionStorage.getItem("splash_shown")) return;

    setIsVisible(true);

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2600);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("splash_shown", "true");
    }, 3100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isFadingOut ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0015] via-[#12001f] to-[#05000d]"
      >
        {/* Delikatna, pulsujaca poswiata w tle */}
        <motion.div
          className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(236,72,153,0.16) 0%, rgba(139,92,246,0.10) 45%, transparent 70%)",
            filter: "blur(70px)",
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {/* Napis: GREAT (Bebas Neue) */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-splash text-6xl tracking-wide text-white sm:text-7xl md:text-8xl"
            style={{ textShadow: "0 0 40px rgba(255,255,255,0.12)" }}
          >
            GREAT
          </motion.h1>

          {/* Napis: SPORT BETS (Bebas Neue, neonowy gradient) */}
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-splash text-6xl leading-[0.95] tracking-wide sm:text-7xl md:text-8xl"
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 28px rgba(236,72,153,0.35))",
            }}
          >
            SPORT BETS
          </motion.h2>

          {/* Tagline (Space Grotesk) */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-display mt-6 text-[11px] font-medium uppercase tracking-[0.45em] text-white/35 sm:text-xs"
          >
            Premium Betting Tips
          </motion.p>

          {/* Koleczko ladowania */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="relative mt-12 h-14 w-14"
          >
            {/* statyczny tor */}
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            {/* obrotowy neonowy luk */}
            <div
              className="absolute inset-0 animate-spin rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0%, transparent 55%, #ec4899 82%, #06b6d4 100%)",
                WebkitMask:
                  "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 3px))",
                mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 3px))",
                filter: "drop-shadow(0 0 6px rgba(236,72,153,0.6))",
              }}
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
