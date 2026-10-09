import { Award, Gem } from "@/components/icons/gsb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PremiumFilter = "all" | "premium" | "free";

export interface SortOption {
  value: string;
  label: string;
}

interface WebFilterBarProps {
  sports?: string[];
  activeSport?: string;
  onSportChange?: (sport: string) => void;
  activePremium: PremiumFilter;
  onPremiumChange: (value: PremiumFilter) => void;
  totalItems: number;
  filteredItems: number;
  sortOptions?: SortOption[];
  sortBy?: string;
  onSortChange?: (value: string) => void;
  accent?: "pink" | "cyan";
}

const premiumLabels: Record<PremiumFilter, string> = {
  all: "All",
  premium: "Premium",
  free: "Free",
};

const chipBase =
  "text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer";
const chipOff = "border-white/[0.08] text-white/60 hover:bg-white/5 hover:text-white/85";
const chipOn = "border-transparent bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-sm shadow-pink-500/25";

/** Web toolbar: sport/type filters + a real sort control. Presentation only. */
const WebFilterBar = ({
  sports,
  activeSport,
  onSportChange,
  activePremium,
  onPremiumChange,
  totalItems,
  filteredItems,
  sortOptions,
  sortBy,
  onSortChange,
}: WebFilterBarProps) => {
  const hasSports = !!sports && sports.length > 0 && !!onSportChange;
  const activeCount =
    (hasSports && activeSport && activeSport !== "All" ? 1 : 0) + (activePremium !== "all" ? 1 : 0);

  const reset = () => {
    onSportChange?.("All");
    onPremiumChange("all");
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {hasSports && (
            <>
              <span className="hidden lg:inline text-[10px] uppercase tracking-[0.18em] text-white/35 font-bold">Sport</span>
              <button onClick={() => onSportChange?.("All")} className={`${chipBase} ${activeSport === "All" ? chipOn : chipOff}`}>
                <Award className={`w-3 h-3 ${activeSport === "All" ? "brightness-0 invert" : ""}`} />
                All
              </button>
              {sports!.map((sport) => (
                <button
                  key={sport}
                  onClick={() => onSportChange?.(sport)}
                  className={`${chipBase} ${activeSport === sport ? chipOn : chipOff}`}
                >
                  {sport}
                </button>
              ))}
              <span className="hidden sm:block w-px h-5 bg-white/10 mx-1" />
            </>
          )}

          <span className="hidden lg:inline text-[10px] uppercase tracking-[0.18em] text-white/35 font-bold">Type</span>
          {(["all", "premium", "free"] as PremiumFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => onPremiumChange(type)}
              className={`${chipBase} ${activePremium === type ? chipOn : chipOff}`}
            >
              {type === "premium" && <Gem className={`w-3 h-3 ${activePremium === type ? "brightness-0 invert" : ""}`} />}
              {premiumLabels[type]}
            </button>
          ))}

          {activeCount > 0 && (
            <button onClick={reset} className="text-xs text-white/45 hover:text-white/80 underline underline-offset-4 transition-colors ml-1">
              Clear
            </button>
          )}
        </div>

        {/* Sort + count */}
        <div className="flex items-center gap-3 ml-auto">
          {sortOptions && sortOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-white/35 font-bold">Sort</span>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="h-9 w-[168px] gap-1.5 rounded-full border-white/10 bg-white/[0.04] px-3.5 text-xs font-semibold text-white/85 hover:bg-white/[0.07] focus:ring-0 focus:ring-offset-0 [&>span]:truncate">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0018] border-white/10 text-white/85">
                  {sortOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium focus:bg-white/[0.06] focus:text-white">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <span className="text-xs text-white/55 font-display font-medium whitespace-nowrap">
            {filteredItems} <span className="text-white/30">/ {totalItems}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default WebFilterBar;
