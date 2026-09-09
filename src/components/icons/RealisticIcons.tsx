// Realistyczne, autorskie ikony SVG — rysowane ręcznie, zgodne z tym,
// jak dane obiekty wyglądają naprawdę. Zero stockowych glifów.

interface IconProps {
  size?: number;
  className?: string;
}

/** Realistyczna tarcza strzelecka (dartboard) — metalowa obręcz, słoje
 *  czerwono-kremowe, druciki sektorowe, punktowa poświata. */
export const IconTargetReal = ({ size = 24, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
    <defs>
      <radialGradient id="tRim" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#e8e8ee" />
        <stop offset="55%" stopColor="#9a9aa8" />
        <stop offset="100%" stopColor="#4a4a58" />
      </radialGradient>
      <linearGradient id="tRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e5455a" />
        <stop offset="100%" stopColor="#b31d33" />
      </linearGradient>
      <linearGradient id="tCream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fdf6e3" />
        <stop offset="100%" stopColor="#e8d9b5" />
      </linearGradient>
    </defs>
    {/* metalowa obwęcz z odbiciem */}
    <circle cx="24" cy="24" r="22" fill="url(#tRim)" stroke="#2e2e38" strokeWidth="1" />
    <path d="M8 10 A 22 22 0 0 1 40 10" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.55" />
    {/* słoje sektorów — naprzemienne czerwone/kremowe */}
    {[
      { r: 19, fill: "url(#tCream)" },
      { r: 14.5, fill: "url(#tRed)" },
      { r: 10, fill: "url(#tCream)" },
      { r: 5.8, fill: "url(#tRed)" },
    ].map((ring, ri) => (
      <g key={ri}>
        <circle cx="24" cy="24" r={ring.r} fill={ring.fill} stroke="#7a6a4a" strokeWidth="0.35" strokeOpacity="0.5" />
        {/* druciki sektorowe */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const a = (deg * Math.PI) / 180;
          const r2 = ring.r;
          return (
            <line
              key={deg}
              x1={24 + 2.2 * Math.cos(a)} y1={24 + 2.2 * Math.sin(a)}
              x2={24 + r2 * Math.cos(a)} y2={24 + r2 * Math.sin(a)}
              stroke="#6a6a76" strokeWidth="0.4" opacity="0.7"
            />
          );
        })}
      </g>
    ))}
    {/* bullseye */}
    <circle cx="24" cy="24" r="2.4" fill="url(#tRed)" stroke="#6a1010" strokeWidth="0.4" />
    <circle cx="23" cy="23" r="0.8" fill="#ffffff" opacity="0.85" />
  </svg>
);

/** Realistyczny bilet kuponu — perforowana krawędź, linia odrywania,
 *  zadrukowany pasek, cień i połysk papieru. */
