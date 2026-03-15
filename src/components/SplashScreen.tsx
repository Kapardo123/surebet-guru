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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a]"
        >
          {/* Animated Background Gradient */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -top-[20%] -left-[20%] w-[80%] h-[80%] rounded-full bg-primary/20 blur-[120px]"
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [0, -90, 0],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-[20%] -right-[20%] w-[80%] h-[80%] rounded-full bg-accent/20 blur-[120px]"
            />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 1, 
                ease: [0.16, 1, 0.3, 1]
              }}
              className="mb-12"
            >
              <LottieLogo size={220} className="md:w-[320px] md:h-[320px]" />
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col items-center"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl md:text-7xl font-black tracking-tighter bg-gradient-to-r from-primary via-[hsl(280,80%,65%)] to-accent bg-clip-text text-transparent">
                  GREAT
                </span>
                <span className="text-5xl md:text-7xl font-extralight tracking-[0.15em] text-white">
                  SPORT
                </span>
              </div>
              <span className="text-sm md:text-xl font-semibold uppercase tracking-[0.6em] text-accent/90 mt-3">
                BETS
              </span>
            </motion.div>
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
