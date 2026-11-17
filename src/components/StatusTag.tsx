type Status = "upcoming" | "active" | "pending" | "won" | "lost" | "draw";

const seals: Record<Status, { label: string; cls: string } | null> = {
  upcoming: null,
  active: null,
  pending: { label: "Live", cls: "bg-secondary text-foreground ring-foreground/30" },
  won: { label: "Win", cls: "foil-gold text-[hsl(232_40%_12%)] ring-[#fff1b8]" },
  lost: { label: "Loss", cls: "bg-red text-white ring-white/40" },
  draw: { label: "Push", cls: "bg-[hsl(230_15%_60%)] text-[hsl(232_40%_12%)] ring-white/40" },
};

/** Round seal stuck onto a settled card. Nothing while the pick is open. */
const StatusTag = ({ status, className = "", animate = true }: { status: Status; className?: string; animate?: boolean }) => {
  const s = seals[status];
  if (!s) return null;
  return (
    <span
      className={`grid place-items-center w-[52px] h-[52px] rounded-full ring-2 ring-inset shadow-[0_4px_10px_rgba(0,0,0,.35)] -rotate-12 font-display font-black uppercase text-[12px] tracking-tight ${animate ? "seal-pop" : ""} ${s.cls} ${className}`}
    >
      {s.label}
    </span>
  );
};

/** Gold foil chip marking a members' card. */
export const PremiumTag = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-center h-5 px-2 rounded-full foil-gold text-[hsl(232_40%_12%)] text-[10px] font-bold uppercase tracking-[0.1em] ${className}`}>
    Gold
  </span>
);

export default StatusTag;
