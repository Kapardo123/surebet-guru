import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Number that rolls up from zero the first time it scrolls into view,
 * like a scoreboard. Non-numeric values (e.g. "—") are shown as is.
 */
const CountUp = ({ value, decimals, duration = 0.9, className = "" }: { value: string | number; decimals?: number; duration?: number; className?: string }) => {
  const target = typeof value === "number" ? value : parseFloat(value);
  const dp = decimals ?? (typeof value === "string" && value.includes(".") ? value.split(".")[1].length : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce || isNaN(target) ? target : 0);

  useEffect(() => {
    if (isNaN(target)) return;
    if (reduce) return setShown(target);
    if (!inView) return;
    const c = animate(0, target, { duration, ease: [0.2, 0.8, 0.2, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, target, duration, reduce]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {isNaN(target) ? value : shown.toFixed(dp)}
    </span>
  );
};

export default CountUp;
