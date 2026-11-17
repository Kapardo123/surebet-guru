type Status = "upcoming" | "active" | "pending" | "won" | "lost" | "draw";

const styles: Record<Status, { label: string; cls: string } | null> = {
  upcoming: null,
  active: null,
  pending: { label: "Pending", cls: "text-muted-foreground bg-secondary" },
  won: { label: "Won", cls: "text-success bg-success/10" },
  lost: { label: "Lost", cls: "text-loss bg-loss/10" },
  draw: { label: "Draw", cls: "text-gold bg-gold/10" },
};

/** Settlement label. Renders nothing while a pick is still open. */
const StatusTag = ({ status }: { status: Status }) => {
  const s = styles[status];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center h-5 px-1.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] ${s.cls}`}>
      {s.label}
    </span>
  );
};

export const PremiumTag = () => (
  <span className="inline-flex items-center h-5 px-1.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] text-gold bg-gold/10">
    Premium
  </span>
);

export default StatusTag;
