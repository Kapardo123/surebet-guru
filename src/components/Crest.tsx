import { useId } from "react";

// Club-like colour pairs: [primary, secondary].
const PAIRS: [string, string][] = [
  ["#c8102e", "#ffffff"], ["#034694", "#ffffff"], ["#6cabdd", "#1c2c5b"], ["#fdb913", "#231f20"],
  ["#00a650", "#ffffff"], ["#7a263a", "#1bb1e7"], ["#ffffff", "#132257"], ["#e30613", "#000000"],
  ["#004d98", "#a50044"], ["#ffcc00", "#003e7e"], ["#1d428a", "#c8102e"], ["#000000", "#ffffff"],
  ["#ef7d00", "#1f1f1f"], ["#5c2d91", "#f5c518"], ["#0b6e4f", "#f2c94c"], ["#8a1538", "#e2b04a"],
];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** The two club colours a team is drawn in (stable per name). */
export const teamColors = (name: string): [string, string] => PAIRS[hash(name || "?") % PAIRS.length];

const initials = (name: string) =>
  (name || "")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 || /\p{Lu}/u.test(w))
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/**
 * Generated shield used when a team has no logo. Colours and pattern come
 * from the name, so a team always gets the same crest.
 */
const Crest = ({ name, size = 28 }: { name: string; size?: number }) => {
  const id = useId().replace(/:/g, "");
  const h = hash(name || "?");
  const [a, b] = PAIRS[h % PAIRS.length];
  const pattern = (h >> 5) % 4;
  const text = initials(name);
  const light = ["#ffffff", "#fdb913", "#ffcc00", "#6cabdd", "#f2c94c"].includes(a);

  return (
    <svg width={size} height={size} viewBox="0 0 40 44" aria-label={`${name} crest`} role="img">
      <defs>
        <clipPath id={`s${id}`}>
          <path d="M20 1 L38 6 V20 C38 31 30 39 20 43 C10 39 2 31 2 20 V6 Z" />
        </clipPath>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#s${id})`}>
        <rect width="40" height="44" fill={a} />
        {pattern === 1 && [8, 20, 32].map((x) => <rect key={x} x={x - 3} y="0" width="6" height="44" fill={b} />)}
        {pattern === 2 && <path d="M-4 30 L30 -4 L44 4 L4 44 Z" fill={b} />}
        {pattern === 3 && <rect x="20" y="0" width="20" height="44" fill={b} />}
        {pattern === 0 && <rect x="0" y="27" width="40" height="17" fill={b} />}
        <rect width="40" height="44" fill={`url(#g${id})`} />
      </g>
      <path d="M20 1 L38 6 V20 C38 31 30 39 20 43 C10 39 2 31 2 20 V6 Z" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1.6" />
      <text
        x="20"
        y="23"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Unbounded, system-ui, sans-serif"
        fontWeight={900}
        fontSize={text.length > 1 ? 13 : 16}
        fill={light && pattern !== 3 ? "#111827" : "#ffffff"}
        stroke={light && pattern !== 3 ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.45)"}
        strokeWidth="2"
        paintOrder="stroke"
      >
        {text}
      </text>
    </svg>
  );
};

export default Crest;
