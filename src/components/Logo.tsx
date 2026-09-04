import { useState, useRef, useCallback } from "react";
import AdminLoginDialog from "@/components/AdminLoginDialog";

const Logo = () => {
  const [tapCount, setTapCount] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTap = useCallback(() => {
    const next = tapCount + 1;
    setTapCount(next);

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);

    if (next >= 5) {
      setTapCount(0);
      setShowLogin(true);
    }
  }, [tapCount]);

  return (
    <>
      <div
        className="select-none cursor-pointer flex items-baseline gap-0.5 group"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
      >
        <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-primary via-[hsl(280,80%,65%)] to-accent bg-clip-text text-transparent transition-all group-hover:scale-105 duration-300 drop-shadow-[0_0_8px_rgba(155,135,245,0.3)]">
          GREAT
        </span>
        <span className="text-xl font-extralight tracking-[0.15em] text-foreground/80">
          SPORT
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.35em] text-accent/70 ml-1 mb-px">
          BETS
        </span>
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
