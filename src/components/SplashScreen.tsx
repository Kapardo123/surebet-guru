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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-5 px-6 text-center"
        >
          <span className="grid place-items-center w-16 h-16 rounded-xl bg-primary text-primary-foreground font-display font-bold text-3xl leading-none">
            GSB
          </span>
          <div className="font-display font-semibold uppercase text-foreground text-[40px] leading-[0.95] tracking-[0.01em]">
            Great Sport Bets
          </div>
          <div className="w-28 h-[2px] bg-border overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2.6, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
