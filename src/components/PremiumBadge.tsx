import { Gem, Timer } from "lucide-react";
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
      <div className="flex items-center gap-1.5 bg-pink-500/10 border border-pink-500/30 rounded-full px-3 py-1.5 cursor-pointer hover:border-pink-500/50 transition-colors">
        <Gem className="w-3.5 h-3.5 text-pink-400" />
        <span className="text-[11px] font-display font-bold text-pink-300">
          {daysLeft}d
        </span>
        <Timer className="w-3 h-3 text-pink-400/60" />
      </div>
    </Link>
  );
};

export default PremiumBadge;
