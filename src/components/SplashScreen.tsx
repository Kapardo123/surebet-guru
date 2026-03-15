import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import LottieLogo from "./LottieLogo";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500); // Display for 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
        >
          <div className="relative w-full h-full">
            <motion.img
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 1.2, 
                ease: "easeOut"
              }}
              src="/splash.png"
              alt="Great Sport Bets"
              className="w-full h-full object-cover"
            />
            {/* Overlay for branding on top of fullscreen image */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-8"
              >
                <LottieLogo size={180} className="md:w-[240px] md:h-[240px]" />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-r from-primary via-[hsl(280,80%,65%)] to-accent bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    GREAT
                  </span>
                  <span className="text-4xl md:text-6xl font-extralight tracking-[0.15em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    SPORT
                  </span>
                </div>
                <span className="text-sm md:text-lg font-semibold uppercase tracking-[0.5em] text-accent/90 mt-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                  BETS
                </span>
              </motion.div>
            </div>
          </div>

          {/* Loading bar */}
          <div className="absolute bottom-16 w-48 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="w-full h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
