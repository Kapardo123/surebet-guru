import { useEffect, useState, useCallback, type ReactNode } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, BadgeX, Minus, History, Target, Zap, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import ScrollReveal from "@/components/ScrollReveal";
import { loadYesterdayResults, YesterdayData } from "@/lib/resultsStorage";

const YesterdayResults = ({ userIsPremium }: { userIsPremium: boolean }) => {
  const [data, setData] = useState<YesterdayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    loadYesterdayResults().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadYesterdayResults(true).then((d) => {
      setData(d);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tylko wygrane —Lost/Void nie są pokazywane
  const tips = (data?.tips ?? []).filter((t) => t.status === "won");
  const coupons = (data?.coupons ?? []).filter((c) => c.status === "won");
  const hero = data?.hero && data.hero.resultStatus === "won" ? data.hero : null;
  const won = tips.length;
  const dateLabel = data?.date
    ? new Date(`${data.date}T12:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    : "";

  const StatChip = ({
    icon,
    label,
    value,
    tone,
  }: {
    icon: ReactNode;
    label: string;
    value: number | string;
    tone: "win" | "loss" | "void" | "rate";
  }) => {
    const tones = {
      win: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.06]",
      loss: "text-red-400 border-red-500/20 bg-red-500/[0.06]",
      void: "text-amber-400 border-amber-500/20 bg-amber-500/[0.06]",
      rate: "text-pink-400 border-pink-500/25 bg-gradient-to-r from-pink-500/10 to-purple-500/10",
    };
    return (
      <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border backdrop-blur-xl ${tones[tone]}`}>
        {icon}
        <span className="text-[10px] font-display font-bold uppercase tracking-wider text-white/40">{label}</span>
        <span className="text-sm font-black font-display">{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
          <History className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-[10px] font-display font-bold uppercase tracking-wider text-white/40">
            {dateLabel}
          </span>
        </div>
        <StatChip icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Won tips" value={won} tone="win" />
        {coupons.length > 0 && (
          <StatChip icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Won coupons" value={coupons.length} tone="win" />
        )}
        {hero && (
          <StatChip icon={<Zap className="w-3.5 h-3.5" />} label="Hero won" value="✓" tone="win" />
        )}
        </div>
      </div>

      {/* Tips */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-r-${i}`} className="rounded-2xl border border-purple-500/10 bg-white/[0.03] p-4 space-y-4 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 rounded-full bg-white/5" />
                <div className="h-5 w-20 rounded-full bg-white/5" />
              </div>
              <div className="flex items-center justify-center gap-4 py-3">
                <div className="h-10 w-24 rounded bg-white/5" />
                <div className="h-5 w-8 rounded bg-white/5" />
                <div className="h-10 w-24 rounded bg-white/5" />
              </div>
              <div className="h-12 rounded-lg bg-white/5" />
            </div>
          ))}
        </div>
      ) : tips.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
          {tips.map((tip, i) => (
            <ScrollReveal key={`tip-${tip.id}`} delay={i * 0.06}>
              <TipCard tip={tip} userIsPremium={userIsPremium} />
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <div className="text-center py-14 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] mx-auto flex items-center justify-center border border-white/[0.06]">
            <History className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-white/40 font-display text-base font-medium">No winning tips yesterday</p>
          <p className="text-white/20 text-sm">Only winning picks appear here</p>
        </div>
      )}

      {/* Hero (wygrany) */}
      {!loading && hero && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.07] to-transparent backdrop-blur-xl">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Hero Pick · Won</p>
                <p className="text-xs font-medium truncate text-white/80">{hero.homeTeam} vs {hero.awayTeam}</p>
                <p className="text-[10px] text-muted-foreground truncate">{hero.prediction} @ {hero.odds || "—"}{hero.finalScore ? ` · FT ${hero.finalScore}` : ""}</p>
              </div>
            </div>
            <span className="text-[10px] font-display font-black uppercase tracking-widest px-3 py-1.5 rounded-full border text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              Won
            </span>
          </div>
        </motion.div>
      )}

      {/* Coupons (wygrane) */}
      {!loading && coupons.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
            <h3 className="font-display text-lg font-bold text-foreground tracking-tight">Winning Coupons</h3>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
            {coupons.map((coupon, i) => (
              <ScrollReveal key={`coupon-${coupon.id}`} delay={i * 0.06}>
                <CouponCard coupon={coupon} userIsPremium={userIsPremium} />
              </ScrollReveal>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default YesterdayResults;
