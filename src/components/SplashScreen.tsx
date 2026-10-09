import { useEffect, useRef, useState } from "react";

// Lightweight splash: the same GSB lockup as the header, rendered with pure CSS
// animations (transform/opacity only) instead of framer-motion, so first paint
// stays cheap. Shown once per session. Styles live in index.css (.splash-screen*).
const SplashScreen = ({ onFinish }: { onFinish?: () => void }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Keep the latest callback in a ref so the one-shot effect stays pinned to
  // mount and never restarts when the parent re-renders.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    if (sessionStorage.getItem("splash_shown")) {
      onFinishRef.current?.();
      return;
    }

    setIsVisible(true);

    const fadeTimer = setTimeout(() => setIsFadingOut(true), 2300);
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem("splash_shown", "true");
      onFinishRef.current?.();
    }, 2800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`splash-screen${isFadingOut ? " splash-screen--out" : ""}`}
      aria-hidden="true"
    >
      <div className="splash-screen__glow splash-screen__glow--pink" />
      <div className="splash-screen__glow splash-screen__glow--cyan" />

      <div className="splash-screen__content">
        <div className="splash-screen__badge">
          <span className="splash-screen__badge-inner">
            <span className="splash-screen__mono">GSB</span>
          </span>
        </div>
        <div className="splash-screen__word">Great Sport Bets</div>
        <div className="splash-screen__bar"><span /></div>
      </div>
    </div>
  );
};

export default SplashScreen;
