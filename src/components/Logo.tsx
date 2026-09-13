import { useState, useRef, useCallback } from "react";
import AdminLoginDialog from "@/components/AdminLoginDialog";
import logo from "@/assets/brand/logo.png";

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
        className="select-none cursor-pointer flex items-center group"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
      >
        <img
          src={logo}
          alt="Great Sport Bets"
          draggable={false}
          className="h-6 sm:h-7 md:h-8 w-auto transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
