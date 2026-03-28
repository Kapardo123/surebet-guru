import { useEffect, useState } from "react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; 
    const interval = 30; 
    const step = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        return next >= 100 ? 100 : next;
      });
    }, interval);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration + 100);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a]">
      {/* Background with fallback color */}
      <div className="absolute inset-0 z-0">
        <img
          src="splash.png"
          alt=""
          className="w-full h-full object-cover opacity-40"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-12">
          <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(155,135,245,0.2)]">
            <span className="text-4xl font-black text-primary">GSB</span>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black tracking-tighter text-white">
              GREAT
            </span>
            <span className="text-4xl font-extralight tracking-widest text-white/70">
              SPORT
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.6em] text-accent">
            BETS
          </span>
        </div>

        {/* Loading bar container */}
        <div className="mt-16 w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="mt-4">
          <span className="text-[9px] text-white/30 uppercase tracking-[0.4em] font-bold">
            Initializing {Math.round(progress)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
