import { useEffect, useState } from "react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500); // Display for 2.5 seconds

    return () => clearTimeout(timer);
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
              <span className="text-4xl font-black text-primary">GSB</span>
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

      {/* Loading bar */}
      <div className="absolute bottom-16 w-48 h-1 bg-muted rounded-full overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-primary to-accent animate-pulse" />
      </div>
    </div>
  );
};

export default SplashScreen;
