import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("splash_shown")) return;

    setIsVisible(true);

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2800);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("splash_shown", "true");
    }, 3400);

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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#05000a]"
      >
        {/* Layered background glows */}
        <motion.div
          className="pointer-events-none absolute h-[600px] w-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(139,92,246,0.12) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute h-[300px] w-[300px] translate-y-[-60px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          {/* Title: GREAT */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="font-splash text-7xl tracking-[0.15em] text-white sm:text-8xl md:text-9xl"
            style={{ textShadow: "0 0 40px rgba(255,255,255,0.08)" }}
          >
            GREAT
          </motion.h1>

          {/* Title: SPORT BETS */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="font-splash text-6xl leading-[0.9] tracking-[0.12em] sm:text-7xl md:text-8xl"
            style={{
              background: "linear-gradient(135deg, #ec4899 0%, #a855f7 40%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 30px rgba(236,72,153,0.25))",
            }}
          >
            SPORT BETS
          </motion.h2>

          {/* Spinning loader */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="relative mt-4"
          >
            <motion.svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="url(#spinGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="90 36"
              />
              <defs>
                <linearGradient id="spinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </motion.svg>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
