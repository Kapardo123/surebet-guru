type Status = "upcoming" | "active" | "pending" | "won" | "lost" | "draw";

const stamps: Record<Status, { label: string; cls: string } | null> = {
  upcoming: null,
  active: null,
  pending: { label: "Pending", cls: "text-muted-foreground border-muted-foreground" },
  won: { label: "Won", cls: "text-success border-success" },
  lost: { label: "Lost", cls: "text-red border-red" },
  draw: { label: "Draw", cls: "text-draw border-draw" },
};

/**
 * Rubber stamp for a settled pick. Slightly rotated and faded at the edges,
 * like it was pressed onto the paper by hand. Renders nothing while open.
 */
const StatusTag = ({ status, className = "", animate = true }: { status: Status; className?: string; animate?: boolean }) => {
  const s = stamps[status];
  if (!s) return null;
  return (
    <span
      className={`inline-block font-display font-black uppercase text-[19px] leading-none tracking-[0.06em] px-2 pt-[3px] pb-[2px] border-[2.5px] rounded-[3px] -rotate-[7deg] opacity-90 select-none ${animate ? "stamp-in" : ""} ${s.cls} ${className}`}
      style={{ maskImage: "radial-gradient(circle at 30% 40%, #000 55%, rgba(0,0,0,.75) 75%, #000 100%)" }}
    >
      {s.label}
    </span>
  );
};

/** Small ink label marking members-only content. */
export const PremiumTag = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-center h-5 px-1.5 bg-foreground text-background font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] ${className}`}>
    Members
  </span>
);

export default StatusTag;
