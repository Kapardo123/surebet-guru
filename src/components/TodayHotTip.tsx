import { useState, useEffect, useMemo, memo } from "react";
import { Flame, ChevronDown, Clock, Crosshair, Zap } from "@/components/icons/gsb";
import TeamLogo from "@/components/TeamLogo";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick, loadFeaturedPick, getCachedFeaturedPick } from "@/lib/featuredPickStorage";
import { Badge } from "@/components/ui/badge";

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
      if (diff <= 0) return { expired: true, text: "LIVE", hours: 0, minutes: 0, seconds: 0 };
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return { expired: false, text: `${hours}h ${minutes}m ${seconds}s`, hours, minutes, seconds };
    } catch {
      return null;
    }
  }, [kickoff, now]);
};

// Confidence string -> 1..3 bars with a matching tone.
const confidenceMeta = (value?: string) => {
  const s = (value || "").toLowerCase();
  if (s.includes("high") || s.includes("very") || s.includes("strong")) return { level: 3, tone: "bg-emerald-400", text: "text-emerald-400" };
  if (s.includes("low") || s.includes("weak")) return { level: 1, tone: "bg-red-400", text: "text-red-400" };
  return { level: 2, tone: "bg-amber-400", text: "text-amber-400" };
};

const TodayHotTip = () => {
  // Start z cache — prawdziwy hero pojawia się natychmiast, bez mignięcia demo.
  const [pick, setPick] = useState<FeaturedPick | null>(() => getCachedFeaturedPick());
  const [loaded, setLoaded] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Demo pokazujemy WYŁĄCZNIE gdy wiemy, że nie ma hero (po zakończeniu
  // ładowania). Podczas ładowania renderujemy skeleton, nie fałszywy mecz.
  const data = pick || (!loaded
    ? null
    : {
        league: "UEFA Champions League",
        kickoff: new Date(Date.now() + 3600000 * 3).toISOString(),
        homeTeam: "Real Madrid",
        awayTeam: "Bayern Munich",
        prediction: "Real Madrid Win",
        odds: "2.15",
        confidence: "High",
        status: "upcoming" as const,
      });

  const countdown = useCountdown(data?.kickoff || "");

  useEffect(() => {
    loadFeaturedPick().then((featured) => {
      if (featured) setPick(featured);
      setLoaded(true);
    });
  }, []);

  // Podczas ładowania (brak hero w cache) — skeleton, żeby nie mignęło demo.
  if (!data) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-card/60 animate-pulse">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500/40 to-transparent" />
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-7 w-40 rounded-full bg-white/5" />
            <div className="h-5 w-16 rounded-full bg-white/5" />
          </div>
          <div className="flex items-center justify-center gap-6 py-6">
            <div className="h-14 w-28 rounded-2xl bg-white/5" />
            <div className="h-8 w-12 rounded bg-white/5" />
            <div className="h-14 w-28 rounded-2xl bg-white/5" />
          </div>
          <div className="h-16 rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  const confidence = confidenceMeta(data.confidence);

  const teamBlock = (name: string, logo: string | null | undefined) => (
    <div className="flex flex-1 min-w-0 flex-col items-center gap-2.5">
      <div className="relative">
        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-pink-500/10 to-cyan-500/10 blur-md" />
        <div className="relative w-16 h-16 rounded-full bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center">
          <TeamLogo teamName={name} logoUrl={logo} size={38} />
        </div>
      </div>
      <span className="font-display text-sm md:text-base font-bold text-foreground text-center truncate w-full">
        {name}
      </span>
    </div>
  );

  return (
    <motion.div layout className="relative overflow-hidden rounded-3xl">
      {/* Layered background glow */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        <div className="absolute -top-28 -left-20 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.16) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-28 -right-20 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)" }} />
      </div>

      <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent bg-card/90 shadow-2xl shadow-black/40 overflow-hidden">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />

        <div className="p-5 md:p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-pink-500/10 ring-1 ring-pink-500/25 flex items-center justify-center">
                <Flame className="w-4 h-4 text-pink-400" />
              </span>
              <div>
                <p className="font-display text-sm font-black uppercase tracking-[0.14em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 leading-none">
                  Today's Hero Pick
                </p>
                <p className="text-[10px] text-white/40 mt-1 uppercase tracking-[0.2em]">Free for everyone</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {data.status && data.status !== "upcoming" && (
                <Badge variant={statusVariant[data.status]} className="gap-1 text-[9px] px-2 py-0.5">
                  <span className="whitespace-nowrap">{statusLabel[data.status]}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* League + Countdown */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-white/50 text-[11px] uppercase tracking-[0.18em] font-semibold truncate">
              {data.league}
            </p>
            {countdown && (
              <div className={`flex items-center gap-1.5 bg-white/[0.04] px-2.5 py-1 rounded-lg border shrink-0 ${countdown.expired ? "border-red-500/40" : "border-white/[0.08]"}`}>
                <Clock className="w-3 h-3 text-white/55" />
                <span className={`text-[11px] font-mono font-bold tabular-nums ${countdown.expired ? "text-red-400" : "text-white/75"}`}>
                  {countdown.expired ? "LIVE" : countdown.text}
                </span>
              </div>
            )}
          </div>

          {/* Matchup */}
          <div className="flex items-center gap-3 py-2">
            <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="flex flex-1 min-w-0">
              {teamBlock(data.homeTeam, data.homeTeamLogo)}
            </motion.div>

            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-[10px] font-display font-bold text-white/30 uppercase tracking-[0.3em]">vs</span>
              <div className="px-3.5 py-1.5 rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.07]">
                <p className="text-[8px] uppercase tracking-[0.2em] text-cyan-300/60 font-bold text-center">Odds</p>
                <p className="text-2xl font-black font-display text-cyan-400 tabular-nums leading-none">{data.odds}</p>
              </div>
            </div>

            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.05 }} className="flex flex-1 min-w-0">
              {teamBlock(data.awayTeam, data.awayTeamLogo)}
            </motion.div>
          </div>

          {/* Prediction */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
            <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-pink-500 to-cyan-500" />
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold mb-1">Prediction</p>
                <p className="font-display font-black text-base md:text-lg text-foreground truncate">{data.prediction}</p>
              </div>
              <Crosshair className="w-6 h-6 text-pink-400/70 shrink-0" />
            </div>
          </div>

          {/* Confidence + analysis toggle */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Zap className={`w-3.5 h-3.5 ${confidence.text}`} />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-bold">Confidence</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`h-1.5 w-5 rounded-full ${n <= confidence.level ? confidence.tone : "bg-white/10"}`} />
                ))}
              </div>
              <span className={`text-[11px] font-bold ${confidence.text}`}>{data.confidence}</span>
            </div>

            {data.description && (
              <button
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="inline-flex items-center gap-1.5 text-[11px] font-display font-bold uppercase tracking-wider text-white/55 hover:text-pink-400 transition-colors shrink-0"
              >
                <motion.span animate={{ rotate: showAnalysis ? 180 : 0 }} transition={{ duration: 0.25 }} className="inline-flex">
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
                Analysis
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {showAnalysis && data.description && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] border-l-2 border-l-pink-500/40">
                  <p className="text-[12px] md:text-[13px] text-white/65 leading-relaxed italic">
                    {data.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(TodayHotTip);
