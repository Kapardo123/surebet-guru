import { Loader2 } from "lucide-react";
import HoloCard from "@/components/HoloCard";

const tiers = {
  bronze: "linear-gradient(140deg,#5a3214,#d08a4a 30%,#7a4520 50%,#f0b077 70%,#6b3a17)",
  silver: "linear-gradient(140deg,#5c6270,#e6ebf2 28%,#8a93a3 50%,#ffffff 66%,#6f7787)",
  gold: "linear-gradient(140deg,#8a6416,#f6dc8a 24%,#b98a2a 46%,#fff1b8 62%,#a8781f)",
};

// Crimped (zig-zag) top and bottom seals.
const CRIMP =
  "linear-gradient(#000 0 0) center / 100% calc(100% - 14px) no-repeat, " +
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 10px 7px repeat-x, " +
  "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 10px 7px repeat-x";

/** A foil booster pack with crimped ends. One per membership length. */
const BoosterPack = ({
  tier,
  days,
  price,
  perDay,
  badge,
  featured,
  loading,
  disabled,
  onClick,
}: {
  tier: keyof typeof tiers;
  days: string;
  price: string;
  perDay: string;
  badge?: string;
  featured?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative block w-full text-left disabled:opacity-60 ${featured ? "-translate-y-3" : ""}`}
    aria-label={`${days} pass, ${price}`}
  >
    {badge && (
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap h-6 px-2.5 rounded-full bg-red text-white text-[10.5px] font-bold uppercase tracking-[0.08em] grid place-items-center shadow">
        {badge}
      </span>
    )}
    <HoloCard holo={featured} maxTilt={14}>
      <div
        className="relative text-stock-ink shadow-[0_16px_30px_-12px_rgba(0,0,0,.8)] foil-shimmer"
        style={{
          background: tiers[tier],
          WebkitMask: CRIMP,
          mask: CRIMP,
        }}
      >
        <div className="px-2.5 pt-6 pb-6 min-h-[210px] flex flex-col items-center text-center">
          <span className="text-[9.5px] font-black uppercase tracking-[0.18em] opacity-70">GSB · {tier}</span>
          <span className="mt-3 w-12 h-16 rounded-[6px] bg-stock-ink/85 grid place-items-center -rotate-6 shadow-md">
            <span className="font-display font-black text-[11px] text-white/90">{days.split(" ")[0]}</span>
          </span>
          <span className="font-display font-black uppercase text-[15px] leading-none mt-3">{days}</span>
          <span className="flex-1" />
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin mt-3" />
          ) : (
            <span className="num font-black text-[22px] leading-none mt-3">{price}</span>
          )}
          <span className="text-[10.5px] font-semibold opacity-75 mt-1">{perDay}</span>
        </div>
      </div>
    </HoloCard>
  </button>
);

export default BoosterPack;
