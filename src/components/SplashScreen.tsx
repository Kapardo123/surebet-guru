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
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(236,72,153,0.08) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(139,92,246,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.06) 0%, transparent 50%)',
          }}
        />
        <div 
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full blur-[120px]"
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(139,92,246,0.1), transparent)',
            animation: 'aurora 6s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.12), transparent)',
            animation: 'floatSlow 7s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute top-1/4 right-1/4 w-[250px] h-[250px] rounded-full blur-[100px]"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.1), transparent)',
            animation: 'floatSlow 8s ease-in-out infinite reverse'
          }}
        />

        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className={`relative z-10 flex flex-col items-center transform transition-all duration-1000 ${showContent ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-10 scale-90 opacity-0'}`}>
        <div className="relative mb-12">
          <div 
            className="absolute -inset-16 rounded-[3rem] opacity-20"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(236,72,153,0.4) 25%, transparent 50%, rgba(59,130,246,0.4) 75%, transparent 100%)',
              animation: 'spin 8s linear infinite',
              filter: 'blur(40px)',
            }}
          />

          <div 
            className="relative px-14 py-10 rounded-[2rem]"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(40px)',
              boxShadow: '0 32px 80px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 100px -20px rgba(236,72,153,0.2)',
            }}
          >
            <div className="text-center relative">
              <div className="flex items-baseline justify-center gap-[2px] mb-0.5 leading-none">
                {['G','R','E','A','T'].map((letter, i) => (
                  <span
                    key={i}
                    className="text-[56px] md:text-[72px] font-black tracking-[-0.03em] inline-block"
                    style={{
                      color: '#ffffff',
                      animation: `letterReveal 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 * i}s both`,
                      textShadow: `
                        0 0 40px rgba(255,255,255,0.5),
                        0 0 80px rgba(255,255,255,0.2),
                        0 2px 0 rgba(0,0,0,0.3)
                      `,
                    }}
                  >{letter}</span>
                ))}
              </div>
              
              <div className="flex items-baseline justify-center gap-[2px] -mt-1 leading-none">
                {['S','P','O','R','T'].map((letter, i) => (
                  <span
                    key={i}
                    className="text-[56px] md:text-[72px] font-black tracking-[-0.03em] inline-block"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, #f472b6 0%, #a855f7 35%, #6366f1 65%, #38bdf8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: `letterReveal 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.45 + 0.1 * i}s both`,
                      filter: 'drop-shadow(0 0 24px rgba(168,85,247,0.6)) drop-shadow(0 0 48px rgba(168,85,247,0.3))',
                    }}
                  >{letter}</span>
                ))}
              </div>

              <div className="mt-5 pt-4 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex items-center justify-center gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: i === 2 
                          ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' 
                          : 'rgba(255,255,255,0.15)',
                        boxShadow: i === 2 ? '0 0 12px rgba(168,85,247,0.6)' : 'none',
                        animation: `dotPulse 1.5s ease-in-out ${0.9 + 0.15 * i}s infinite`,
                        transform: i === 2 ? 'scale(1.4)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <span
                  className="block mt-3 text-sm font-bold uppercase tracking-[0.5em]"
                  style={{
                    color: 'rgba(255,255,255,0.25)',
                    animation: 'fadeInUp 0.8s ease-out 1.1s both',
                    letterSpacing: '0.45em',
                  }}
                >BETS</span>
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <div className="mt-5 flex justify-center gap-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-[2px] rounded-full"
                    style={{
                      width: i === 0 || i === 3 ? '24px' : '40px',
                      background: 'linear-gradient(90deg, rgba(236,72,153,0.6), rgba(139,92,246,0.6), rgba(59,130,246,0.6))',
                      animation: `barSlide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${1.2 + 0.12 * i}s both`,
                      transformOrigin: i % 2 === 0 ? 'left' : 'right',
                      opacity: 0.5,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div 
            className="absolute -top-3 -left-3 w-6 h-6 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236,72,153,0.6), transparent)',
              filter: 'blur(8px)',
              animation: 'twinkle 2s ease-in-out infinite',
            }}
          />
          <div 
            className="absolute -bottom-4 -right-4 w-8 h-8 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(59,130,246,0.5), transparent)',
              filter: 'blur(10px)',
              animation: 'twinkle 2.5s ease-in-out infinite reverse',
            }}
          />
        </div>

        <div className="mt-16 space-y-4 w-80 max-w-[90vw]">
          {[
            { label: 'Loading Tips', threshold: 8, color: '#ec4899', toColor: '#a855f7' },
            { label: 'Connecting', threshold: 38, color: '#a855f7', toColor: '#6366f1' },
            { label: 'Ready', threshold: 72, color: '#6366f1', toColor: '#38bdf8' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span 
                className={`text-[10px] font-bold uppercase tracking-wider transition-all duration-500 min-w-[90px]`}
                style={{
                  color: progress > item.threshold ? item.color : 'rgba(255,255,255,0.18)',
                  opacity: progress > item.threshold ? 0.75 : 0.4,
                  transform: progress > item.threshold ? 'translateX(0)' : 'translateX(-8px)',
                  textShadow: progress > item.threshold ? `0 0 12px ${item.color}40` : 'none',
                }}
              >{item.label}</span>
              <div className="flex-1 h-[2px] bg-white/[0.04] rounded-full overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-out"
                  style={{ 
                    width: `${Math.min(idx === 0 ? progress * 33.3 : Math.max(0, Math.min((progress - idx * 33.3) * 33.3, 100))}%` ,
                    background: `linear-gradient(90deg, ${item.color}, ${item.toColor})`,
                    boxShadow: `0 0 8px ${item.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  }}
                />
              </div>
              <span 
                className="text-[9px] font-mono tabular-nums min-w-[28px] text-right"
                style={{
                  color: progress > item.threshold ? `${item.color}99` : 'rgba(255,255,255,0.15)',
                }}
              >
                {Math.round(Math.min(idx === 0 ? progress * 33.3 : Math.max(0, Math.min((progress - idx * 33.3) * 33.3, 100))))}%
              </span>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-3">
          <div 
            className="w-2.5 h-2.5 rounded-full animate-ping" 
            style={{background: 'linear-gradient(135deg, #ec4899, #f472b6)', animationDuration: '1.2s'}} 
          />
          <div 
            className="w-2.5 h-2.5 rounded-full animate-ping" 
            style={{background: 'linear-gradient(135deg, #a855f7, #c084fc)', animationDuration: '1.4s', animationDelay: '0.2s'}} 
          />
          <div 
            className="w-2.5 h-2.5 rounded-full animate-ping" 
            style={{background: 'linear-gradient(135deg, #6366f1, #818cf8)', animationDuration: '1.6s', animationDelay: '0.4s'}} 
          />
        </div>

        <p 
          className="mt-8 text-[9px] uppercase tracking-[0.35em] font-medium"
          style={{
            color: 'rgba(255,255,255,0.12)',
            animation: 'fadeInUp 0.8s ease-out 1.4s both',
            opacity: 0,
          }}
        >v8.0.0 • Build 800</p>
      </div>

      <style>{`
        @keyframes aurora {
          0%, 100% { opacity: 0.6; transform: translate(-50%, 0) scale(1) rotate(0deg); }
          33% { opacity: 0.9; transform: translate(-52%, -5%) scale(1.05) rotate(1deg); }
          66% { opacity: 0.7; transform: translate(-48%, 3%) scale(0.97) rotate(-1deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(15px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes letterReveal {
          0% { 
            opacity: 0; 
            transform: translateY(30px) scale(0.5) rotateX(-90deg); 
            filter: blur(12px); 
          }
          60% { 
            filter: blur(2px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0) scale(1) rotateX(0deg); 
            filter: blur(0); 
          }
        }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes barSlide {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 0.5; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;