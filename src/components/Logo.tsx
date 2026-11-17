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
        className="select-none cursor-pointer flex items-center gap-2.5"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
      >
        <span className={`relative shrink-0 ${size === "lg" ? "w-16 h-16" : "w-8 h-8"}`} aria-hidden>
          <span className="absolute inset-y-0 left-0 w-[64%] rounded-[22%] bg-stock -rotate-[14deg] origin-bottom shadow" />
          <span className="absolute inset-y-0 right-0 w-[64%] rounded-[22%] foil-gold rotate-[10deg] origin-bottom shadow-[0_2px_6px_rgba(0,0,0,.4)] grid place-items-center">
            <span className={`font-display font-black text-stock-ink ${size === "lg" ? "text-[20px]" : "text-[10px]"}`}>G</span>
          </span>
        </span>
        <span className={`font-display font-black uppercase leading-[0.95] tracking-[-0.02em] text-foreground ${size === "lg" ? "text-[30px]" : "text-[14px]"}`}>
          Great Sport<br />Bets
        </span>
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
