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
  `shrink-0 h-9 px-4 rounded-full text-[13.5px] font-semibold transition-colors ${
    active ? "bg-foreground text-background" : "bg-white/[0.06] text-foreground/80 hover:bg-white/[0.1]"
  }`;

const FilterBar = ({ sports, activeSport, onSportChange, activePremium, onPremiumChange }: FilterBarProps) => {
  const showSports = !!(sports && sports.length > 1 && onSportChange);
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
      {(["all", "free", "premium"] as PremiumFilter[]).map((t) => (
        <button
          key={t}
          onClick={() => onPremiumChange(t)}
          className={
            t === "premium" && activePremium === t
              ? "shrink-0 h-9 px-4 rounded-full text-[13.5px] font-bold foil-gold text-stock-ink"
              : chip(activePremium === t)
          }
        >
          {t === "all" ? "All" : t === "free" ? "Common" : "Gold"}
        </button>
      ))}
      {showSports && (
        <>
          <span className="shrink-0 w-px h-6 bg-white/15 mx-1" aria-hidden />
          <button onClick={() => onSportChange!("All")} className={chip(activeSport === "All")}>Every sport</button>
          {sports!.map((sp) => (
            <button key={sp} onClick={() => onSportChange!(sp)} className={chip(activeSport === sp)}>
              {sp}
            </button>
          ))}
        </>
      )}
    </div>
  );
};

export default FilterBar;
