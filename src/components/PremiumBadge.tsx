import { Link } from "react-router-dom";

interface PremiumBadgeProps {
  active: boolean;
  daysLeft: number;
  loading?: boolean;
}

const PremiumBadge = ({ active, daysLeft, loading = false }: PremiumBadgeProps) => {
  if (loading || !active) return null;
  return (
    <Link to="/premium" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full foil-gold text-stock-ink text-[13px] font-bold">
      Gold
      <span className="opacity-70 tabular-nums">{daysLeft}d</span>
    </Link>
  );
};

export default PremiumBadge;
