import { useEffect, useState } from "react";
import { animate, useMotionValue } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  className?: string;
}

/** Number that springs to the new value — used for odds/winnings. */
const AnimatedNumber = ({ value, decimals = 2, prefix = "", className = "" }: AnimatedNumberProps) => {
  const motionValue = useMotionValue(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.55, ease: "easeOut" });
    const unsubscribe = motionValue.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, motionValue]);

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
};

export default AnimatedNumber;
