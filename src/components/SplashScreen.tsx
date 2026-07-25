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

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          {/* Spinning ring behind the text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.svg
              width="280"
              height="280"
              viewBox="0 0 280 280"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <defs>
                <linearGradient id="ringGrad1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0" />
                  <stop offset="30%" stopColor="#ec4899" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                  <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </linearGradient>
                <filter id="splashGlow">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle
                cx="140"
                cy="140"
                r="130"
                fill="none"
                stroke="url(#ringGrad1)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="200 616"
                filter="url(#splashGlow)"
              />
            </motion.svg>
          </motion.div>

          {/* Counter-rotating inner ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.svg
              width="220"
              height="220"
              viewBox="0 0 220 220"
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx="110"
                cy="110"
                r="100"
                fill="none"
                stroke="url(#ringGrad1)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="100 528"
                opacity="0.5"
              />
            </motion.svg>
          </motion.div>

          {/* Title: GREAT */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <h1
              className="font-splash text-7xl tracking-[0.15em] text-white sm:text-8xl md:text-9xl"
              style={{
                textShadow: "0 0 60px rgba(255,255,255,0.08), 0 0 120px rgba(168,85,247,0.12)",
              }}
            >
              GREAT
            </h1>
          </motion.div>

          {/* Title: SPORT BETS with gradient */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <h2
              className="font-splash text-6xl leading-[0.9] tracking-[0.12em] sm:text-7xl md:text-8xl"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #a855f7 40%, #06b6d4 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 40px rgba(236,72,153,0.3)) drop-shadow(0 0 80px rgba(168,85,247,0.15))",
              }}
            >
              SPORT BETS
            </h2>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="my-5 h-[1px] w-40 origin-center"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(236,72,153,0.6), transparent)",
            }}
          />

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="font-display text-[11px] font-medium uppercase tracking-[0.5em] text-white/30 sm:text-xs"
          >
            Premium Betting Tips
          </motion.p>

          {/* Spinning loader wheel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="relative mt-14"
          >
            <motion.svg
              width="52"
              height="52"
              viewBox="0 0 52 52"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <defs>
                <linearGradient id="spinGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              {/* Animated arc */}
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke="url(#spinGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="100 38"
              />
            </motion.svg>
            {/* Center dot */}
            <motion.div
              className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
