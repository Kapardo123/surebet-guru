import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Tip } from "@/components/TipCard";
import SportGlyph from "@/components/SportGlyph";
import CountUp from "@/components/CountUp";
import { sportTheme } from "@/lib/sport";
import type { StreakState } from "@/lib/engagement";

const chip: Record<string, string> = { won: "foil-gold text-stock-ink", lost: "bg-red text-white", draw: "bg-white/25 text-white" };
const letter: Record<string, string> = { won: "W", lost: "L", draw: "P" };

/**
 * The day at a glance, in one panel: headline count, three stats, the
 * binder slots, the streak and recent form. Replaces five stacked boxes.
 */
const TodayPanel = ({
  weekday,
  loading,
  tips,
  topOdds,
  seen,
  isPremium,
  onSlot,
  streak,
  credits,
  packOpen,
}: {
  weekday: string;
  loading: boolean;
  tips: Tip[];
  topOdds: string;
  seen: number[];
  isPremium: boolean;
  onSlot: (t: Tip) => void;
  streak: StreakState | null;
  credits: number;
  packOpen: boolean;
}) => {
  const open = tips.filter((t) => t.status === "upcoming");
  const goldOpen = open.filter((t) => t.isPremium).length;
  const got = tips.filter((t) => seen.includes(t.id)).length;
  const settled = tips
    .filter((t) => t.status !== "upcoming")
    .sort((a, b) => (b.kickoff || "").localeCompare(a.kickoff || ""))
    .slice(0, 6);
  const won = settled.filter((t) => t.status === "won").length;
  const inCycle = streak && streak.streak > 0 ? ((streak.streak - 1) % 7) + 1 : 0;

  return (
    <section className="relative rounded-[28px] overflow-hidden border border-white/[0.09] bg-[linear-gradient(160deg,hsl(var(--card)/.82),hsl(var(--background)/.6))] backdrop-blur-xl shadow-[0_24px_60px_-28px_rgba(0,0,0,.9)]">
      <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/.8),transparent)]" aria-hidden />

      {/* Headline */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <p className="label">{weekday}'s pull</p>
          <h1 className="font-display font-black uppercase text-[30px] leading-[1] tracking-[-0.03em] mt-2">
            {loading ? (
              "Shuffling…"
            ) : (
              <>
                <CountUp value={open.length} className="foil-gold-text" /> {open.length === 1 ? "card" : "cards"}
                <span className="block text-foreground/45">in play</span>
              </>
            )}
          </h1>
        </div>
        {streak && (
          <motion.div
            className="shrink-0 flex flex-col items-center"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
          >
            <span className="relative grid place-items-center w-14 h-14 rounded-full bg-[radial-gradient(circle_at_50%_70%,#ffb347,#ff5e3a)] shadow-[0_0_28px_-4px_rgba(255,120,60,.85)]">
              <Flame className="w-7 h-7 text-white fill-white/80" />
              <span className="absolute -bottom-1.5 -right-1.5 min-w-7 h-7 px-1.5 rounded-full bg-background border-2 border-[#ff7a45] grid place-items-center num font-black text-[13px]">
                {streak.streak}
              </span>
            </span>
            <span className="mt-2.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Streak</span>
          </motion.div>
        )}
      </div>

      {/* Stats, no boxes: just hairline dividers */}
      {!loading && tips.length > 0 && (
        <div className="grid grid-cols-3 mt-5 mx-5 py-3 border-y border-white/[0.07] divide-x divide-white/[0.07]">
          {[
            ["Open", String(open.length), false],
            ["Gold", String(goldOpen), true],
            ["Top odds", topOdds, false],
          ].map(([k, v, gold]) => (
            <div key={k as string} className="px-3 first:pl-0 last:pr-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
              <p className={`num font-black text-[22px] leading-none mt-1.5 ${gold ? "foil-gold-text" : ""}`}>
                <CountUp value={v as string} />
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Binder slots */}
      {!loading && packOpen && tips.length > 0 && (
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between">
            <p className="label">Today's binder</p>
            <p className="text-[12.5px] font-semibold">
              <span className={got === tips.length ? "foil-gold-text" : ""}>{got}/{tips.length}</span>{" "}
              <span className="text-muted-foreground font-medium">collected</span>
            </p>
          </div>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar">
            {tips.map((t) => {
              const has = seen.includes(t.id);
              const theme = sportTheme(t.sport);
              const locked = t.isPremium && !isPremium && t.status === "upcoming";
              return (
                <button
                  key={t.id}
                  onClick={() => onSlot(t)}
                  aria-label={`${t.homeTeam} v ${t.awayTeam}${has ? ", collected" : ""}`}
                  className={`shrink-0 w-[30px] h-[42px] rounded-[6px] grid place-items-center transition-transform active:scale-90 ${
                    has
                      ? `${t.isPremium ? "foil-gold text-stock-ink" : "text-white"} shadow-[0_4px_10px_-3px_rgba(0,0,0,.6)]`
                      : `border-[1.5px] border-dashed ${t.isPremium ? "border-[hsl(var(--gold)/.6)]" : "border-white/20"}`
                  }`}
                  style={has && !t.isPremium ? { background: theme.frame } : undefined}
                >
                  {has ? <SportGlyph sport={t.sport} size={15} /> : <span className={`text-[11px] ${t.isPremium ? "text-[hsl(var(--gold))]" : "text-white/30"}`}>{locked ? "◆" : "+"}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Streak progress + form */}
      <div className="px-5 pt-4 pb-5 space-y-3">
        {streak && (
          <div>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-muted-foreground">
                {streak.local ? (
                  <>
                    <Link to="/auth" className="text-primary font-semibold">Sign in</Link> to earn free Gold cards
                  </>
                ) : inCycle === 7 ? (
                  <span className="foil-gold-text font-bold">Free Gold card earned today!</span>
                ) : (
                  <>
                    {7 - inCycle} more {7 - inCycle === 1 ? "day" : "days"} to a free <span className="foil-gold-text font-bold">Gold card</span>
                  </>
                )}
              </span>
              {credits > 0 && <span className="h-6 px-2.5 rounded-full foil-gold text-stock-ink text-[11px] font-bold grid place-items-center">{credits} free</span>}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  {i < inCycle && (
                    <motion.div
                      className={`h-full rounded-full ${i === 6 ? "foil-gold" : "bg-[linear-gradient(90deg,#ff5e3a,#ffb347)]"}`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{ originX: 0 }}
                      transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {settled.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="label">Form</span>
              <div className="flex gap-1">
                {settled.map((t) => (
                  <span key={t.id} className={`w-5 h-5 rounded-full grid place-items-center font-display font-black text-[9px] ${chip[t.status]}`}>
                    {letter[t.status]}
                  </span>
                ))}
              </div>
            </div>
            <span className="text-[12.5px] font-semibold text-muted-foreground">
              <span className="text-foreground">{won}/{settled.length}</span> won
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default TodayPanel;
