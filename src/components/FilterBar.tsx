export type PremiumFilter = "all" | "premium" | "free";

interface FilterBarProps {
  sports?: string[];
  activeSport?: string;
  onSportChange?: (sport: string) => void;
  activePremium: PremiumFilter;
  onPremiumChange: (value: PremiumFilter) => void;
  totalItems?: number;
  filteredItems?: number;
  accent?: "purple" | "blue";
}

const chip = (active: boolean) =>
  `shrink-0 h-8 px-3 rounded-full text-[13px] font-medium transition-colors whitespace-nowrap ${
    active
      ? "bg-foreground text-background"
      : "bg-secondary text-secondary-foreground hover:text-foreground"
  }`;

const premiumLabels: Record<PremiumFilter, string> = { all: "All", free: "Free", premium: "Premium" };

const FilterBar = ({ sports, activeSport, onSportChange, activePremium, onPremiumChange }: FilterBarProps) => {
  const showSports = !!(sports && sports.length > 1 && onSportChange);

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
      <div className="shrink-0 flex items-center h-8 p-0.5 rounded-full bg-secondary">
        {(["all", "free", "premium"] as PremiumFilter[]).map((type) => (
          <button
            key={type}
            onClick={() => onPremiumChange(type)}
            className={`h-7 px-3 rounded-full text-[13px] font-medium transition-colors ${
              activePremium === type
                ? type === "premium"
                  ? "bg-gold text-accent-foreground"
                  : "bg-foreground text-background"
                : "text-secondary-foreground hover:text-foreground"
            }`}
          >
            {premiumLabels[type]}
          </button>
        ))}
      </div>
      {showSports && (
        <>
          <span className="shrink-0 w-px h-5 bg-border mx-1" aria-hidden />
          <button onClick={() => onSportChange!("All")} className={chip(activeSport === "All")}>
            All sports
          </button>
          {sports!.map((sport) => (
            <button key={sport} onClick={() => onSportChange!(sport)} className={chip(activeSport === sport)}>
              {sport}
            </button>
          ))}
        </>
      )}
    </div>
  );
};

export default FilterBar;
