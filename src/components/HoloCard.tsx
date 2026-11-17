import { PointerEvent, ReactNode, useRef } from "react";

/**
 * Wrapper that tilts its child towards the pointer and drives the holo foil
 * via --mx/--my. Without a pointer the foil drifts on its own (holo-idle).
 */
const HoloCard = ({
  children,
  holo = true,
  maxTilt = 10,
  className = "",
  innerClassName = "",
}: {
  children: ReactNode;
  holo?: boolean;
  maxTilt?: number;
  className?: string;
  innerClassName?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty("--mx", String(x));
    el.style.setProperty("--my", String(y));
    el.style.transform = `rotateY(${(x - 0.5) * 2 * maxTilt}deg) rotateX(${(0.5 - y) * 2 * maxTilt}deg)`;
    el.classList.remove("holo-idle");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    if (holo) el.classList.add("holo-idle");
  };

  return (
    <div className={`[perspective:1000px] ${className}`} onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}>
      <div
        ref={ref}
        className={`transition-transform duration-200 ease-out will-change-transform ${holo ? "holo holo-idle" : ""} ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
};

export default HoloCard;
