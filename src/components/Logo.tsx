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
        className="select-none cursor-pointer flex items-center gap-2.5"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
      >
        <span
          aria-hidden
          className="grid place-items-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-display font-bold text-[15px] leading-none tracking-tight"
        >
          GSB
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display font-bold text-[19px] tracking-[0.01em] text-foreground uppercase">
            Great Sport Bets
          </span>
          <span className="text-[10px] text-muted-foreground tracking-[0.04em] mt-1">
            Daily picks &amp; accumulators
          </span>
        </span>
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
