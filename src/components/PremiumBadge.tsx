import { Crown, Clock } from "lucide-react";
import { Link } from "react-router-dom";

interface PremiumBadgeProps {
  active: boolean;
  daysLeft: number;
  loading?: boolean;
}

const PremiumBadge = ({ active, daysLeft, loading = false }: PremiumBadgeProps) => {
  if (loading || !active) return null;

  return (
    <Link to="/premium">
      <div className="flex items-center gap-1.5 bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-full px-3 py-1.5 cursor-pointer hover:border-accent/50 transition-colors">
        <Crown className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] font-display font-bold text-accent">
          {daysLeft}d
        </span>
        <Clock className="w-3 h-3 text-accent/60" />
      </div>
    </Link>
  );
};

export default PremiumBadge;
