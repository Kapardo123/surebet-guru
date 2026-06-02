import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const splashShown = sessionStorage.getItem('splash_shown');
    if (splashShown) return;
    
    setIsVisible(true);

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 3800);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('splash_shown', 'true');
    }, 4300);

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
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] overflow-hidden"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Main gradient orb */}
          <motion.div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.12) 40%, transparent 70%)',
              filter: 'blur(80px)',
            }}
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Secondary orb - Cyan/Magenta */}
          <motion.div 
            className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, rgba(217,70,239,0.08) 60%)',
              filter: 'blur(60px)',
            }}
            animate={{
              y: [0, -35, 0],
              x: [0, 25, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Tertiary orb - Neon Purple */}
          <motion.div 
            className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, rgba(236,72,153,0.06) 60%)',
              filter: 'blur(50px)',
            }}
            animate={{
              y: [0, 30, 0],
              x: [0, -20, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-6">
          {/* Title Text */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            {/* Great */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white mb-2 sm:mb-3"
              style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: '0 0 40px rgba(255,255,255,0.1)' }}
            >
              GREAT
            </motion.h1>

            {/* Sport Bets with gradient */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="relative inline-block"
            >
              <h2 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none"
                style={{ 
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(236,72,153,0.3))'
                }}
              >
                SPORT BETS
              </h2>
              
              {/* Glow effect behind text */}
              <div 
                className="absolute inset-0 blur-2xl opacity-30 -z-10"
                style={{
                  background: 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)',
                  filter: 'blur(40px)'
                }}
              />
            </motion.div>

            {/* Tagline */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-4 sm:mt-5 md:mt-6 text-xs sm:text-sm font-medium uppercase tracking-[0.3em] text-white/30"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Premium Tips & Predictions
            </motion.p>
          </div>

          {/* Decorative Elements */}
          <motion.div 
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex items-center gap-3 mb-8 sm:mb-10 md:mb-12"
          >
            <div className="h-[1px] w-12 sm:w-16 md:w-20 bg-gradient-to-r from-transparent to-pink-500/40" />
            
            {/* Animated dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  style={{
                    boxShadow: '0 0 10px rgba(168,85,247,0.5)'
                  }}
                />
              ))}
            </div>
            
            <div className="h-[1px] w-12 sm:w-16 md:w-20 bg-gradient-to-l from-transparent to-cyan-500/40" />
          </motion.div>

          {/* Loading Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="relative w-48 sm:w-56 md:w-64"
          >
            {/* Progress bar container */}
            <div className="h-[2px] bg-white/[0.05] rounded-full overflow-hidden backdrop-blur-sm">
              <motion.div 
                className="h-full rounded-full relative"
                style={{
                  background: 'linear-gradient(90deg, #ec4899, #a855f7, #06b6d4)',
                  boxShadow: '0 0 10px rgba(236,72,153,0.4)'
                }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: "easeInOut", delay: 0.7 }}
              >
                {/* Shimmer effect on progress bar */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.7 }}
                />
              </motion.div>
            </div>

            {/* Loading text */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
              className="mt-3 text-center text-[10px] sm:text-xs font-medium uppercase tracking-widest text-white/20"
            >
              Loading Experience...
            </motion.p>
          </motion.div>
        </div>

        {/* Bottom decoration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="absolute bottom-8 sm:bottom-10 md:bottom-12 flex flex-col items-center gap-2"
        >
          {/* Sport icons row */}
          <div className="flex items-center gap-4 sm:gap-6 opacity-10">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1" fill="none"/>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/>
            </svg>
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="8" width="18" height="12" rx="2" stroke="white" strokeWidth="1" fill="none"/>
              <path d="M7 8V6a5 5 0 0110 0v2" stroke="white" strokeWidth="1" fill="none"/>
            </svg>
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,2 22,22 2,22" stroke="white" strokeWidth="1" fill="none"/>
            </svg>
          </div>
          
          <p className="text-[8px] sm:text-[9px] font-medium tracking-wider text-white/10 uppercase">
            v16.0.0 • Premium Platform
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
