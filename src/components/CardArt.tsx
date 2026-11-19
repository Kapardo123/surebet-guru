import { ReactNode } from "react";
import TeamLogo from "@/components/TeamLogo";
import PitchLines from "@/components/PitchLines";
import { sportTheme } from "@/lib/sport";
import { teamColors } from "@/components/Crest";

/** Illustrated window at the top of a card: surface diagram + both crests. */
const CardArt = ({
  sport,
  league,
  home,
  away,
  homeLogo,
  awayLogo,
  size = 40,
  holo = false,
  sparkles = false,
  className = "",
  children,
}: {
  sport?: string | null;
  /** Helps the logo lookup find the right club. */
  league?: string | null;
  home: string;
  away: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  size?: number;
  holo?: boolean;
  sparkles?: boolean;
  className?: string;
  children?: ReactNode;
}) => {
  const t = sportTheme(sport);
  // Club colours: a vivid one per side (white/black kits fall back to the second colour).
  const vivid = (n: string) => {
    const [a, b] = teamColors(n);
    return ["#ffffff", "#000000"].includes(a) ? b : a;
  };
  const homeC = vivid(home);
  const awayC = vivid(away);
  const crest = (name: string, logo: string | null | undefined, ring: string) => (
    <span
      className="grid place-items-center rounded-full bg-[hsl(42_45%_96%)] shadow-[0_6px_14px_rgba(0,0,0,.35),inset_0_-2px_0_rgba(0,0,0,.08)]"
      style={{ width: size + 16, height: size + 16, boxShadow: `0 0 0 3px ${ring}, 0 0 0 4.5px rgba(255,255,255,.75), 0 6px 14px rgba(0,0,0,.4)` }}
    >
      <TeamLogo teamName={name} logoUrl={logo} size={size} sport={sport ?? undefined} league={league} tone="light" />
    </span>
  );
  return (
    <div
      className={`relative overflow-hidden ${holo ? "holo holo-idle" : ""} ${className}`}
      style={{ backgroundColor: t.frame, backgroundImage: `url(${t.texture})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <PitchLines sport={sport} className="parallax-far absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)]" style={{ color: t.lines }} />
      {/* Home and away colours washing in from each side, split on a diagonal */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(105deg, ${homeC}8c 0%, ${homeC}33 30%, ${homeC}00 49%, ${awayC}00 51%, ${awayC}33 70%, ${awayC}8c 100%)` }}
      />
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 rotate-[15deg] scale-y-125 bg-white/25"
        aria-hidden
      />
      {/* Top light, as if the surface were lit from the stands */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,.18),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="parallax-near relative h-full flex items-center justify-center gap-2.5">
        {crest(home, homeLogo, homeC)}
        <span className="font-display font-black text-white text-[12px] drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]">VS</span>
        {crest(away, awayLogo, awayC)}
      </div>
      {sparkles && (
        <>
          {[
            ["8%", "14%", "0s", 14],
            ["84%", "18%", ".7s", 10],
            ["90%", "72%", "1.3s", 16],
            ["12%", "78%", "1.9s", 9],
          ].map(([l, t2, d, sz], i) => (
            <span
              key={i}
              className="sparkle absolute"
              style={{ left: l as string, top: t2 as string, animationDelay: d as string, width: sz as number, height: sz as number }}
              aria-hidden
            />
          ))}
        </>
      )}
      {children}
    </div>
  );
};

export default CardArt;
