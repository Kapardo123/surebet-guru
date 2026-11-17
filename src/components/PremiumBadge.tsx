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
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-gold/30 text-gold text-xs font-semibold"
    >
      Premium
      <span className="text-gold/70 font-medium tabular-nums">{daysLeft}d</span>
    </Link>
  );
};

export default PremiumBadge;
