import { useEffect, useState } from "react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    setShowContent(true);

    const duration = 5000;
    const interval = 30;
    const step = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        return next >= 100 ? 100 : next;
      });
    }, interval);

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, duration - 400);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration + 200);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050508] transition-opacity duration-700 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(236,72,153,0.06) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className={`relative z-10 flex flex-col items-center transform transition-all duration-800 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <div className="text-center mb-14">
          <h1 className="text-[52px] md:text-[64px] font-black tracking-tight leading-none mb-1" style={{ animation: 'fadeUp 0.6s ease-out both' }}>
            <span className="text-white">GREAT</span>
          </h1>
          <h2 className="text-[52px] md:text-[64px] font-black tracking-tight leading-none -mt-1" style={{ animation: 'fadeUp 0.6s ease-out 0.15s both', opacity: 0 }}>
            <span style={{
              backgroundImage: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>SPORT</span>
          </h2>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-white/25 mt-4" style={{ animation: 'fadeUp 0.6s ease-out 0.3s both', opacity: 0 }}>
            BETS
          </p>
        </div>

        <div className="w-64 space-y-3">
          {[
            { label: 'Loading Tips', threshold: 8, color: '#ec4899', toColor: '#a855f7' },
            { label: 'Connecting', threshold: 38, color: '#a855f7', toColor: '#6366f1' },
            { label: 'Ready', threshold: 72, color: '#6366f1', toColor: '#38bdf8' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span 
                className="text-[10px] font-bold uppercase tracking-wider min-w-[90px] transition-all duration-400"
                style={{
                  color: progress > item.threshold ? item.color : 'rgba(255,255,255,0.18)',
                  opacity: progress > item.threshold ? 0.65 : 0.35,
                }}
              >{item.label}</span>
              <div className="flex-1 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-200 ease-out"
                  style={{ 
                    width: `${Math.min(idx === 0 ? progress * 33.3 : Math.max(0, (progress - idx * 33.3) * 33.3))}%` ,
                    background: `linear-gradient(90deg, ${item.color}, ${item.toColor})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-500/70 animate-bounce" style={{animationDelay: '0ms'}} />
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500/70 animate-bounce" style={{animationDelay: '150ms'}} />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500/70 animate-bounce" style={{animationDelay: '300ms'}} />
        </div>

        <p className="mt-8 text-[9px] text-white/12 uppercase tracking-[0.3em]" style={{ animation: 'fadeUp 0.6s ease-out 0.45s both', opacity: 0 }}>
          v8.0.0 • Build 800
        </p>
      </div>

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;