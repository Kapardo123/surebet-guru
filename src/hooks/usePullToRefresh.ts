import { useEffect, useRef, useState } from "react";

/**
 * Native-feeling pull-to-refresh for pages that scroll on the window.
 * Only engages when the page is already at the top; ignores taps/scrolls.
 */
export const usePullToRefresh = (onRefresh: () => Promise<unknown>, threshold = 60) => {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const pull = useRef(0);
  const busy = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || busy.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) {
        pull.current = Math.min(90, delta * 0.5);
        setPullY(pull.current);
      }
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (pull.current > threshold && !busy.current) {
        busy.current = true;
        setRefreshing(true);
        Promise.resolve(onRefreshRef.current()).finally(() => {
          busy.current = false;
          setRefreshing(false);
          pull.current = 0;
          setPullY(0);
        });
      } else {
        pull.current = 0;
        setPullY(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [threshold]);

  return { pullY, refreshing };
};
