import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Gem, SlidersHorizontal, Check, ChevronDown } from "@/components/icons/gsb";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

export type PremiumFilter = "all" | "premium" | "free";
export type StatusFilter = "all" | "upcoming" | "won" | "lost";
export type SortMode = "kickoff" | "recent";
export type DayFilter = "all" | "today" | "tomorrow";

interface FilterBarProps {
  sports?: string[];
  activeSport?: string;
  onSportChange?: (sport: string) => void;
  activePremium: PremiumFilter;
  onPremiumChange: (value: PremiumFilter) => void;
  status?: StatusFilter;
  onStatusChange?: (v: StatusFilter) => void;
  sort?: SortMode;
  onSortChange?: (v: SortMode) => void;
  day?: DayFilter;
  onDayChange?: (v: DayFilter) => void;
  totalItems: number;
  filteredItems: number;
}

const premiumLabels: Record<PremiumFilter, string> = { all: "filters.all", premium: "filters.premium", free: "filters.free" };
const statusLabels: Record<StatusFilter, string> = { all: "filters.anyStatus", upcoming: "filters.upcoming", won: "status.won", lost: "status.lost" };
const dayLabels: Record<DayFilter, string> = { all: "filters.anyDate", today: "filters.today", tomorrow: "filters.tomorrow" };
const sortLabels: Record<SortMode, string> = { kickoff: "filters.kickoffTime", recent: "filters.newest" };

const chip = (active: boolean) =>
  `shrink-0 h-9 px-3 rounded-full border text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors min-h-[36px] ${
    active
      ? "border-transparent bg-pink-500 text-white"
      : "border-white/[0.1] text-white/65 active:bg-white/[0.06]"
  }`;

const FilterBar = ({
  sports,
  activeSport,
  onSportChange,
  activePremium,
  onPremiumChange,
  status = "all",
  onStatusChange,
  sort = "kickoff",
  onSortChange,
  day = "all",
  onDayChange,
  totalItems,
  filteredItems,
}: FilterBarProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const hasSports = !!sports && sports.length > 0 && !!onSportChange;

  const advancedCount =
    (status !== "all" ? 1 : 0) + (day !== "all" ? 1 : 0) + (sort !== "kickoff" ? 1 : 0);
  const activeCount =
    advancedCount +
    (activePremium !== "all" ? 1 : 0) +
    (hasSports && activeSport && activeSport !== "All" ? 1 : 0);

  const reset = () => {
    onSportChange?.("All");
    onPremiumChange("all");
    onStatusChange?.("all");
    onDayChange?.("all");
    onSortChange?.("kickoff");
  };

  const quickChips = (
    <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5 w-max">
        {(["all", "free", "premium"] as PremiumFilter[]).map((type) => (
          <button key={type} onClick={() => onPremiumChange(type)} className={chip(activePremium === type)}>
            {type === "premium" && (
              <Gem className={`w-3 h-3 ${activePremium === type ? "brightness-0 invert" : ""}`} />
            )}
            {t(premiumLabels[type])}
          </button>
        ))}
        {hasSports && (
          <>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <button onClick={() => onSportChange?.("All")} className={chip(activeSport === "All")}>
              {t("filters.allSports")}
            </button>
            {sports!.map((sport) => (
              <button key={sport} onClick={() => onSportChange?.(sport)} className={chip(activeSport === sport)}>
                {sport}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );

  const advancedControls = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">{t("filters.date")}</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["all", "today", "tomorrow"] as DayFilter[]).map((d) => (
            <button key={d} onClick={() => onDayChange?.(d)} className={`${chip(day === d)} justify-center`}>
              {t(dayLabels[d])}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">{t("filters.status")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["all", "upcoming", "won", "lost"] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => onStatusChange?.(s)} className={`${chip(status === s)} justify-center`}>
              {t(statusLabels[s])}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">{t("filters.sortBy")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(["kickoff", "recent"] as SortMode[]).map((s) => (
            <button key={s} onClick={() => onSortChange?.(s)} className={`${chip(sort === s)} justify-center`}>
              {t(sortLabels[s])}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-2.5">
      {quickChips}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full border border-white/[0.1] bg-white/[0.04] text-[12px] font-semibold text-white/80 active:bg-white/[0.07]"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t("filters.filters")}
          {advancedCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">
              {advancedCount}
            </span>
          )}
        </button>

        <span className="text-[11px] text-white/50 font-medium tabular-nums">
          {filteredItems} of {totalItems}
        </span>
      </div>

      {activeCount > 0 && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-white/55">
          <span className="truncate">
            {activePremium !== "all" && t(premiumLabels[activePremium])}
            {hasSports && activeSport && activeSport !== "All" ? ` · ${activeSport}` : ""}
            {status !== "all" ? ` · ${t(statusLabels[status])}` : ""}
            {day !== "all" ? ` · ${t(dayLabels[day])}` : ""}
            {sort !== "kickoff" ? ` · ${t(sortLabels[sort])}` : ""}
          </span>
          <button onClick={reset} className="shrink-0 underline underline-offset-2 hover:text-white/80">
            {t("filters.clear")}
          </button>
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#17141f] border-t border-white/10 text-white">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-base">{t("filters.filters")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-2">{advancedControls}</div>
          <div className="px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-2">
            <button
              onClick={reset}
              className="h-11 px-4 rounded-xl border border-white/[0.12] text-white/70 text-[13px] font-semibold active:scale-[0.98] transition-transform"
            >
              {t("filters.clear")}
            </button>
            <DrawerClose asChild>
              <button className="flex-1 h-11 rounded-xl bg-pink-500 text-white font-bold text-[13px] inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <Check className="w-4 h-4 brightness-0 invert" />
                {t("filters.show", { count: filteredItems })}
              </button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default FilterBar;
