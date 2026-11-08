import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Timer, Check, X, Minus } from "@/components/icons/gsb";
import TeamLogo from "@/components/TeamLogo";
import AnalysisSheet from "@/components/AnalysisSheet";
import type { Tip } from "@/components/TipCard";
import { FeaturedPick } from "@/lib/featuredPickStorage";
import { toggleTipWatch, useWatched } from "@/lib/watchStorage";
import stadium from "@/assets/brand/matchday-stadium.jpg";

const statusChip = (status?: string | null) => {
  if (status === "won") return { label: "Won", cls: "text-emerald-200 border-emerald-400/40 bg-emerald-500/20", Icon: Check };
  if (status === "lost") return { label: "Lost", cls: "text-red-200 border-red-400/40 bg-red-500/20", Icon: X };
  if (status === "draw" || status === "void") return { label: "Void", cls: "text-amber-200 border-amber-400/40 bg-amber-500/20", Icon: Minus };
  return null;
};

const formatKickoff = (value?: string) => {
  if (!value) return "";
  const d = new Date(value.replace(" ", "T"));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
};

const countdownText = (kickoffMs: number, now: number): string | null => {
  if (!isFinite(kickoffMs)) return null;
  const diff = kickoffMs - now;
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
};

interface MatchdayCardProps {
  pick: FeaturedPick | null;
  loading?: boolean;
}

const MatchdayCard = ({ pick, loading = false }: MatchdayCardProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { isTipWatched } = useWatched();

  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 20 });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const kickoffMs = useMemo(
    () => new Date(String(pick?.kickoff || "").replace(" ", "T")).getTime(),
    [pick?.kickoff],
  );

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 5, y: (px - 0.5) * 7 });
    setGlare({ x: px * 100, y: py * 100 });
  };
  const resetTilt = () => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 20 });
  };

  const odds = pick ? Number(pick.odds) : NaN;
  const intro = useMemo(() => {
    const text = String(pick?.description || "").trim();
    if (!text) return "";
    return text.length > 150 ? `${text.slice(0, 147).trimEnd()}…` : text;
  }, [pick?.description]);

  if (loading) {
    return (
      <div className="surface-card p-4 animate-pulse">
        <div className="h-4 w-32 rounded bg-white/[0.06]" />
        <div className="h-28 rounded-xl bg-white/[0.05] mt-3" />
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
  const countdown = pick.status === "upcoming" ? countdownText(kickoffMs, now) : null;

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

  const teamBlock = (name: string, logo?: string | null) => (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
      <div className="w-12 h-12 rounded-2xl bg-black/35 border border-white/15 flex items-center justify-center shadow-lg shadow-black/30">
        <TeamLogo teamName={name} logoUrl={logo} size={30} />
      </div>
      <span className="font-display font-bold text-[13px] leading-tight text-white text-center line-clamp-2 break-words w-full">
        {name}
      </span>
    </div>
  );

  return (
    <>
      <div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={resetTilt}
        className="relative matchday-ticket gsb-anim"
        style={{
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 200ms ease-out",
        }}
      >
        <div className="relative overflow-hidden rounded-[22px] border border-white/[0.12] bg-[#17141f]">
          {/* Stadium photo */}
          <img
            src={stadium}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
          />
          {/* Readability + brand tint overlays */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,0,21,0.86) 0%, rgba(10,0,21,0.42) 38%, rgba(10,0,21,0.62) 62%, rgba(10,0,21,0.96) 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(120% 80% at 12% 0%, rgba(236,72,153,0.28), transparent 55%)" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(120% 80% at 92% 6%, rgba(6,182,212,0.22), transparent 55%)" }}
          />
          {/* Pointer glare */}
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{
              background: `radial-gradient(240px circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.16), transparent 62%)`,
            }}
          />

          <div className="relative p-4">
            {/* Header — no icon, typographic mark instead */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-black uppercase tracking-[0.2em] text-[14px] text-white leading-none">
                    GSB Matchday
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/85">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    Free
                  </span>
                </div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/55 font-semibold mt-1.5 truncate">
                  {pick.league}
                </p>
              </div>

              <div className="text-right shrink-0">
                {chip ? (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${chip.cls}`}>
                    <chip.Icon className="w-3 h-3" />
                    {chip.label}
                  </span>
                ) : countdown ? (
                  <>
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/50 font-semibold">Kick-off in</p>
                    <p className="font-display font-black text-[15px] text-white tabular-nums leading-none mt-0.5">
                      {countdown}
                    </p>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-white/65">
                    <Timer className="w-3 h-3" />
                    {formatKickoff(pick.kickoff)}
                  </span>
                )}
              </div>
            </div>

            {/* Teams */}
            <div className="mt-4 flex items-center gap-2">
              {teamBlock(pick.homeTeam, pick.homeTeamLogo)}
              <div className="shrink-0 w-9 h-9 rounded-full bg-white/12 border border-white/20 backdrop-blur-sm flex items-center justify-center text-[9px] font-black tracking-[0.1em] text-white/80">
                VS
              </div>
              {teamBlock(pick.awayTeam, pick.awayTeamLogo)}
            </div>

            {/* Pick + odds */}
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-black/40 border border-white/12 px-3 py-2.5 backdrop-blur-sm">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.16em] text-white/45 font-semibold">Pick</p>
                <p className="font-display font-bold text-[13px] text-white leading-snug break-words line-clamp-2">
                  {pick.prediction}
                </p>
              </div>
              {!isNaN(odds) && odds > 0 && (
                <span className="shrink-0 font-display font-black text-[22px] text-cyan-300 tabular-nums leading-none drop-shadow-[0_0_10px_rgba(6,182,212,0.35)]">
                  {odds.toFixed(2)}
                </span>
              )}
            </div>

            {intro && <p className="mt-2.5 text-[11.5px] leading-relaxed text-white/60 line-clamp-2">{intro}</p>}
          </div>

          {/* Ticket perforation + stub */}
          <div className="relative perforation" />
          <div className="relative flex items-center gap-2.5 p-3 bg-[#17141f]">
            <button
              onClick={() => setSheetOpen(true)}
              className="gsb-sheen flex-1 h-11 rounded-xl bg-pink-500 text-white font-display font-bold text-sm active:scale-[0.99] transition-transform"
            >
              Read analysis
            </button>
            {watchedId !== -1 && (
              <button
                onClick={handleWatch}
                aria-label={watched ? "Remove from watched" : "Save match"}
                aria-pressed={watched}
                className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                  watched
                    ? "border-pink-500/50 bg-pink-500/15 text-pink-400"
                    : "border-white/15 bg-white/[0.04] text-white/70"
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
