import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import {
  CalendarClock,
  Loader2,
  Sparkles,
  BadgeCheck,
  BadgeX,
  Minus,
  Zap,
  RotateCcw,
  RefreshCw,
  Crown,
  Trash2,
  Receipt,
} from "lucide-react";
import { loadTips, updateTip, deleteTip, Tip } from "@/lib/tipsStorage";
import { loadCoupons, updateCoupon, Coupon } from "@/lib/couponStorage";
import { loadFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------- helpers ---

const fmtKickoff = (k: string) => {
  try {
    const d = new Date(k);
    return isNaN(d.getTime()) ? (k || "—") : d.toLocaleString("pl-PL", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  } catch { return k || "—"; }
};

const warsawDayOf = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);
};

const getYesterdayWarsaw = (): string => {
  const today = warsawDayOf(new Date().toISOString());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const statusBadge = (status: string) => {
  const map: Record<string, { variant: "win" | "loss" | "default" | "outline"; label: string }> = {
    won: { variant: "win", label: "Won" },
    lost: { variant: "loss", label: "Lost" },
    void: { variant: "default", label: "Void" },
    draw: { variant: "default", label: "Void" },
    upcoming: { variant: "outline", label: "Unsettled" },
    active: { variant: "outline", label: "Unsettled" },
    pending: { variant: "outline", label: "Unsettled" },
  };
  return map[status] || { variant: "outline", label: status };
};

type Verdict = "won" | "lost" | "void";

const LegVerdictButtons = ({ busyKey, onVerdict }: { busyKey: string; onVerdict: (v: Verdict) => void }) => (
  <div className="flex items-center gap-1 flex-shrink-0">
    <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" title="Won" onClick={() => onVerdict("won")}>{busyKey.endsWith("-won") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />}</Button>
    <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Lost" onClick={() => onVerdict("lost")}>{busyKey.endsWith("-lost") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeX className="w-3.5 h-3.5" />}</Button>
    <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-500" title="Void" onClick={() => onVerdict("void")}>{busyKey.endsWith("-void") ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}</Button>
  </div>
);

// Status kuponu z statusów nóg: lost dominuje, won wymaga kompletu, void zwraca
const aggregate = (statuses: (Verdict | null)[]): "won" | "lost" | "void" | null => {
  if (!statuses.length || statuses.some((s) => s === null)) return null;
  if (statuses.some((s) => s === "lost")) return "lost";
  if (statuses.every((s) => s === "won")) return "won";
  return "void";
};

// ---------------------------------------------------------------- component ---

const YesterdaySettleTab = ({ onSaved }: { onSaved?: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [date, setDate] = useState(getYesterdayWarsaw());

  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [hero, setHero] = useState<FeaturedPick | null>(null);

  const reload = useCallback(async (targetDate: string) => {
    const [t, c, h] = await Promise.all([loadTips(true, true), loadCoupons(), loadFeaturedPick()]);
    // Tipy: kickoff w wybranym dniu
    setTips(t.filter((tip) => warsawDayOf(tip.kickoff) === targetDate));
    // Kupony: co najmniej jedna noga w wybranym dniu
    const dayCoupons = c.filter((coupon) =>
      (coupon.matches || []).some((m) => warsawDayOf(m.kickoff) === targetDate),
    );
    setCoupons(dayCoupons);
    setHero(h && warsawDayOf(h.kickoff) === targetDate ? h : null);
  }, []);

  useEffect(() => {
    setLoading(true);
    reload(date).finally(() => setLoading(false));
  }, [reload, date]);

  // ---------------- manual verdict: TIP (natychmiast do archiwum) ------------

  const applyTipVerdict = async (tip: Tip, status: Verdict) => {
    await updateTip({ ...tip, status, isPublished: true, queued: false });
    await (supabase as any).from("match_results").upsert({
      source_type: "tip", source_id: tip.id, result_status: status,
      final_score: null, settled_at: new Date().toISOString(), settled_method: "manual",
      payload: { sport: tip.sport, league: tip.league, homeTeam: tip.homeTeam, awayTeam: tip.awayTeam, prediction: tip.prediction, odds: Number(tip.odds) || 0, kickoff: tip.kickoff, description: tip.description ?? null, homeTeamLogo: tip.homeTeamLogo ?? null, awayTeamLogo: tip.awayTeamLogo ?? null, isPremium: !!tip.isPremium },
    }, { onConflict: "source_type,source_id" });
  };

  const handleTipVerdict = (tip: Tip, status: Verdict) => {
    setBusyId(`tip-${tip.id}-${status}`);
    (async () => {
      await applyTipVerdict(tip, status);
      toast({ title: `Tip: ${status}${status === "won" ? " — w Yesterday's Wins ✅" : ""}` });
      await reload(date);
      onSaved?.();
    })().catch((e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" })).finally(() => setBusyId(null));
  };

  const handleResetTip = (tip: Tip) => {
    setBusyId(`tip-${tip.id}-reset`);
    (async () => {
      await updateTip({ ...tip, status: "upcoming", isPublished: true, queued: false });
      await (supabase as any).from("match_results").delete().eq("source_type", "tip").eq("source_id", tip.id);
      toast({ title: "Tip reset to unsettled" });
      await reload(date);
    })().catch((e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" })).finally(() => setBusyId(null));
  };

  const handleDeleteTip = (tip: Tip) => {
    if (!window.confirm("Usunąć ten tip na stałe?")) return;
    setBusyId(`tip-${tip.id}-del`);
    (async () => {
      await deleteTip(tip.id);
      await (supabase as any).from("match_results").delete().eq("source_type", "tip").eq("source_id", tip.id);
      toast({ title: "Tip deleted" });
      await reload(date);
    })().catch((e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" })).finally(() => setBusyId(null));
  };

  // ---------------- manual verdict: COUPON LEG (per-noga) --------------------

  const applyLegVerdict = async (coupon: Coupon, legIndex: number, verdict: Verdict) => {
    const matches = coupon.matches.map((m, i) =>
      i === legIndex ? { ...m, legStatus: verdict, finalScore: m.finalScore ?? null } : m,
    );
    const statuses = matches.map((m) => m.legStatus ?? null);
    // Kupon może być w kolejce (queued) — wtedy zostaje w kolejce, tylko nogi
    // dostają statusy. Live kupon dostaje też status końcowy gdy komplet.
    const aggregated = aggregate(statuses);
    const isQueued = (coupon as any).queued === true;
    await updateCoupon({
      ...coupon,
      matches,
      status: aggregated ?? (isQueued ? "active" : (coupon.status as Coupon["status"])),
      queued: isQueued,
    });
    // Archiwum — gdy kupon już rozstrzygnięty (nie-queued) albo komplet nóg
    if (!isQueued && aggregated) {
      await (supabase as any).from("match_results").upsert({
        source_type: "coupon", source_id: coupon.id, result_status: aggregated,
        final_score: null, settled_at: new Date().toISOString(), settled_method: "manual",
        payload: { name: coupon.name, matches: matches.map((m) => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, prediction: m.prediction, odds: m.odds, league: m.league, sport: m.sport, kickoff: m.kickoff, legStatus: m.legStatus ?? null, finalScore: m.finalScore ?? null })), totalOdds: coupon.totalOdds, stake: coupon.stake ?? null, isPremium: !!coupon.isPremium, createdAt: coupon.createdAt },
      }, { onConflict: "source_type,source_id" });
    }
    return aggregated;
  };

  const handleLegVerdict = (coupon: Coupon, legIndex: number, verdict: Verdict) => {
    setBusyId(`leg-${coupon.id}-${legIndex}-${verdict}`);
    (async () => {
      const aggregated = await applyLegVerdict(coupon, legIndex, verdict);
      toast({
        title: `Leg: ${verdict}`,
        description: aggregated ? `Kupon rozstrzygnięty: ${aggregated}${aggregated === "won" ? " — w Yesterday's Wins ✅" : ""}` : "Kupon czeka na pozostałe nogi",
      });
      await reload(date);
      onSaved?.();
    })().catch((e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" })).finally(() => setBusyId(null));
  };

  // ---------------- manual verdict: HERO (natychmiast do archiwum) -----------

  const applyHeroVerdict = async (h: FeaturedPick, status: Verdict) => {
    await (supabase as any).from("featured_picks").update({ status: status === "void" ? "draw" : status, won_at: status === "won" ? new Date().toISOString() : null }).eq("id", h.id!);
    await (supabase as any).from("match_results").upsert({
      source_type: "hero", source_id: h.id!, result_status: status,
      final_score: null, settled_at: new Date().toISOString(), settled_method: "manual",
      payload: { sport: h.sport, league: h.league, homeTeam: h.homeTeam, awayTeam: h.awayTeam, prediction: h.prediction, odds: Number(h.odds) || 0, kickoff: h.kickoff, description: h.description ?? null, homeTeamLogo: h.homeTeamLogo ?? null, awayTeamLogo: h.awayTeamLogo ?? null, confidence: h.confidence ?? null, isPremium: false },
    }, { onConflict: "source_type,source_id" });
  };

  const handleHeroVerdict = (status: Verdict) => {
    if (!hero) return;
    setBusyId(`hero-${hero.id}-${status}`);
    (async () => {
      await applyHeroVerdict(hero, status);
      toast({ title: `Hero: ${status}${status === "won" ? " — w Yesterday's Wins ✅" : ""}` });
      await reload(date);
      onSaved?.();
    })().catch((e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" })).finally(() => setBusyId(null));
  };

  const handleResetHero = () => {
    if (!hero) return;
    setBusyId(`hero-reset`);
    (async () => {
      await (supabase as any).from("featured_picks").update({ status: "upcoming", won_at: null }).eq("id", hero.id!);
      await (supabase as any).from("match_results").delete().eq("source_type", "hero").eq("source_id", hero.id!);
      toast({ title: "Hero reset to unsettled" });
      await reload(date);
    })().catch((e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" })).finally(() => setBusyId(null));
  };

  // ---------------------------- AI settle run --------------------------------

  const handleAiSettle = async () => {
    setSettling(true);
    try {
      const { data, error } = await supabase.functions.invoke("settle-results", {
        body: { mode: date },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const t = data?.tips || {};
      const parts: string[] = [];
      if (typeof t.won === "number") parts.push(`${t.won}W`);
      if (typeof t.lost === "number") parts.push(`${t.lost}L`);
      if (typeof t.void === "number") parts.push(`${t.void}V`);
      if (data?.hero?.status) parts.push(`hero: ${data.hero.status}`);
      if (typeof data?.coupons?.settled === "number") parts.push(`coupons: ${data.coupons.settled}`);
      const unresolvedCount = Array.isArray(t.unresolved) ? t.unresolved.length : 0;
      if (unresolvedCount > 0) parts.push(`${unresolvedCount} unresolved (ustaw ręcznie)`);
      toast({
        title: parts.length ? `AI settled: ${parts.join(" / ")}` : "Nothing to settle",
        description: `Date (Warsaw): ${data?.date || date}${data?.webCalls ? ` · web searches: ${data.webCalls}` : ""}`,
      });
      await reload(date);
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Settlement failed", description: e.message, variant: "destructive" });
    } finally {
      setSettling(false);
    }
  };

  // --------------------------------- render ----------------------------------

  const busyIcon = (key: string) =>
    busyId === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null;

  const unsettledCount =
    tips.filter((t) => t.status === "upcoming").length +
    coupons.filter((c) => c.status === "active" || c.status === "pending").length +
    (hero && hero.status === "upcoming" ? 1 : 0);

  const verdictButtons = (busyKey: string, onVerdict: (v: Verdict) => void) => (
    <LegVerdictButtons busyKey={busyKey} onVerdict={onVerdict} />
  );

  return (
    <div className="space-y-4">
      <Card className="bg-card border-amber-500/30 shadow-md shadow-amber-500/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-400" /> Yesterday ({tips.length + coupons.length + (hero ? 1 : 0)})
            </h2>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value || getYesterdayWarsaw())}
                className="h-8 w-36 text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => reload(date)} disabled={loading} title="Reload">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white"
                onClick={handleAiSettle}
                disabled={settling}
                title="AI settle: odds-api + AI web search dla wybranego dnia"
              >
                {settling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                AI Settle
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">
            Każdy mecz/kupon/noga z wybranego dnia: rozstrzygnięte pokazują status, braki uzupełniasz ręcznie (✅ ❌ ➖) albo „AI Settle" (odds-api + AI web search).
          </p>

          {unsettledCount > 0 && (
            <p className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider mb-3">
              ⚠️ {unsettledCount} unsettled — ustaw werdykt ręcznie albo odpal „AI Settle"
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-5 max-h-[620px] overflow-y-auto">
              {/* HERO */}
              {hero && (
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Hero
                  </h3>
                  <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl hover:bg-amber-500/10">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/30 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 mr-1.5">HERO</span>
                          {hero.homeTeam} vs {hero.awayTeam}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">{hero.prediction} @ {hero.odds || "—"} · {fmtKickoff(hero.kickoff)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hero.status !== "upcoming" && (
                        <Badge variant={statusBadge(hero.status).variant} className="text-[9px] mr-1">
                          {statusBadge(hero.status).label}
                        </Badge>
                      )}
                      {hero.status === "upcoming" ? (
                        verdictButtons(`hero-${hero.id}`, (v) => handleHeroVerdict(v))
                      ) : (
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Reset to unsettled" onClick={handleResetHero}><RotateCcw className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {!hero && (
                <p className="text-[10px] text-muted-foreground">Brak hero z tego dnia.</p>
              )}

              {/* TIPS */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Tips ({tips.length})</h3>
                <div className="space-y-2">
                  {tips.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Brak tipów z tego dnia.</p>}
                  {tips.map((tip) => (
                    <div key={tip.id} className={`flex items-center justify-between p-3 rounded-xl border group ${
                      tip.status === "upcoming"
                        ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                        : "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10"
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={20} />
                        <span className="text-[9px] text-muted-foreground">vs</span>
                        <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={20} />
                        <div className="ml-1.5 min-w-0">
                          <p className="text-xs font-medium truncate">{tip.homeTeam} vs {tip.awayTeam}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{tip.prediction} @ {tip.odds} · {fmtKickoff(tip.kickoff)}</p>
                        </div>
                        {tip.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {tip.status !== "upcoming" && (
                          <Badge variant={statusBadge(tip.status).variant} className="text-[9px] mr-1">
                            {statusBadge(tip.status).label}
                          </Badge>
                        )}
                        {tip.status === "upcoming" ? (
                          verdictButtons(`tip-${tip.id}`, (v) => handleTipVerdict(tip, v))
                        ) : (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Reset to unsettled" onClick={() => handleResetTip(tip)}>{busyIcon(`tip-${tip.id}-reset`) || <RotateCcw className="w-3.5 h-3.5" />}</Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete" onClick={() => handleDeleteTip(tip)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COUPONS */}
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-400" /> Coupons ({coupons.length})
                </h3>
                <div className="space-y-3">
                  {coupons.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Brak kuponów z tego dnia.</p>}
                  {coupons.map((coupon) => (
                    <div key={coupon.id} className="p-3 rounded-xl border border-blue-500/15 bg-blue-500/[0.04] space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Receipt className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <p className="text-xs font-medium truncate">{coupon.name} <span className="text-[10px] text-muted-foreground">(@{coupon.totalOdds.toFixed(2)})</span></p>
                          {coupon.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <Badge variant={statusBadge(coupon.status).variant} className="text-[9px]">
                          {statusBadge(coupon.status).label}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {coupon.matches.map((m, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-white/[0.04]">
                            <div className="flex items-center gap-2 min-w-0">
                              <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo} size={16} />
                              <span className="text-[9px] text-muted-foreground">vs</span>
                              <TeamLogo teamName={m.awayTeam} logoUrl={m.awayTeamLogo} size={16} />
                              <div className="min-w-0 ml-1">
                                <p className="text-[11px] truncate">{m.homeTeam} vs {m.awayTeam}</p>
                                <p className="text-[9px] text-muted-foreground truncate">{m.prediction} @ {m.odds} · {fmtKickoff(m.kickoff)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {m.legStatus && (
                                <Badge variant={statusBadge(m.legStatus).variant} className="text-[9px]">
                                  {statusBadge(m.legStatus).label}
                                </Badge>
                              )}
                              {verdictButtons(`leg-${coupon.id}-${i}`, (v) => handleLegVerdict(coupon, i, v))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YesterdaySettleTab;
