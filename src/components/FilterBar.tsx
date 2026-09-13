import { useState } from "react";
import { Gem, SlidersHorizontal, Award, Check } from "@/components/icons/gsb";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

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

const premiumLabels: Record<PremiumFilter, string> = {
  all: "All",
  premium: "Premium",
  free: "Free",
};

/** Compact trigger + native bottom-sheet with the same filters. */
const FilterBar = ({
  sports,
  activeSport,
  onSportChange,
  activePremium,
  onPremiumChange,
  totalItems,
  filteredItems,
}: FilterBarProps) => {
  const [open, setOpen] = useState(false);

  const hasSports = !!sports && sports.length > 0 && !!onSportChange;
  const activeCount =
    (hasSports && activeSport && activeSport !== "All" ? 1 : 0) +
    (activePremium !== "all" ? 1 : 0);

  const chipBase =
    "text-xs px-3 py-2 rounded-full border font-medium transition-colors min-h-[40px] inline-flex items-center gap-1.5";
  const chipOff = "border-white/[0.08] text-white/65 hover:bg-white/5";
  const chipOn = "border-transparent bg-pink-500 text-white";

  const reset = () => {
    onSportChange?.("All");
    onPremiumChange("all");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white/80 hover:bg-white/[0.07] active:scale-[0.98] transition-all"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>

        <span className="text-xs text-white/55 font-display font-medium">
          {filteredItems} of {totalItems}
        </span>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#0d0018] border-t border-white/10">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-base text-white">Filters</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-2 space-y-5">
            {hasSports && (
              <div className="space-y-2.5">
                <p className="text-[11px] uppercase tracking-[0.15em] text-white/50 font-bold">Sport</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => onSportChange?.("All")}
                    className={`${chipBase} ${activeSport === "All" ? chipOn : chipOff}`}
                  >
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
                </div>
              </div>
            )}

            <div className="space-y-2.5">
              <p className="text-[11px] uppercase tracking-[0.15em] text-white/50 font-bold">Type</p>
              <div className="flex flex-wrap gap-1.5">
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
              </div>
            </div>
          </div>

          <div className="px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3">
            <button
              onClick={reset}
              className="h-11 px-5 rounded-xl border border-white/10 text-white/70 text-sm font-semibold active:scale-[0.98] transition-all"
            >
              Clear
            </button>
            <DrawerClose asChild>
              <button className="flex-1 h-11 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                <Check className="w-4 h-4 brightness-0 invert" />
                Show {filteredItems}
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default FilterBar;
