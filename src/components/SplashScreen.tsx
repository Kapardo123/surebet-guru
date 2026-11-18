import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import stadium from "@/assets/textures/stadium-night.webp";

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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
      >
        <motion.img
          src={stadium}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.75 }}
          transition={{ duration: 2.4, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(232_36%_8%/.2)] via-[hsl(232_36%_8%/.5)] to-[hsl(232_36%_8%/.95)]" />
        <div className="relative flex flex-col items-center">
          <div className="relative w-[120px] h-[168px]">
            {[
              { r: -22, x: -64, cls: "bg-stock", d: 0.25 },
              { r: 22, x: 64, cls: "bg-[hsl(150_55%_34%)]", d: 0.35 },
              { r: 0, x: 0, cls: "foil-gold", d: 0.45 },
            ].map((c, i) => (
              <motion.div
                key={i}
                className={`absolute inset-0 rounded-[14px] p-[4px] shadow-[0_14px_30px_-10px_rgba(0,0,0,.8)] ${c.cls}`}
                initial={{ x: 0, rotate: 0, y: 40, opacity: 0 }}
                animate={{ x: c.x, rotate: c.r, y: Math.abs(c.r) / 2, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 14, delay: c.d }}
                style={{ zIndex: i }}
              >
                <div className="h-full rounded-[10px] card-back grid place-items-center">
                  <span className="font-display font-black text-[22px] foil-gold-text">GSB</span>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="mt-12 font-display font-black uppercase text-[26px] leading-none tracking-[-0.02em] text-center"
          >
            Great Sport Bets
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.4 }}
            className="mt-2 label"
          >
            Shuffling today's deck…
          </motion.p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
