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

const item = (active: boolean) =>
  `shrink-0 h-9 px-3 font-mono text-[13px] uppercase tracking-[0.04em] border-[1.5px] transition-colors ${
    active
      ? "bg-foreground text-background border-foreground font-semibold"
      : "border-foreground/30 text-foreground hover:border-foreground"
  }`;

const premiumLabels: Record<PremiumFilter, string> = { all: "All", free: "Free", premium: "Members" };

/** Index-style text filters, like the section list on a sports page. */
const FilterBar = ({ sports, activeSport, onSportChange, activePremium, onPremiumChange }: FilterBarProps) => {
  const showSports = !!(sports && sports.length > 1 && onSportChange);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="label w-14 shrink-0 text-foreground">Show</span>
        {(["all", "free", "premium"] as PremiumFilter[]).map((t) => (
          <span key={t} className="contents">
            <button onClick={() => onPremiumChange(t)} className={item(activePremium === t)}>
              {premiumLabels[t]}
            </button>
          </span>
        ))}
      </div>
      {showSports && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mr-4 pr-4">
          <span className="label w-14 shrink-0 text-foreground">Sport</span>
          <button onClick={() => onSportChange!("All")} className={item(activeSport === "All")}>All</button>
          {sports!.map((sport) => (
            <span key={sport} className="contents">
              <button onClick={() => onSportChange!(sport)} className={item(activeSport === sport)}>
                {sport}
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