export const IconTicketReal = ({ size = 24, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
    <defs>
      <linearGradient id="tkBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5ea0f5" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="tkStub" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dbeafe" />
        <stop offset="100%" stopColor="#bfdbfe" />
      </linearGradient>
    </defs>
    {/* korpus biletu z wycięciami po bokach (perforacja przy odrywaniu) */}
    <path
      d="M6 14 Q6 12 8 12 L40 12 Q42 12 42 14 L42 20 A3 3 0 0 0 42 28 L42 34 Q42 36 40 36 L8 36 Q6 36 6 34 Z"
      fill="url(#tkBlue)" stroke="#1e3a8a" strokeWidth="1"
    />
    {/* linia perforacji — pionowa kreskowana przy stubie */}
    <line x1="31" y1="13" x2="31" y2="35" stroke="#ffffff" strokeWidth="1" strokeDasharray="2.2 2" opacity="0.9" />
    {/* pasek stubu */}
    <path d="M32 13 L40 13 Q42 13 42 15 L42 20 A3 3 0 0 0 42 28 L42 33 Q42 35 40 35 L32 35 Z" fill="url(#tkStub)" opacity="0.95" />
    {/* wycięcia półokrągłe góra/dół na linii perforacji */}
    <circle cx="31" cy="12" r="2.4" fill="#0a0015" />
    <circle cx="31" cy="36" r="2.4" fill="#0a0015" />
    {/* druk: gwiazdki i numer seryjny */}
    <text x="10" y="20" fontSize="7" fontWeight="900" fill="#ffffff" fontFamily="'DM Sans', sans-serif">★ ★ ★</text>
    <text x="10" y="30" fontSize="5.5" fontWeight="700" fill="#dbeafe" fontFamily="'DM Sans', sans-serif">№ 042517</text>
    <text x="34.5" y="26" fontSize="5.5" fontWeight="900" fill="#1d4ed8" textAnchor="middle" fontFamily="'DM Sans', sans-serif">09</text>
    {/* połysk papieru */}
    <path d="M8 13.5 L28 13.5" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
  </svg>
);

/** Realistyczne złote trofeum — czara z uchwytami, trzon, cokół, wygrawerowana
 *  jedynka, odbicia światła na metalu. */
export const IconTrophyReal = ({ size = 24, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
    <defs>
      <linearGradient id="trGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="40%" stopColor="#f59e0b" />
        <stop offset="75%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      <linearGradient id="trGoldDark" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
    </defs>
    {/* uchwyty */}
    <path d="M10 10 Q4 10 4 17 Q4 24 12 26" fill="none" stroke="url(#trGoldDark)" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M38 10 Q44 10 44 17 Q44 24 36 26" fill="none" stroke="url(#trGoldDark)" strokeWidth="2.6" strokeLinecap="round" />
    {/* czara */}
    <path d="M10 8 L38 8 Q38 24 30 28 L18 28 Q10 24 10 8 Z" fill="url(#trGold)" stroke="#78350f" strokeWidth="1" />
    {/* wygrawerowana jedynka zwycięzcy */}
    <text x="24" y="20" fontSize="12" fontWeight="900" fill="#78350f" textAnchor="middle" fontFamily="'DM Sans', sans-serif" opacity="0.75">1</text>
    {/* połysk na czarze */}
    <path d="M14 10 Q14 20 17 25" stroke="#fef3c7" strokeWidth="1.6" fill="none" opacity="0.8" strokeLinecap="round" />
    {/* trzon */}
    <rect x="21.5" y="28" width="5" height="6" fill="url(#trGoldDark)" stroke="#78350f" strokeWidth="0.6" />
    <rect x="16" y="34" width="16" height="3.4" rx="1" fill="url(#trGold)" stroke="#78350f" strokeWidth="0.6" />
    {/* cokół */}
    <rect x="13" y="38" width="22" height="4" rx="1.4" fill="url(#trGoldDark)" stroke="#5b2806" strokeWidth="0.8" />
    <path d="M15 39.2 L33 39.2" stroke="#fde68a" strokeWidth="0.7" opacity="0.7" />
  </svg>
);

/** Realistyczny fasetowany diament — korona, pawilon, wypukłe fasetki,
 *  niebiesko-białe odbicia, iskra. */
export const IconGemReal = ({ size = 24, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
    <defs>
      <linearGradient id="gemTop" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#bae6fd" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="gemBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7dd3fc" />
        <stop offset="45%" stopColor="#0ea5e9" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>
    {/* pawilon (dolny klin) */}
    <path d="M8 19 L24 42 L40 19 Z" fill="url(#gemBody)" stroke="#075985" strokeWidth="0.8" strokeLinejoin="round" />
    {/* fasetki pawilonu */}
    <path d="M8 19 L24 42 L16 19 Z" fill="#0284c7" opacity="0.55" />
    <path d="M40 19 L24 42 L32 19 Z" fill="#0ea5e9" opacity="0.55" />
    <path d="M24 42 L24 19 Z" stroke="#e0f2fe" strokeWidth="0.5" opacity="0.7" />
    {/* korona (górny pasek + stolik) */}
    <path d="M12 11 L36 11 L40 19 L8 19 Z" fill="url(#gemTop)" stroke="#075985" strokeWidth="0.8" strokeLinejoin="round" />
    <line x1="18" y1="11" x2="14" y2="19" stroke="#e0f2fe" strokeWidth="0.5" opacity="0.8" />
    <line x1="30" y1="11" x2="34" y2="19" stroke="#e0f2fe" strokeWidth="0.5" opacity="0.8" />
    <line x1="24" y1="11" x2="24" y2="19" stroke="#e0f2fe" strokeWidth="0.5" opacity="0.8" />
    {/* iskra */}
    <path d="M17 13 l1.4 2.6 2.6 1.4 -2.6 1.4 -1.4 2.6 -1.4 -2.6 -2.6 -1.4 2.6 -1.4 Z" fill="#ffffff" opacity="0.95" />
    <circle cx="31" cy="25" r="1" fill="#ffffff" opacity="0.8" />
  </svg>
);

/** Realistyczny domek — dachówka, ściana, drzwi, okno, komin z dymem. */
export const IconHouseReal = ({ size = 24, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
    <defs>
      <linearGradient id="hRoof" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
      <linearGradient id="hWall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#fcd34d" />
      </linearGradient>
    </defs>
    {/* komin */}
    <rect x="32" y="8" width="5" height="9" fill="#9a3412" stroke="#7c2d12" strokeWidth="0.6" />
    {/* dach */}
    <path d="M6 22 L24 7 L42 22 L38.5 22 L24 10.5 L9.5 22 Z" fill="url(#hRoof)" stroke="#7f1d1d" strokeWidth="0.8" strokeLinejoin="round" />
    {/* ściana */}
    <rect x="10" y="22" width="28" height="17" fill="url(#hWall)" stroke="#b45309" strokeWidth="0.8" />
    {/* drzwi */}
    <rect x="21" y="26" width="6.5" height="13" rx="1" fill="#92400e" stroke="#78350f" strokeWidth="0.6" />
    <circle cx="25.8" cy="33" r="0.7" fill="#fde68a" />
    {/* okno */}
    <rect x="13" y="26" width="6" height="6" rx="0.6" fill="#93c5fd" stroke="#1d4ed8" strokeWidth="0.7" />
    <line x1="16" y1="26" x2="16" y2="32" stroke="#1d4ed8" strokeWidth="0.5" />
    <line x1="13" y1="29" x2="19" y2="29" stroke="#1d4ed8" strokeWidth="0.5" />
  </svg>
);

/** Mała piłka nożna — pentagony, dla akcentów sportowych. */
export const IconBallReal = ({ size = 24, className = "" }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 48 48" className={className}>
    <defs>
      <radialGradient id="bBall" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="70%" stopColor="#e5e7eb" />
        <stop offset="100%" stopColor="#9ca3af" />
      </radialGradient>
    </defs>
    <circle cx="24" cy="24" r="20" fill="url(#bBall)" stroke="#374151" strokeWidth="1.2" />
    <polygon points="24,17 30,21.5 27.7,28.5 20.3,28.5 18,21.5" fill="#111827" />
    <line x1="24" y1="17" x2="24" y2="5.5" stroke="#111827" strokeWidth="1.4" />
    <line x1="30" y1="21.5" x2="41" y2="18.5" stroke="#111827" strokeWidth="1.4" />
    <line x1="27.7" y1="28.5" x2="34.5" y2="37" stroke="#111827" strokeWidth="1.4" />
    <line x1="20.3" y1="28.5" x2="13.5" y2="37" stroke="#111827" strokeWidth="1.4" />
    <line x1="18" y1="21.5" x2="7" y2="18.5" stroke="#111827" strokeWidth="1.4" />
  </svg>
);