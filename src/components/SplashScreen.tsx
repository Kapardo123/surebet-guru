import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

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
          <div className="relative w-48 h-48 md:w-64 md:h-64 mb-8">
            {/* Background glow */}
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-[80px] animate-pulse" />
            
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2
              }}
              src="/logo.png"
              alt="Great Sport Bets"
              className="w-full h-full object-contain relative z-10"
            />
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-baseline gap-1">
              <span className="text-3xl md:text-4xl font-black tracking-tighter bg-gradient-to-r from-primary via-[hsl(280,80%,65%)] to-accent bg-clip-text text-transparent">
                GREAT
              </span>
              <span className="text-3xl md:text-4xl font-extralight tracking-[0.15em] text-foreground/80">
                SPORT
              </span>
            </div>
            <span className="text-xs md:text-sm font-semibold uppercase tracking-[0.5em] text-accent/70 mt-1">
              BETS
            </span>
          </motion.div>

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
