import { CSSProperties, ReactNode } from "react";

/**
 * Hand-drawn red-pen marks, as if the tipster scribbled on the form guide.
 * Every path is a single stroke with pathLength=1 so it can draw itself on.
 */

const pen = (delay = 0, dur = 0.7): CSSProperties =>
  ({ ["--pen-delay" as string]: `${delay}s`, ["--pen-dur" as string]: `${dur}s` });

const stroke = {
  fill: "none",
  stroke: "hsl(var(--red))",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Loose oval around whatever it wraps. Slightly overshoots, like a real pen. */
export const PenCircle = ({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) => (
  <span className={`relative inline-block ${className}`}>
    {children}
    <svg className="absolute -inset-x-[22%] -inset-y-[30%] pointer-events-none overflow-visible" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
      <path
        {...stroke}
        strokeWidth={2.2}
        vectorEffect="non-scaling-stroke"
        pathLength={1}
        className="pen-draw"
        style={pen(delay)}
        d="M62 6 C34 2 6 12 5 31 C4 50 34 57 58 55 C82 53 97 42 95 27 C93 12 72 4 46 7 C38 8 30 11 26 14"
      />
    </svg>
  </span>
);

/** Wobbly underline that sits under a line of text. */
export const PenUnderline = ({ delay = 0, className = "" }: { delay?: number; className?: string }) => (
  <svg className={`block w-full h-3 overflow-visible ${className}`} viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
    <path
      {...stroke}
      strokeWidth={2.4}
      vectorEffect="non-scaling-stroke"
      pathLength={1}
      className="pen-draw"
      style={pen(delay, 0.55)}
      d="M2 8 C40 4 80 10 120 6 C150 3 175 7 198 4"
    />
  </svg>
);

/** Quick tick mark. */
export const PenTick = ({ delay = 0, size = 30, className = "" }: { delay?: number; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" className={`overflow-visible ${className}`} aria-hidden>
    <path {...stroke} strokeWidth={3} pathLength={1} className="pen-draw" style={pen(delay, 0.45)} d="M4 16 L12 24 C16 15 21 9 27 3" />
  </svg>
);

/** Curved arrow, pointing up and to the right by default. */
export const PenArrow = ({ delay = 0, className = "", flip = false }: { delay?: number; className?: string; flip?: boolean }) => (
  <svg viewBox="0 0 60 40" className={`overflow-visible ${flip ? "-scale-x-100" : ""} ${className}`} aria-hidden>
    <path {...stroke} strokeWidth={2.2} pathLength={1} className="pen-draw" style={pen(delay, 0.5)} d="M3 36 C14 34 34 30 50 8" />
    <path {...stroke} strokeWidth={2.2} pathLength={1} className="pen-draw" style={pen(delay + 0.45, 0.2)} d="M40 9 L51 6 L52 18" />
  </svg>
);

/** Handwritten note in red ink. */
export const PenNote = ({
  children,
  rotate = -6,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  rotate?: number;
  delay?: number;
  className?: string;
}) => (
  <span
    className={`pen-note inline-block leading-none whitespace-nowrap ${className}`}
    style={{ ["--pen-rot" as string]: `${rotate}deg`, ["--pen-delay" as string]: `${delay}s` }}
  >
    {children}
  </span>
);
