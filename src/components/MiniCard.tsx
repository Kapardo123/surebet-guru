import { Lock } from "lucide-react";
import CardArt from "@/components/CardArt";
import SportGlyph from "@/components/SportGlyph";
import { kickoffParts } from "@/lib/format";
import { sportTheme } from "@/lib/sport";

export interface MiniCardData {
  sport?: string | null;
  league?: string | null;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  prediction?: string | null;
  odds?: number | null;
  kickoff?: string | null;
}

/**
 * Small trading card used in the pack opening fan, album pockets and coupon
 * sets. Same anatomy as the full TipCard: odds in the title bar, art window,
 * notched name ribbon, pick, footer.
 */
const MiniCard = ({
  card,
  gold = false,
  hidden = false,
  lost = false,
  className = "",
}: {
  card: MiniCardData;
  gold?: boolean;
  /** Pick and odds withheld (members only). */
  hidden?: boolean;
  lost?: boolean;
  className?: string;
}) => {
  const t = sportTheme(card.sport);
  const ko = card.kickoff ? kickoffParts(card.kickoff) : null;
  const frameStyle = gold
    ? undefined
    : {
        backgroundColor: t.frame,
        backgroundImage: `linear-gradient(145deg, hsl(${t.hue} 60% 62% / .9), transparent 40%, transparent 60%, hsl(${t.hue} 60% 18% / .85))`,
      };

  return (
    <div
      className={`rounded-[10px] p-[3px] shadow-[0_8px_18px_-6px_rgba(0,0,0,.75)] ${gold ? "foil-weave" : ""} ${lost ? "grayscale-[.8] opacity-75" : ""} ${className}`}
      style={frameStyle}
    >
      <div className={`relative h-full rounded-[7px] text-stock-ink overflow-hidden flex flex-col ${gold ? "bg-[linear-gradient(170deg,hsl(44_70%_93%),hsl(40_45%_87%))]" : "paper bg-stock"}`}>
        <span className={`pointer-events-none absolute inset-[2px] rounded-[5px] border ${gold ? "border-[#b98a2a]/40" : "border-stock-ink/10"}`} aria-hidden />

        {/* Title bar */}
        <div className="relative flex items-center gap-1 px-1.5 h-[18px]">
          <span
            className="grid place-items-center w-3 h-3 rounded-full text-white shrink-0"
            style={{ background: gold ? "linear-gradient(135deg,#b98a2a,#f6dc8a)" : t.frame }}
          >
            <SportGlyph sport={card.sport} size={7} />
          </span>
          <span className="flex-1" />
          <span className={`num font-black text-[11px] leading-none ${gold ? "foil-gold-text" : ""}`}>
            {hidden || card.odds == null ? "?.??" : card.odds.toFixed(2)}
          </span>
        </div>

        {/* Art */}
        <div className="relative mx-[3px]">
          <CardArt
            sport={card.sport}
            league={card.league}
            home={card.homeTeam}
            away={card.awayTeam}
            homeLogo={card.homeTeamLogo}
            awayLogo={card.awayTeamLogo}
            size={13}
            holo={gold && !hidden}
            className="h-[44px] rounded-[4px] ring-1 ring-black/20"
          />
          <span className="pointer-events-none absolute inset-0 rounded-[4px] bg-[linear-gradient(160deg,rgba(255,255,255,.28),transparent_40%)]" aria-hidden />
        </div>

        {/* Ribbon */}
        <div
          className="relative -mt-1.5 mx-[2px] px-2 py-[3px] text-center bg-[linear-gradient(180deg,hsl(232_32%_20%),hsl(232_38%_12%))]"
          style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 4px) 50%, 100% 100%, 0 100%, 4px 50%)" }}
        >
          <p className="font-display font-extrabold uppercase text-[7px] leading-[1.15] truncate text-white">{card.homeTeam}</p>
          <p className={`font-display font-extrabold uppercase text-[7px] leading-[1.15] truncate ${gold ? "text-[#e7c35e]" : "text-white/60"}`}>{card.awayTeam}</p>
        </div>

        {/* Pick */}
        <div className="px-1.5 pt-1 flex-1 min-h-0">
          {hidden ? (
            <span className="flex items-center gap-1 text-[9px] font-semibold opacity-60">
              <Lock className="w-2.5 h-2.5" /> Members
            </span>
          ) : (
            <p className="text-[9.5px] font-semibold leading-tight line-clamp-2">{card.prediction}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-1.5 pb-1 text-[7.5px] font-semibold">
          <span className="opacity-60 truncate">{ko ? `${ko.time} ${ko.day}` : card.league}</span>
          <span
            className="w-1.5 h-1.5 rotate-45 rounded-[1px] shrink-0"
            style={{ background: gold ? "linear-gradient(135deg,#b98a2a,#fff1b8)" : "currentColor", opacity: gold ? 1 : 0.5 }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
};

export default MiniCard;
