import { Link } from "react-router-dom";

interface PremiumBadgeProps {
  active: boolean;
  daysLeft: number;
  loading?: boolean;
}

const PremiumBadge = ({ active, daysLeft, loading = false }: PremiumBadgeProps) => {
  if (loading || !active) return null;

  return (
    <Link
      to="/premium"
      className="inline-flex items-center gap-1.5 h-7 px-2 bg-foreground text-background font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]"
    >
      Member
      <span className="opacity-70 tabular-nums">{daysLeft}d</span>
    </Link>
  );
};

export default PremiumBadge;
