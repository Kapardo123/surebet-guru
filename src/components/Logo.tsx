import { useState, useRef, useCallback } from "react";
import AdminLoginDialog from "@/components/AdminLoginDialog";

const Logo = ({ size = "sm" }: { size?: "sm" | "lg" }) => {
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
        className="select-none cursor-pointer"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
      >
        {size === "lg" ? (
          <span className="block font-display font-black uppercase text-foreground leading-[0.82] tracking-[-0.01em] text-[clamp(40px,13.2vw,96px)] whitespace-nowrap">
            Great Sport Bets
          </span>
        ) : (
          <span className="flex items-baseline gap-1.5 font-display font-black uppercase leading-none text-foreground text-[24px] tracking-[-0.005em]">
            Great Sport Bets
            <span className="w-1.5 h-1.5 rounded-full bg-red translate-y-[-2px]" aria-hidden />
          </span>
        )}
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
