import { useState, useRef, useCallback } from "react";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import mark from "@/assets/brand/mark.svg";

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
        <img
          src={mark}
          alt=""
          aria-hidden
          draggable={false}
          className={`shrink-0 drop-shadow-[0_4px_10px_rgba(0,0,0,.45)] ${size === "lg" ? "w-20 h-20" : "w-10 h-10"}`}
        />
        <span className={`font-display font-black uppercase leading-[0.92] tracking-[-0.02em] text-foreground ${size === "lg" ? "text-[30px]" : "text-[14px]"}`}>
          Great Sport
          <br />
          <span className="foil-gold-text">Bets</span>
        </span>
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
