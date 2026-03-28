import { useEffect, useState } from "react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress bar animation logic
    const duration = 2500; // 2.5 seconds
    const interval = 20; // Update every 20ms
    const step = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        return next >= 100 ? 100 : next;
      });
    }, interval);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
      <div className="relative w-full h-full">
        <img
          src="splash.png"
          alt="Great Sport Bets"
          className="w-full h-full object-cover"
        />
        {/* Overlay for branding on top of fullscreen image */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <div className="mb-8">
            {/* Simplified logo during splash screen */}
            <div className="w-32 h-32 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
              <span className="text-4xl font-black text-primary animate-pulse">GSB</span>
            </div>
          </div>

          <div className="flex flex-col items-center">
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
          </div>
        </div>
      </div>

      {/* Improved Loading bar with real progress */}
      <div className="absolute bottom-16 w-64 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-primary via-accent to-primary transition-all duration-75 ease-linear shadow-[0_0_10px_rgba(155,135,245,0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="absolute bottom-10">
        <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-medium">
          Loading Data... {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default SplashScreen;
