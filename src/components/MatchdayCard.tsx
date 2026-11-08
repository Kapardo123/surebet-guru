import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Sparkles, Timer, Check, X, Minus } from "@/components/icons/gsb";
import TeamLogo from "@/components/TeamLogo";
import AnalysisSheet from "@/components/AnalysisSheet";
import type { Tip } from "@/components/TipCard";
import { FeaturedPick } from "@/lib/featuredPickStorage";
import { toggleTipWatch, useWatched } from "@/lib/watchStorage";

const statusChip = (status?: string | null) => {
  if (status === "won") return { label: "Won", cls: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10", Icon: Check };
  if (status === "lost") return { label: "Lost", cls: "text-red-300 border-red-500/40 bg-red-500/10", Icon: X };
  if (status === "draw" || status === "void") return { label: "Void", cls: "text-amber-300 border-amber-500/40 bg-amber-500/10", Icon: Minus };
  return null;
};

const formatKickoff = (value?: string) => {
  if (!value) return "";
  const d = new Date(value.replace(" ", "T"));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
};

interface MatchdayCardProps {
  pick: FeaturedPick | null;
  loading?: boolean;
}

const MatchdayCard = ({ pick, loading = false }: MatchdayCardProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isTipWatched } = useWatched();

  const odds = pick ? Number(pick.odds) : NaN;
  const intro = useMemo(() => {
    const text = String(pick?.description || "").trim();
    if (!text) return "";
    return text.length > 170 ? `${text.slice(0, 167).trimEnd()}…` : text;
  }, [pick?.description]);

  if (loading) {
    return (
      <div className="surface-card p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/[0.06]" />
        <div className="h-24 rounded-xl bg-white/[0.05] mt-3" />
        <div className="h-12 rounded-xl bg-white/[0.05] mt-3" />
      </div>
    );
  }

  if (!pick) {
    return (
      <div className="surface-card p-5 text-center">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/40 font-semibold">GSB Matchday</p>
        <p className="text-sm text-white/65 mt-2">
          No free pick of the day right now. Check back later — we publish one standout match each day.
        </p>
      </div>
    );
  }

  const chip = statusChip(pick.status);
  const watchedId = pick.id ?? -1;
  const watched = watchedId !== -1 && isTipWatched(watchedId);

  const snapshot: Tip = {
    id: watchedId,
    sport: pick.sport || "Football",
    league: pick.league,
    homeTeam: pick.homeTeam,
    awayTeam: pick.awayTeam,
    prediction: pick.prediction,
    odds: isNaN(odds) ? 0 : odds,
    kickoff: pick.kickoff,
    status: (pick.status as Tip["status"]) || "upcoming",
    isPremium: false,
    homeTeamLogo: pick.homeTeamLogo ?? null,
    awayTeamLogo: pick.awayTeamLogo ?? null,
    description: pick.description ?? null,
  };

  const handleWatch = () => {
    if (watchedId === -1) return;
    toggleTipWatch(snapshot);
  };

  return (
    <>
      <div className="relative matchday-ticket">
        <div className="relative overflow-hidden rounded-[20px] border border-white/[0.09]">
        {/* single neon accent */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
        {/* subtle pitch contour */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.06]"
          viewBox="0 0 320 200"
          fill="none"
          aria-hidden="true"
        >
          <rect x="12" y="12" width="296" height="176" rx="4" stroke="white" />
          <line x1="160" y1="12" x2="160" y2="188" stroke="white" />
          <circle cx="160" cy="100" r="30" stroke="white" />
          <rect x="12" y="60" width="34" height="80" stroke="white" />
          <rect x="274" y="60" width="34" height="80" stroke="white" />
        </svg>

        <div
          className="relative p-4"
          style={{ background: "linear-gradient(160deg, rgba(236,72,153,0.10) 0%, rgba(23,20,31,0.6) 45%, rgba(6,182,212,0.07) 100%)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-pink-500/12 border border-pink-500/25 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-pink-400" />
              </span>
              <div className="min-w-0">
                <p className="font-display font-black text-[13px] tracking-[0.14em] text-white leading-none">
                  GSB MATCHDAY
                </p>
                <p className="text-[10px] text-pink-300/90 font-semibold mt-1">Free analysis of the day</p>
              </div>
            </div>
            {chip && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold rounded-full border px-2 py-0.5 ${chip.cls}`}>
                <chip.Icon className="w-3 h-3" />
                {chip.label}
              </span>
            )}
          </div>

          {/* League + kickoff */}
          <div className="flex items-center justify-between gap-2 mt-3 text-[11px]">
            <span className="text-white/55 font-semibold truncate">{pick.league}</span>
            <span className="inline-flex items-center gap-1 text-white/55 shrink-0">
              <Timer className="w-3 h-3" />
              {formatKickoff(pick.kickoff)}
            </span>
          </div>

          {/* Teams */}
          <div className="mt-3 space-y-2">
            {[["home", pick.homeTeam, pick.homeTeamLogo], ["away", pick.awayTeam, pick.awayTeamLogo]].map(([key, name, logo]) => (
              <div key={key as string} className="flex items-center gap-2.5 min-w-0">
                <TeamLogo teamName={String(name)} logoUrl={logo as string | null} size={26} />
                <span className="font-display font-bold text-[15px] leading-tight text-white line-clamp-2 break-words">
                  {String(name)}
                </span>
              </div>
            ))}
          </div>

          {/* Prediction + odds on one bar */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-black/25 border border-white/[0.08] px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/40 font-semibold">Pick</p>
              <p className="font-display font-bold text-sm text-white break-words leading-snug">{pick.prediction}</p>
            </div>
            {!isNaN(odds) && odds > 0 && (
              <span className="shrink-0 font-display font-black text-xl text-cyan-400 tabular-nums leading-none">
                {odds.toFixed(2)}
              </span>
            )}
          </div>

          {intro && <p className="mt-2.5 text-[12px] leading-relaxed text-white/55 line-clamp-3">{intro}</p>}
        </div>

        {/* Perforation + actions */}
        <div className="perforation" />
        <div className="relative flex items-center gap-2 p-3 bg-[#17141f]">
          <button
            onClick={() => setSheetOpen(true)}
            className="flex-1 h-11 rounded-xl bg-pink-500 text-white font-display font-bold text-sm active:scale-[0.99] transition-transform"
          >
            Read analysis
          </button>
          {watchedId !== -1 && (
            <button
              onClick={handleWatch}
              aria-label={watched ? "Remove from watched" : "Save match"}
              aria-pressed={watched}
              className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
                watched
                  ? "border-pink-500/40 bg-pink-500/10 text-pink-400"
                  : "border-white/[0.1] bg-white/[0.03] text-white/60"
              }`}
            >
              {watched ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
          )}
        </div>
        </div>
      </div>

      <AnalysisSheet open={sheetOpen} onOpenChange={setSheetOpen} data={pick} locked={false} />
    </>
  );
};

export default MatchdayCard;
