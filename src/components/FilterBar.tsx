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
  `shrink-0 py-1 font-mono text-[11.5px] uppercase tracking-[0.06em] transition-colors ${
    active
      ? "text-foreground font-semibold underline decoration-red decoration-2 underline-offset-[5px]"
      : "text-muted-foreground hover:text-foreground"
  }`;

const Slash = () => <span className="shrink-0 font-mono text-[11.5px] text-foreground/25" aria-hidden>/</span>;

const premiumLabels: Record<PremiumFilter, string> = { all: "All", free: "Free", premium: "Members" };

/** Index-style text filters, like the section list on a sports page. */
const FilterBar = ({ sports, activeSport, onSportChange, activePremium, onPremiumChange }: FilterBarProps) => {
  const showSports = !!(sports && sports.length > 1 && onSportChange);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2.5">
        <span className="label w-12 shrink-0">Show</span>
        {(["all", "free", "premium"] as PremiumFilter[]).map((t, i) => (
          <span key={t} className="contents">
            {i > 0 && <Slash />}
            <button onClick={() => onPremiumChange(t)} className={item(activePremium === t)}>
              {premiumLabels[t]}
            </button>
          </span>
        ))}
      </div>
      {showSports && (
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar -mr-4 pr-4">
          <span className="label w-12 shrink-0">Sport</span>
          <button onClick={() => onSportChange!("All")} className={item(activeSport === "All")}>All</button>
          {sports!.map((sport) => (
            <span key={sport} className="contents">
              <Slash />
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
