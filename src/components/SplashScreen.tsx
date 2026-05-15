import { useEffect, useState } from "react";

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    setShowContent(true);

    const duration = 3000;
    const interval = 25;
    const step = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + step;
        return next >= 100 ? 100 : next;
      });
    }, interval);

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, duration - 300);

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
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.3) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(168,85,247,0.15), transparent)',
            animation: 'float 4s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent)',
            animation: 'float 5s ease-in-out infinite reverse'
          }}
        />
      </div>

      <div className={`relative z-10 flex flex-col items-center transform transition-all duration-700 ${showContent ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'}`}>
        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-[2px] shadow-2xl shadow-purple-500/30"
              style={{animation: 'glow 2s ease-in-out infinite'}}
            >
              <div className="w-full h-full rounded-2xl bg-[#0a0a0a] flex items-center justify-center">
                <span className="text-3xl font-black text-white tracking-tight">G</span>
              </div>
            </div>
            
            <div className="flex flex-col items-start -ml-1">
              <h1 className="text-3xl font-black tracking-tighter text-white leading-none">
                GREAT
              </h1>
              <h2 className="text-xl font-extralight tracking-widest text-white/60 leading-none mt-0.5">
                SPORT BETS
              </h2>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-3 w-72">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider text-white/40 transition-all duration-300 ${progress > 10 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
              Loading Tips
            </span>
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${Math.min(progress * 33.3, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider text-white/40 transition-all duration-300 ${progress > 40 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
              Connecting
            </span>
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${Math.max(0, Math.min((progress - 33.3) * 33.3, 100))}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase tracking-wider text-white/40 transition-all duration-300 ${progress > 75 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
              Ready
            </span>
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 to-orange-500 rounded-full transition-all duration-200 ease-out"
                style={{ width: `${Math.max(0, Math.min((progress - 66.7) * 33.3, 100))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay: '0ms'}} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay: '150ms'}} />
          <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{animationDelay: '300ms'}} />
        </div>

        <p className="mt-6 text-[9px] text-white/20 uppercase tracking-[0.3em] font-medium">
          v8.0.0 • Build 800
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.2); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;