import { Loader2 } from "lucide-react";
import HoloCard from "@/components/HoloCard";
import crinkle from "@/assets/textures/pack-crinkle.webp";
import crimp from "@/assets/textures/pack-crimp.webp";

// Metal foil per tier + the colour of the printed band across the front.
const TIERS = {
  bronze: {
    foil: "linear-gradient(115deg,#4a250f 0%,#b8743a 18%,#f3b77c 34%,#8c4f22 52%,#e6a465 70%,#5c2f12 100%)",
    band: "linear-gradient(160deg,#6d1f14,#a3321d)",
    ink: "#2a1206",
    name: "Bronze",
  },
  silver: {
    foil: "linear-gradient(115deg,#4b525f 0%,#c9d0db 18%,#ffffff 33%,#8d96a6 52%,#e9eef5 70%,#59606d 100%)",
    band: "linear-gradient(160deg,#15284f,#2a4c8f)",
    ink: "#141a26",
    name: "Silver",
  },
  gold: {
    foil: "linear-gradient(115deg,#6b4a0e 0%,#d9ad45 18%,#fff0b5 33%,#a8781f 52%,#f6d978 70%,#73500f 100%)",
    band: "linear-gradient(160deg,#121528,#272c52)",
    ink: "#241805",
    name: "Gold",
  },
} as const;

// Zig-zag teeth where the wrapper is heat-sealed, top and bottom.
const TEETH =
  "linear-gradient(#000 0 0) center / 100% calc(100% - 12px) no-repeat, " +
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 9px 6px repeat-x, " +
  "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 9px 6px repeat-x";

/** Ridged heat-seal strip at either end of the pack. */
const Seal = ({ at }: { at: "top" | "bottom" }) => (
  <div
    className={`absolute inset-x-0 ${at === "top" ? "top-0" : "bottom-0"} h-[9%] mix-blend-overlay`}
    style={{ backgroundImage: `url(${crimp})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
  >
    <div className={`absolute inset-x-0 ${at === "top" ? "bottom-0" : "top-0"} h-px bg-black/40`} />
  </div>
);

/**
 * A sealed foil booster pack, one per membership length: crinkled metal
 * wrapper, ridged seals, printed front with a window onto the card inside,
 * shop price sticker, and a tilt + glare under the finger.
 */
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
  tier: keyof typeof TIERS;
  days: string;
  price: string;
  perDay: string;
  badge?: string;
  featured?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) => {
  const t = TIERS[tier];
  const n = days.split(" ")[0];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative block w-full text-left disabled:opacity-60 ${featured ? "-translate-y-3" : ""}`}
      aria-label={`${t.name} pack: ${days} of Gold for ${price}`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap h-6 px-2.5 rounded-full bg-red text-white text-[10.5px] font-bold uppercase tracking-[0.08em] grid place-items-center shadow-[0_4px_10px_rgba(0,0,0,.4)]">
          {badge}
        </span>
      )}

      <HoloCard holo={false} maxTilt={16}>
        <div className="relative">
          <div
            className="relative aspect-[10/16.5] overflow-hidden"
            style={{ WebkitMask: TEETH, mask: TEETH, background: t.foil, color: t.ink }}
          >
            <Seal at="top" />
            <Seal at="bottom" />

            {/* Tear notch */}
            <span className="absolute right-0 top-[9%] w-0 h-0 border-y-[4px] border-y-transparent border-r-[6px] border-r-[hsl(var(--background))]" />
            <span className="absolute right-[7px] top-[calc(9%-3px)] text-[6px] font-black tracking-[0.1em] opacity-60">TEAR</span>

            {/* Printed front */}
            <div className="absolute inset-x-0 top-[11%] bottom-[11%] flex flex-col items-center px-2">
              <span className="text-[7.5px] font-black uppercase tracking-[0.18em] opacity-75 leading-none">Great Sport Bets</span>
              <span className="font-display font-black uppercase text-[11px] leading-none mt-1 tracking-[-0.01em]">Gold pass</span>

              {/* Diagonal printed band with the window onto the card inside */}
              <div className="relative w-[118%] mt-1.5 py-1.5 -rotate-[8deg] flex justify-center shadow-[0_2px_0_rgba(255,255,255,.25),0_-1px_0_rgba(0,0,0,.3)]" style={{ background: t.band }}>
                <div className="rotate-[8deg] relative w-[33%] aspect-[5/7] rounded-[6px] p-[2px] bg-[linear-gradient(135deg,#b98a2a,#fff1b8,#c99a33)] shadow-[0_4px_10px_rgba(0,0,0,.5)]">
                  <div className="h-full rounded-[4px] card-back grid place-items-center">
                    <span className="font-display font-black text-[8px] foil-gold-text">GSB</span>
                  </div>
                  {/* plastic window glare */}
                  <span className="absolute inset-0 rounded-[6px] bg-[linear-gradient(130deg,rgba(255,255,255,.45),transparent_40%,transparent_70%,rgba(255,255,255,.15))]" />
                </div>
              </div>

              <span className="flex items-end gap-1 mt-2 leading-none">
                <span className="font-display font-black text-[34px] tracking-[-0.04em] leading-[0.8]">{n}</span>
                <span className="font-display font-black uppercase text-[10px] pb-0.5">days</span>
              </span>
              <span className="text-[7px] font-bold uppercase tracking-[0.12em] opacity-70 mt-1 whitespace-nowrap">Full Gold access</span>
              <span className="text-[6.5px] font-semibold uppercase tracking-[0.14em] opacity-55 mt-0.5">Series 26/27 · {t.name}</span>
            </div>

            {/* Crinkled foil, pillow shading and moving glare over everything */}
            <div
              className="absolute inset-0 mix-blend-overlay opacity-70"
              style={{ backgroundImage: `url(${crinkle})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.45),rgba(0,0,0,0)_14%,rgba(255,255,255,.12)_48%,rgba(0,0,0,0)_80%,rgba(0,0,0,.5))]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.35),transparent_14%,transparent_86%,rgba(0,0,0,.4))]" />
            <div className="absolute inset-0 foil-shimmer" />
          </div>

          {/* Shop price sticker */}
          <span className="absolute -right-1.5 -bottom-1.5 z-10 rotate-[-8deg] rounded-[6px] bg-[hsl(42_45%_96%)] text-stock-ink px-2 py-1 shadow-[0_4px_10px_rgba(0,0,0,.45)] border border-black/10">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="num font-black text-[14px] leading-none block">{price}</span>
            )}
          </span>
        </div>
      </HoloCard>

      {/* Contact shadow on the felt */}
      <span className="block mx-auto mt-2 h-2 w-[80%] rounded-[50%] bg-black/50 blur-[4px] group-active:w-[70%] transition-all" />
      <span className="block text-center text-[11.5px] font-semibold text-muted-foreground mt-1.5">{perDay}</span>
    </button>
  );
};

export default BoosterPack;
