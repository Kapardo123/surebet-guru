import { useMemo } from "react";

/** Decorative barcode derived from a seed, so each slip or pass has its own. */
const Barcode = ({ seed, bars = 34, className = "h-7" }: { seed: number; bars?: number; className?: string }) => {
  const widths = useMemo(() => {
    let x = (seed * 9301 + 49297) % 233280 || 7;
    return Array.from({ length: bars }, () => {
      x = (x * 9301 + 49297) % 233280;
      return 1 + (x % 3);
    });
  }, [seed, bars]);
  return (
    <div className={`flex items-stretch gap-[2px] ${className}`} aria-hidden>
      {widths.map((w, i) => (
        <span key={i} className={i % 2 ? "bg-transparent" : "bg-current"} style={{ width: w }} />
      ))}
    </div>
  );
};

/** Stable 5-digit number from any string id. */
export const numberFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 10000 + (h % 90000);
};

export default Barcode;
