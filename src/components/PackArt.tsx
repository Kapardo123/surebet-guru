import { motion } from "framer-motion";
import crinkle from "@/assets/textures/pack-crinkle.webp";
import crimp from "@/assets/textures/pack-crimp.webp";
import { season } from "@/lib/theme";

export type PackStage = "sealed" | "leak" | "torn";

const W = 230;
const H = 318;
const SEAM = 54; // y of the perforation under the gold tear strip

// Heat-sealed teeth, top and bottom.
const TEETH =
  "linear-gradient(#000 0 0) center / 100% calc(100% - 16px) no-repeat, " +
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 12px 8px repeat-x, " +
  "conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 12px 8px repeat-x";
const TEETH_TOP =
  "linear-gradient(#000 0 0) bottom / 100% calc(100% - 8px) no-repeat, " +
  "conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / 12px 8px repeat-x";

const FOIL = "linear-gradient(150deg,#1d2a6b 0%,#4b2a86 30%,#16466f 55%,#2a1a5e 80%,#122050)";
const FOIL_WINTER = "linear-gradient(150deg,#0e4d32 0%,#9e1b24 34%,#0f5a3a 62%,#7a1420 86%,#0b3f29)";
const GOLD = "linear-gradient(135deg,#8a6416,#f6dc8a 22%,#b98a2a 40%,#fff1b8 55%,#a8781f 72%,#f2cf6a)";

// A ragged line across the seam: the edge left behind once the strip is off.
const RAGGED = (() => {
  const pts: string[] = [];
  let x = 0;
  let i = 0;
  while (x < W) {
    const y = SEAM + (i % 2 ? 5 : -3) + ((i * 37) % 7) - 3;
    pts.push(`${x}px ${y}px`);
    x += 6 + ((i * 13) % 7);
    i++;
  }
  pts.push(`${W}px ${SEAM}px`);
  return pts;
})();
const TORN_BODY = `polygon(${RAGGED.join(",")}, ${W}px ${H}px, 0px ${H}px)`;
const TORN_STRIP = `polygon(0px 0px, ${W}px 0px, ${[...RAGGED].reverse().join(",")})`;

/** The pack itself. The parent drives the stage; the strip flies off on "torn". */
const PackArt = ({ date, count, goldCount, stage = "sealed" }: { date: string; count: number; goldCount: number; stage?: PackStage }) => (
  <div className="relative text-white" style={{ width: W, height: H }}>
    {/* Body */}
    <div
      className="holo holo-idle"
      // .holo sets position: relative, so pin the body explicitly.
      style={{ position: "absolute", inset: 0, WebkitMask: TEETH, mask: TEETH, clipPath: stage === "torn" ? TORN_BODY : undefined }}
    >
      <div className="absolute inset-0" style={{ background: season() === "winter" ? FOIL_WINTER : FOIL }} />
      {season() === "winter" && <div className="absolute inset-0 snow" aria-hidden />}
      <div
        className="absolute inset-x-0 bottom-0 h-[20px] mix-blend-overlay"
        style={{ backgroundImage: `url(${crimp})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x" }}
      />
      <div className="absolute inset-x-0 border-t-2 border-dashed border-white/40" style={{ top: SEAM }} />

      <div className="absolute inset-0 pt-[74px] px-5 flex flex-col items-center text-center">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">{date}</span>
        <span className="font-display font-black uppercase text-[30px] leading-[0.95] tracking-[-0.02em] mt-3">
          Today's
          <br />
          <span className="foil-gold-text">pack</span>
        </span>
        <span className="mt-5 grid place-items-center w-[92px] h-[92px] rounded-full foil-gold shadow-[0_8px_20px_rgba(0,0,0,.45)]">
          <span className="w-[80px] h-[80px] rounded-full bg-[hsl(232_45%_12%)] grid place-items-center">
            <span className="text-center leading-none">
              <span className="block num font-black text-[30px] foil-gold-text">{count}</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-white/60 mt-1">cards</span>
            </span>
          </span>
        </span>
        {goldCount > 0 && (
          <span className="mt-3 text-[11.5px] font-semibold text-white/75">
            incl. <span className="foil-gold-text font-bold">{goldCount} Gold</span>
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-75" style={{ backgroundImage: `url(${crinkle})`, backgroundSize: "cover" }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.5),rgba(0,0,0,0)_14%,rgba(255,255,255,.1)_48%,rgba(0,0,0,0)_82%,rgba(0,0,0,.55))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.25),transparent_20%,transparent_85%,rgba(0,0,0,.45))]" />

      {/* Light from inside the pack, once the top is gone */}
      {stage === "torn" && (
        <motion.div
          className="absolute inset-x-0 h-24 bg-[radial-gradient(70%_100%_at_50%_0%,rgba(255,236,170,.9),transparent_70%)]"
          style={{ top: SEAM - 6 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>

    {/* Gold tear strip */}
    <motion.div
      className="absolute inset-x-0 top-0 flex items-end justify-center pb-2 bg-blend-overlay"
      style={{
        height: SEAM + 8,
        WebkitMask: TEETH_TOP,
        mask: TEETH_TOP,
        clipPath: TORN_STRIP,
        backgroundImage: `url(${crimp}), ${GOLD}`,
        backgroundSize: "auto 46px, 100% 100%",
        backgroundRepeat: "repeat-x, no-repeat",
        transformOrigin: "100% 100%",
      }}
      animate={stage === "torn" ? { y: -240, x: 140, rotate: 38, opacity: 0 } : { y: 0, x: 0, rotate: 0, opacity: 1 }}
      transition={stage === "torn" ? { duration: 0.75, ease: [0.3, 0.1, 0.4, 1] } : { duration: 0 }}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stock-ink/80">Tear here ✂</span>
    </motion.div>

    {/* Light leaking through the perforation while it rips, right to left */}
    {stage === "leak" && (
      <motion.div
        className="absolute right-0 h-[3px] rounded-full bg-[#fff6d6] shadow-[0_0_10px_3px_rgba(255,228,150,.9),0_0_28px_8px_rgba(255,200,90,.55)]"
        style={{ top: SEAM - 1 }}
        initial={{ width: 0 }}
        animate={{ width: W }}
        transition={{ duration: 0.55, ease: [0.6, 0, 0.4, 1] }}
      />
    )}
  </div>
);

export const PACK_SIZE = { W, H, SEAM };
export default PackArt;
