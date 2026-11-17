/**
 * Faint ink diagram of the playing surface, printed behind the featured
 * fixture the way a match preview sketches the pitch.
 */
const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  vectorEffect: "non-scaling-stroke" as const,
};

const Football = () => (
  <g {...common}>
    <rect x="2" y="2" width="196" height="126" />
    <line x1="100" y1="2" x2="100" y2="128" />
    <circle cx="100" cy="65" r="17" />
    <circle cx="100" cy="65" r="1.2" fill="currentColor" />
    <rect x="2" y="30" width="30" height="70" />
    <rect x="2" y="48" width="11" height="34" />
    <path d="M32 52 A16 16 0 0 1 32 78" />
    <rect x="168" y="30" width="30" height="70" />
    <rect x="187" y="48" width="11" height="34" />
    <path d="M168 52 A16 16 0 0 0 168 78" />
  </g>
);

const Tennis = () => (
  <g {...common}>
    <rect x="6" y="10" width="188" height="110" />
    <line x1="6" y1="24" x2="194" y2="24" />
    <line x1="6" y1="106" x2="194" y2="106" />
    <line x1="100" y1="6" x2="100" y2="124" strokeWidth={2.2} />
    <line x1="54" y1="24" x2="54" y2="106" />
    <line x1="146" y1="24" x2="146" y2="106" />
    <line x1="54" y1="65" x2="146" y2="65" />
  </g>
);

const Basketball = () => (
  <g {...common}>
    <rect x="2" y="2" width="196" height="126" />
    <line x1="100" y1="2" x2="100" y2="128" />
    <circle cx="100" cy="65" r="15" />
    <rect x="2" y="45" width="38" height="40" />
    <circle cx="40" cy="65" r="12" />
    <path d="M2 14 L16 14 A58 58 0 0 1 16 116 L2 116" />
    <rect x="160" y="45" width="38" height="40" />
    <circle cx="160" cy="65" r="12" />
    <path d="M198 14 L184 14 A58 58 0 0 0 184 116 L198 116" />
  </g>
);

const PitchLines = ({ sport, className = "" }: { sport?: string | null; className?: string }) => {
  const s = (sport || "").toLowerCase();
  const Surface = s.includes("tennis") ? Tennis : s.includes("basket") ? Basketball : Football;
  return (
    <svg viewBox="0 0 200 130" preserveAspectRatio="none" className={className} aria-hidden>
      <Surface />
    </svg>
  );
};

export default PitchLines;
