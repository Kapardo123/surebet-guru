import { Crown, Filter, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type PremiumFilter = "all" | "premium" | "free";

interface FilterBarProps {
  sports?: string[];
  activeSport?: string;
  onSportChange?: (sport: string) => void;
  activePremium: PremiumFilter;
  onPremiumChange: (value: PremiumFilter) => void;
  totalItems: number;
  filteredItems: number;
  accent?: "purple" | "blue";
}

const FilterBar = ({
  sports,
  activeSport,
  onSportChange,
  activePremium,
  onPremiumChange,
  totalItems,
  filteredItems,
  accent = "purple",
}: FilterBarProps) => {
  const accentGradients = {
    purple: {
      active: "from-pink-500 via-purple-500 to-fuchsia-500",
      borderActive: "border-pink-500/50",
      border: "border-purple-500/20",
      bg: "bg-purple-500/10",
      text: "text-purple-300",
      borderActive2: "border-purple-500/50",
    },
    blue: {
      active: "from-blue-500 via-cyan-500 to-teal-500",
      borderActive: "border-blue-500/50",
      border: "border-blue-500/20",
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      borderActive2: "border-blue-500/50",
    },
  };
  const c = accentGradients[accent];

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Filter
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium">
          <span className="font-display">
            Showing {filteredItems} of {totalItems}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sports && sports.length > 0 && onSportChange && (
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1">
              <button
                onClick={() => onSportChange("All")}
                className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                  activeSport === "All"
                    ? `bg-gradient-to-r ${c.active} text-white border-transparent shadow-md shadow-black/30`
                    : `border ${c.border} ${c.text} hover:${c.borderActive} hover:bg-white/5`
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-3 h-3" />
                  All
                </span>
              </button>
              {sports.map((sport) => (
                <button
                  key={sport}
                  onClick={() => onSportChange(sport)}
                  className={`text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all ${
                    activeSport === sport
                      ? `bg-gradient-to-r ${c.active} text-white border-transparent shadow-md shadow-black/30`
                      : `border ${c.border} ${c.text} hover:${c.borderActive} hover:bg-white/5`
                  }`}
                >
                  {sport}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`flex items-center gap-1.5 ${sports && sports.length > 0 && onSportChange ? "pt-1 border-t border-border/20" : ""}`}>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-bold mr-1">
            TYPE
          </span>
          {(["all", "premium", "free"] as PremiumFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => onPremiumChange(type)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-medium uppercase tracking-wider transition-all ${
                activePremium === type
                  ? `bg-gradient-to-r ${c.active} text-white border-transparent shadow-md shadow-black/30`
                  : `border ${c.border} ${c.text} hover:${c.borderActive} hover:bg-white/5`
              }`}
            >
              {type === "all" && <span>All</span>}
              {type === "premium" && (
                <span className="flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" />
                  Premium
                </span>
              )}
              {type === "free" && <span>Free</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
