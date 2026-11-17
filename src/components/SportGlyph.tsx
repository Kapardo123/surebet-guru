import {
  MdSportsSoccer, MdSportsTennis, MdSportsBasketball, MdSportsHockey, MdSportsVolleyball,
  MdSportsMma, MdSportsEsports, MdSportsHandball, MdSportsBaseball, MdSportsFootball, MdEmojiEvents,
} from "react-icons/md";

/** Small pictogram for a sport, used in card title bars. */
const SportGlyph = ({ sport, size = 14, className = "" }: { sport?: string | null; size?: number; className?: string }) => {
  const s = (sport || "").toLowerCase();
  const Icon = s.includes("tennis") ? MdSportsTennis
    : s.includes("basket") ? MdSportsBasketball
    : s.includes("hockey") ? MdSportsHockey
    : s.includes("volley") ? MdSportsVolleyball
    : s.includes("mma") || s.includes("box") ? MdSportsMma
    : s.includes("esport") || s.includes("e-sport") ? MdSportsEsports
    : s.includes("hand") ? MdSportsHandball
    : s.includes("baseball") ? MdSportsBaseball
    : s.includes("american") || s.includes("nfl") ? MdSportsFootball
    : s.includes("football") || s.includes("soccer") || !s ? MdSportsSoccer
    : MdEmojiEvents;
  return <Icon size={size} className={className} aria-hidden />;
};

export default SportGlyph;
