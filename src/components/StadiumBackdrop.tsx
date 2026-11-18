import stadium from "@/assets/textures/stadium-night.webp";

/**
 * Night-stadium band behind the top of a screen. It fades out with a mask
 * (not a colour overlay) so it melts into the felt texture without a seam.
 * The image is generated locally by scripts/gen_textures.py.
 */
const StadiumBackdrop = ({ height = 420, className = "" }: { height?: number; className?: string }) => (
  <div
    className={`pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden ${className}`}
    style={{
      height,
      WebkitMaskImage: "linear-gradient(to bottom, #000 35%, transparent)",
      maskImage: "linear-gradient(to bottom, #000 35%, transparent)",
    }}
    aria-hidden
  >
    <img src={stadium} alt="" className="w-full h-full object-cover object-top" />
    <div className="absolute inset-0 bg-[hsl(232_36%_8%/.25)]" />
  </div>
);

export default StadiumBackdrop;
