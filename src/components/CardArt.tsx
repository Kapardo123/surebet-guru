import TeamLogo from "@/components/TeamLogo";
import PitchLines from "@/components/PitchLines";
import { sportTheme } from "@/lib/sport";

/** Illustrated window at the top of a card: surface diagram + both crests. */
const CardArt = ({
  sport,
  home,
  away,
  homeLogo,
  awayLogo,
  size = 40,
  className = "",
}: {
  sport?: string | null;
  home: string;
  away: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  size?: number;
  className?: string;
}) => {
  const t = sportTheme(sport);
  const crest = (name: string, logo?: string | null) => (
    <span
      className="grid place-items-center rounded-full bg-white/90 shadow-[0_4px_12px_rgba(0,0,0,.35)] ring-2 ring-white/60"
      style={{ width: size + 14, height: size + 14 }}
    >
      <TeamLogo teamName={name} logoUrl={logo} size={size} sport={sport ?? undefined} />
    </span>
  );
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: t.art }}>
      <PitchLines sport={sport} className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-white/25" />
      <div className="absolute inset-0 bg-[radial-gradient(hsl(0_0%_100%/.12)_1px,transparent_1.4px)] [background-size:6px_6px] mix-blend-overlay" />
      <div className="relative h-full flex items-center justify-center gap-3">
        {crest(home, homeLogo)}
        <span className="font-display font-black text-white/90 text-[13px] drop-shadow">VS</span>
        {crest(away, awayLogo)}
      </div>
    </div>
  );
};

export default CardArt;
