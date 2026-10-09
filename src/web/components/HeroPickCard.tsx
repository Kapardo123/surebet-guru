import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FeaturedPick, loadFeaturedPick, getCachedFeaturedPick } from "@/lib/featuredPickStorage";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock, Crosshair, ChevronDown, Zap, Target, Trophy } from "@/components/icons/gsb";
import { warsawDayKey } from "@/web/lib/days";

const statusVariant = {
  upcoming: "outline" as const,
  won: "win" as const,
  lost: "loss" as const,
  draw: "draw" as const,
};

const statusLabel = {
  upcoming: "Upcoming",
  won: "Won",
  lost: "Lost",
  draw: "Draw",
};

const useCountdown = (kickoff: string) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    try {
      const target = new Date(kickoff).getTime();
      if (isNaN(target)) return null;
      const diff = target - now;
      if (diff <= 0) return { expired: true, text: "LIVE" };
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return { expired: false, text: `${hours}h ${minutes}m ${seconds}s` };
    } catch {
      return null;
    }
  }, [kickoff, now]);
};

const Skeleton = () => (
  <div className="animate-pulse">
    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 rounded-full bg-white/5" />
        <div className="h-6 w-16 rounded-full bg-white/5" />
      </div>
      <div className="flex items-center justify-center gap-6 py-5">
        <div className="h-14 w-28 rounded-2xl bg-white/5" />
        <div className="h-7 w-10 rounded bg-white/5" />
        <div className="h-14 w-28 rounded-2xl bg-white/5" />
      </div>
      <div className="h-20 rounded-xl bg-white/5" />
    </div>
  </div>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-white/[0.08] bg-card/80 shadow-2xl shadow-black/40">
    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
    <div className="p-6 text-center space-y-3">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/10 ring-1 ring-pink-500/25">
        <Trophy className="h-6 w-6 text-pink-400" />
      </span>
      <p className="font-display text-base font-black uppercase tracking-wider text-white">
        Today's Hero Pick
      </p>
      <p className="text-sm leading-relaxed text-white/50">
        Published with today's tips — usually before the first kickoff. Check back soon or browse
        the board below.
      </p>
    </div>
  </div>
);

/** Landing hero card — pulls the featured pick straight from the database. */
const HeroPickCard = () => {
  const [pick, setPick] = useState<FeaturedPick | null>(() => getCachedFeaturedPick());
  const [loaded, setLoaded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    let alive = true;
    loadFeaturedPick()
      .then((featured) => {
        if (!alive) return;
        setPick(featured);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Only today's hero counts — a leftover pick from yesterday is hidden so the
  // card never shows stale matches (same rule as the tips board).
  const todayKey = warsawDayKey(Date.now());
  const hero = useMemo(() => {
    if (!pick) return null;
    const ms = new Date(pick.kickoff).getTime();
    if (!isNaN(ms) && warsawDayKey(ms) < todayKey) return null;
    return pick;
  }, [pick, todayKey]);

  const countdown = useCountdown(hero?.kickoff || "");

  if (!loaded) return <Skeleton />;
  if (!hero) return <EmptyState />;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/90 shadow-2xl shadow-black/50">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-500/10 ring-1 ring-pink-500/25">
              <Flame className="h-4 w-4 text-pink-400" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-black uppercase tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
                Today's Hero Pick
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Free for everyone</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hero.status !== "upcoming" && (
              <Badge variant={statusVariant[hero.status]} className="gap-1 text-[9px] px-2 py-0.5">
                <span className="whitespace-nowrap">{statusLabel[hero.status]}</span>
              </Badge>
            )}
          </div>
        </div>

        {/* League + countdown */}
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
            {hero.league}
          </p>
          {countdown && (
            <div
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border bg-white/[0.04] px-2.5 py-1 ${
                countdown.expired ? "border-red-500/40" : "border-white/[0.08]"
              }`}
            >
              <Clock className="h-3 w-3 text-white/55" />
              <span
                className={`text-[11px] font-mono font-bold tabular-nums ${
                  countdown.expired ? "text-red-400" : "text-white/75"
                }`}
              >
                {countdown.expired ? "LIVE" : countdown.text}
              </span>
            </div>
          )}
        </div>

        {/* Matchup */}
        <div className="flex items-center justify-between gap-3 py-2">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] ring-1 ring-white/10">
              <TeamLogo teamName={hero.homeTeam} logoUrl={hero.homeTeamLogo} size={32} />
            </div>
            <span className="w-full truncate text-center font-display text-sm font-bold text-foreground">
              {hero.homeTeam}
            </span>
          </motion.div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="text-[10px] font-display font-bold uppercase tracking-[0.3em] text-white/30">vs</span>
            <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.07] px-3 py-1">
              <p className="text-center text-[8px] font-bold uppercase tracking-[0.2em] text-cyan-300/60">Odds</p>
              <p className="font-display text-2xl font-black leading-none tabular-nums text-cyan-400">
                {hero.odds}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-pink-500/[0.06] ring-1 ring-pink-500/20">
              <TeamLogo teamName={hero.awayTeam} logoUrl={hero.awayTeamLogo} size={32} />
            </div>
            <span className="w-full truncate text-center font-display text-sm font-bold text-foreground">
              {hero.awayTeam}
            </span>
          </motion.div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2 py-3 text-center">
            <Target className="mx-auto mb-1.5 h-4 w-4 text-white/50" />
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Prediction</p>
            <p className="font-display text-xs font-bold text-foreground">{hero.prediction}</p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-2 py-3 text-center">
            <Crosshair className="mx-auto mb-1.5 h-4 w-4 text-cyan-400/70" />
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Odds</p>
            <p className="font-display text-sm font-bold tabular-nums text-cyan-400">{hero.odds}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-2 py-3 text-center">
            <Zap className="mx-auto mb-1.5 h-4 w-4 text-emerald-400/70" />
            <p className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Confidence</p>
            <p className="font-display text-xs font-bold text-emerald-400">{hero.confidence}</p>
          </div>
        </div>

        {/* Analysis */}
        {hero.description && (
          <div>
            <button
              type="button"
              onClick={() => setShowAnalysis((v) => !v)}
              className="flex w-full items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider text-white/55 transition-colors hover:text-pink-400"
            >
              <motion.span
                animate={{ rotate: showAnalysis ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className="inline-flex"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.span>
              {showAnalysis ? "Hide analysis" : "Show analysis"}
            </button>

            <AnimatePresence initial={false}>
              {showAnalysis && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <p className="text-[12px] italic leading-relaxed text-white/65">{hero.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroPickCard;
