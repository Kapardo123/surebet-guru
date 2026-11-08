import { useState, useRef, useCallback } from "react";
import AdminLoginDialog from "@/components/AdminLoginDialog";

// Animated wordmark: a rotating-gradient bolt badge + a Bebas Neue wordmark with
// a pink/cyan shimmer sweep. Styling/animation live in index.css (.gsb-logo*).
const Logo = ({ compact = false }: { compact?: boolean } = {}) => {
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
        className={`gsb-logo select-none cursor-pointer flex items-center gap-2 min-w-0 group${compact ? " gsb-logo--compact" : ""}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTap(); }}
        aria-label="Great Sport Bets"
        role="button"
      >
        <span className="gsb-logo__badge" aria-hidden="true">
          <span className="gsb-logo__badge-inner">
            <span className="gsb-logo__mono">GSB</span>
          </span>
        </span>
        <span className="gsb-logo__word">Great Sport Bets</span>
      </div>

      <AdminLoginDialog open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default Logo;
