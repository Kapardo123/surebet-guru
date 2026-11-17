import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = ({ onFinish }: { onFinish?: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("splash_shown")) {
      onFinish?.();
      return;
    }

    setIsVisible(true);

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2800);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("splash_shown", "true");
      onFinish?.();
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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      >
        <div className="w-full max-w-md px-5">
          <motion.div
            className="h-[3px] bg-foreground origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: [0.7, 0, 0.3, 1] }}
          />
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="py-3 text-center font-display font-black uppercase text-foreground leading-[0.82] text-[clamp(48px,15vw,84px)]"
          >
            Great<br />Sport Bets
          </motion.div>
          <motion.div
            className="h-px bg-foreground origin-right"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.7, 0, 0.3, 1] }}
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="mt-2 flex justify-between font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            <span>The daily form guide</span>
            <span className="text-red">Going to press…</span>
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
