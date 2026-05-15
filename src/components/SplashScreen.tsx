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
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-700 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(236,72,153,0.3) 0%, transparent 70%)',
            animation: 'pulse 2.5s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.12), transparent)',
            animation: 'float 5s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)',
            animation: 'float 6s ease-in-out infinite reverse'
          }}
        />
      </div>

      <div className={`relative z-10 flex flex-col items-center transform transition-all duration-1000 ${showContent ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-10 scale-90 opacity-0'}`}>
        <div className="relative mb-10">
          <div 
            className="absolute -inset-8 rounded-[2.5rem] opacity-25"
            style={{
              background: 'conic-gradient(from 0deg, transparent, rgba(236,72,153,0.6), transparent, rgba(59,130,246,0.6), transparent)',
              animation: 'spin 5s linear infinite',
              filter: 'blur(30px)'
            }}
          />

          <div 
            className="relative px-8 py-7 rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(139,92,246,0.1), rgba(59,130,246,0.1))',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 80px rgba(236,72,153,0.15), 0 0 160px rgba(139,92,246,0.08)'
            }}
          >
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1 mb-1">
                {['G','R','E','A','T'].map((letter, i) => (
                  <span
                    key={i}
                    className="text-5xl md:text-6xl font-black tracking-tight"
                    style={{
                      color: '#ffffff',
                      animation: `letterIn 0.6s ease-out ${0.08 * i}s both`,
                      textShadow: '0 0 40px rgba(255,255,255,0.3)'
                    }}
                  >{letter}</span>
                ))}
              </div>
              
              <div className="flex items-baseline justify-center gap-1 -mt-1">
                {['S','P','O','R','T'].map((letter, i) => (
                  <span
                    key={i}
                    className="text-5xl md:text-6xl font-black tracking-tight"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: `letterIn 0.6s ease-out ${0.4 + 0.08 * i}s both`,
                      filter: 'drop-shadow(0 0 16px rgba(139,92,246,0.5))'
                    }}
                  >{letter}</span>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-white/5">
                <span
                  className="text-base md:text-lg font-bold uppercase tracking-[0.45em]"
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    animation: 'fadeInUp 0.8s ease-out 0.85s both',
                    letterSpacing: '0.35em'
                  }}
                >BETS</span>
              </div>

              <div className="flex justify-center mt-3 gap-1.5">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-[2px] rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)',
                      animation: `barGrow 0.5s ease-out ${1 + 0.15 * i}s both`,
                      transformOrigin: 'left'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 space-y-3.5 w-80">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-400 ${progress > 8 ? 'opacity-60 translate-x-0 text-pink-400' : 'opacity-0 -translate-x-5 text-white/30'}`}>
              Loading Tips
            </span>
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-250 ease-out"
                style={{ width: `${Math.min(progress * 33.3, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-400 ${progress > 38 ? 'opacity-60 translate-x-0 text-purple-400' : 'opacity-0 -translate-x-5 text-white/30'}`}>
              Connecting
            </span>
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-250 ease-out"
                style={{ width: `${Math.max(0, Math.min((progress - 33.3) * 33.3, 100))}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-400 ${progress > 72 ? 'opacity-60 translate-x-0 text-blue-400' : 'opacity-0 -translate-x-5 text-white/30'}`}>
              Ready
            </span>
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-250 ease-out"
                style={{ width: `${Math.max(0, Math.min((progress - 66.7) * 33.3, 100))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', animationDelay: '0ms'}} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)', animationDelay: '180ms'}} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{background: 'linear-gradient(135deg, #3b82f6, #22d3ee)', animationDelay: '360ms'}} />
        </div>

        <p className="mt-8 text-[9px] text-white/15 uppercase tracking-[0.3em] font-medium" style={{animation: 'fadeInUp 0.6s ease-out 1.2s both', opacity: 0}}>
          v8.0.0 • Build 800
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.32; transform: scale(1.06); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(5deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes letterIn {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes barGrow {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;