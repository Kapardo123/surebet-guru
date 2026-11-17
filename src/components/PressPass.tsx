import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { PointerEvent } from "react";
import Barcode from "@/components/Barcode";

interface PressPassProps {
  issued: boolean;
  name?: string | null;
  memberNo?: number | null;
  validUntil?: string | null;
  daysLeft?: number;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
};

/**
 * Members' press pass. Tilts in 3D under the finger, with a foil strip that
 * catches the light. Not issued = paper proof with a red NOT ISSUED stamp.
 */
const PressPass = ({ issued, name, memberNo, validUntil, daysLeft }: PressPassProps) => {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-14, 14]);
  const rotateX = useTransform(sy, [0, 1], [10, -10]);
  const foil = useTransform(sx, [0, 1], ["0% 50%", "100% 50%"]);
  const glare = useTransform(sx, [0, 1], ["-40%", "140%"]);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const until = fmtDate(validUntil);
  const ink = issued ? "bg-foreground text-background" : "bg-card text-foreground border-2 border-dashed border-foreground/40";

  return (
    <div className="[perspective:900px] flex justify-center py-2" onPointerMove={onMove} onPointerLeave={reset} onPointerUp={reset}>
      {/* Lanyard */}
      <motion.div
        initial={{ y: -24, opacity: 0, rotate: -6 }}
        animate={{ y: 0, opacity: 1, rotate: -2.5 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
        className="relative w-full max-w-[340px]"
      >
        <div className="absolute left-1/2 -translate-x-1/2 -top-10 w-6 h-12 bg-red [clip-path:polygon(0_0,100%_0,80%_100%,20%_100%)]" aria-hidden />
        <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-9 h-6 rounded-[3px] border-[3px] border-[hsl(40_10%_55%)] bg-transparent z-20" aria-hidden />

        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className={`relative overflow-hidden rounded-[10px] shadow-[0_18px_30px_-12px_rgba(30,20,10,0.45)] touch-none select-none ${ink}`}
        >
          {/* Punched slot */}
          <div className="absolute left-1/2 -translate-x-1/2 top-3 w-14 h-3 rounded-full bg-background shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]" />

          {/* Foil strip */}
          {issued && (
            <motion.div
              className="absolute left-0 top-0 bottom-0 w-3.5"
              style={{
                backgroundImage: "linear-gradient(110deg,#8a6a1f,#e9cf7a,#a47c25,#f6e4a6,#8a6a1f,#d9b85a)",
                backgroundSize: "300% 100%",
                backgroundPosition: foil,
              }}
            />
          )}

          <div className="relative px-6 pl-8 pt-9 pb-5">
            <div className="flex items-center justify-between">
              <span className="font-display font-black uppercase text-[15px] tracking-[0.02em] flex items-center gap-1.5">
                Great Sport Bets <span className="w-1.5 h-1.5 rounded-full bg-red" />
              </span>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] opacity-70">Season 26/27</span>
            </div>

            <p className="font-display font-black uppercase text-[58px] leading-[0.82] mt-3 tracking-[-0.01em]">
              Press<br />Pass
            </p>

            <dl className="mt-4 grid grid-cols-[72px_1fr] gap-y-1.5 font-mono text-[12px] uppercase tracking-[0.05em]">
              <dt className="opacity-60">Name</dt>
              <dd className="truncate font-semibold">{name || (issued ? "Member" : "Your name here")}</dd>
              <dt className="opacity-60">No.</dt>
              <dd className="font-semibold">{memberNo ? `GSB-${memberNo}` : "GSB-·····"}</dd>
              <dt className="opacity-60">Valid</dt>
              <dd className="font-semibold">
                {issued && until ? `Until ${until}` : issued ? `${daysLeft ?? 0} days` : "—"}
              </dd>
            </dl>

            <div className="mt-5 flex items-end justify-between gap-3">
              <Barcode seed={memberNo || 7} bars={28} className="h-9" />
              <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${issued ? "opacity-70" : "opacity-50"}`}>
                {issued ? "Admit one reader" : "Proof copy"}
              </span>
            </div>
          </div>

          {/* Stamp */}
          <div
            className={`absolute right-4 top-[92px] font-display font-black uppercase leading-none px-2.5 pt-1 pb-0.5 border-[3px] rounded-[4px] stamp-in ${
              issued ? "text-[26px] text-red border-red bg-foreground/0" : "text-[30px] text-red border-red"
            }`}
            style={{ ["--stamp-rot" as string]: issued ? "-12deg" : "-14deg", maskImage: "radial-gradient(circle at 30% 40%, #000 55%, rgba(0,0,0,.7) 75%, #000)" }}
          >
            {issued ? "All access" : "Not issued"}
          </div>

          {/* Glare */}
          <motion.div
            className="pointer-events-none absolute -inset-y-10 w-24 rotate-[20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent mix-blend-overlay"
            style={{ left: glare }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PressPass;
