import { useEffect, useState } from "react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const splashShown = sessionStorage.getItem('splash_shown');
    if (splashShown) return;
    
    setIsVisible(true);
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
      sessionStorage.setItem('splash_shown', 'true');
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
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full blur-[120px]"
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(139,92,246,0.08), transparent)',
            animation: 'glowPulse 4s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute bottom-1/3 left-1/4 w-[200px] h-[200px] rounded-full blur-[80px]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.1), transparent)',
            animation: 'float 6s ease-in-out infinite'
          }}
        />
      </div>

      <div className={`relative z-10 flex flex-col items-center transform transition-all duration-800 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <div className="text-center mb-14 relative">
          <div 
            className="absolute -inset-12 opacity-20"
            style={{
              background: 'conic-gradient(from 180deg at 50% 50%, transparent 0%, rgba(236,72,153,0.5) 25%, transparent 50%, rgba(59,130,246,0.5) 75%, transparent 100%)',
              animation: 'spin 10s linear infinite',
              filter: 'blur(30px)',
            }}
          />

          <h1 className="relative text-[52px] md:text-[68px] font-black tracking-tight leading-none mb-1" style={{ animation: 'fadeUp 0.7s ease-out both' }}>
            <span 
              className="text-white inline-block"
              style={{ textShadow: '0 0 60px rgba(255,255,255,0.15)' }}
            >GREAT</span>
          </h1>
          <h2 className="relative text-[52px] md:text-[68px] font-black tracking-tight leading-none -mt-1" style={{ animation: 'fadeUp 0.7s ease-out 0.12s both', opacity: 0 }}>
            <span 
              style={{
                backgroundImage: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 28px rgba(139,92,246,0.35))',
              }}>SPORT</span>
          </h2>
          <p className="relative text-xs font-bold uppercase tracking-[0.45em] text-white/20 mt-5" style={{ animation: 'fadeUp 0.7s ease-out 0.24s both', opacity: 0 }}>
            BETS
          </p>

          <div className="relative mt-6 flex justify-center gap-1.5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[2px] rounded-full"
                style={{
                  width: i === 1 ? '48px' : '32px',
                  background: 'linear-gradient(90deg, rgba(236,72,153,0.5), rgba(139,92,246,0.5), rgba(59,130,246,0.5))',
                  animation: `barGrow 0.5s ease-out ${0.35 + 0.1 * i}s both`,
                }}
              />
            ))}
          </div>
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
                  textShadow: progress > item.threshold ? `0 0 10px ${item.color}30` : 'none',
                }}
              >{item.label}</span>
              <div className="flex-1 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-200 ease-out"
                  style={{ 
                    width: `${Math.min(idx === 0 ? progress * 33.3 : Math.max(0, (progress - idx * 33.3) * 33.3))}%` ,
                    background: `linear-gradient(90deg, ${item.color}, ${item.toColor})`,
                    boxShadow: `0 0 6px ${item.color}40`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{background: 'linear-gradient(135deg, #ec4899, #a855f7)', boxShadow: '0 0 8px rgba(236,72,153,0.5)', animationDelay: '0ms'}} />
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{background: 'linear-gradient(135deg, #a855f7, #6366f1)', boxShadow: '0 0 8px rgba(168,85,247,0.5)', animationDelay: '150ms'}} />
          <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{background: 'linear-gradient(135deg, #6366f1, #38bdf8)', boxShadow: '0 0 8px rgba(99,102,241,0.5)', animationDelay: '300ms'}} />
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes barGrow {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;