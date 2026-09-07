import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import {
  Globe,
  Loader2,
  Trash2,
  Zap,
  Receipt,
  TrendingUp,
  Crown,
  Pencil,
  X,
  BadgeCheck,
  BadgeX,
  RotateCcw,
  EyeOff,
} from "lucide-react";
import {
  loadTips,
  updateTip,
  deleteTip,
  unpublishTipById,
  Tip,
} from "@/lib/tipsStorage";
import {
  loadCoupons,
  deleteCoupon,
  updateCoupon,
  calculateTotalOdds,
  CouponMatch,
  Coupon,
} from "@/lib/couponStorage";
import {
  loadFeaturedPick,
  updateFeaturedPickById,
  deleteQueuedFeaturedPick,
  FeaturedPick,
} from "@/lib/featuredPickStorage";
import LogoPicker from "@/components/admin/LogoPicker";
import { SPORTS } from "@/components/admin/QueueTab";
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

const toLocalInput = (iso: string): string => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
};

const fromLocalInput = (v: string): string => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toISOString();
};

// ---------------------------------------------------------------- component ---

interface MatchForm {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: string;
  league: string;
  sport: string;
  kickoff: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

const emptyMatchForm = (): MatchForm => ({
  homeTeam: "", awayTeam: "", prediction: "", odds: "",
  league: "", sport: "Football", kickoff: "",
  homeTeamLogo: null, awayTeamLogo: null,
});

interface TipForm {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: string;
  kickoff: string;
  description: string;
  isPremium: boolean;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

const LiveTab = ({ onSaved }: { onSaved?: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"tips" | "coupons" | "hero">("tips");

  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [hero, setHero] = useState<FeaturedPick | null>(null);

  const reload = useCallback(async () => {
    const [t, c, h] = await Promise.all([loadTips(true, true), loadCoupons(), loadFeaturedPick()]);
    // Wczorajsze mecze NIE należą do Live — trafiają do zakładki Yesterday
    const warsawDay = (ms: number) =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
    const today = warsawDay(Date.now());
    const liveTips = t.filter((tip) => {
      const ko = new Date(tip.kickoff).getTime();
      return isNaN(ko) || warsawDay(ko) >= today;
    });
    const liveHero = h && (() => {
      const ko = new Date(h.kickoff).getTime();
      return isNaN(ko) || warsawDay(ko) >= today ? h : null;
    })();
    setTips(liveTips);
    setCoupons(c);
    setHero(liveHero);
  }, []);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  const total = tips.length + coupons.length + (hero ? 1 : 0);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusyId(key);
    try {
      await fn();
    } catch (e: any) {
      toast({ title: "Operation failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  // ------------------------------- tip edit ----------------------------------

  const [tipForm, setTipForm] = useState<TipForm | null>(null);
  const [editingTipId, setEditingTipId] = useState<number | null>(null);
  const [savingTip, setSavingTip] = useState(false);

  const editTip = (tip: Tip) => {
    setTipForm({
      sport: tip.sport || "Football",
      league: tip.league || "",
      homeTeam: tip.homeTeam || "",
      awayTeam: tip.awayTeam || "",
      prediction: tip.prediction || "",
      odds: String(tip.odds ?? ""),
      kickoff: toLocalInput(tip.kickoff || ""),
      description: tip.description || "",
      isPremium: !!tip.isPremium,
      homeTeamLogo: tip.homeTeamLogo || null,
      awayTeamLogo: tip.awayTeamLogo || null,
    });
    setEditingTipId(tip.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveTip = async () => {
    if (!tipForm || editingTipId === null) return;
    if (!tipForm.homeTeam || !tipForm.awayTeam || !tipForm.prediction || !tipForm.odds || !tipForm.kickoff) {
      toast({ title: "Wypełnij: drużyny, typ, kurs i godzinę", variant: "destructive" });
      return;
    }
    setSavingTip(true);
    try {
      await updateTip({
        id: editingTipId,
        sport: tipForm.sport,
        league: tipForm.league,
        homeTeam: tipForm.homeTeam,
        awayTeam: tipForm.awayTeam,
        prediction: tipForm.prediction,
        odds: parseFloat(tipForm.odds),
        kickoff: fromLocalInput(tipForm.kickoff),
        status: "upcoming",
        isPremium: tipForm.isPremium,
        isPublished: true,
        queued: false,
        homeTeamLogo: tipForm.homeTeamLogo,
        awayTeamLogo: tipForm.awayTeamLogo,
        description: tipForm.description,
      });
      toast({ title: "Tip updated ✅" });
      setTipForm(null);
      setEditingTipId(null);
      await reload();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingTip(false);
    }
  };

  const setTipStatus = async (tip: Tip, status: Tip["status"]) => {
    await withBusy(`st-${tip.id}`, async () => {
      await updateTip({ ...tip, status, isPublished: true, queued: false });
      // Archiwum Yesterday's Wins — natychmiast, bez czekania na 3:00
      if (status === "won" || status === "lost" || status === "void") {
        await (supabase as any).from("match_results").upsert({
          source_type: "tip", source_id: tip.id, result_status: status,
          final_score: null, settled_at: new Date().toISOString(), settled_method: "manual",
          payload: { sport: tip.sport, league: tip.league, homeTeam: tip.homeTeam, awayTeam: tip.awayTeam, prediction: tip.prediction, odds: Number(tip.odds) || 0, kickoff: tip.kickoff, description: tip.description ?? null, homeTeamLogo: tip.homeTeamLogo ?? null, awayTeamLogo: tip.awayTeamLogo ?? null, isPremium: !!tip.isPremium },
        }, { onConflict: "source_type,source_id" });
      } else {
        // Reset do upcoming — usuń z archiwum
        await (supabase as any).from("match_results").delete().eq("source_type", "tip").eq("source_id", tip.id);
      }
      toast({ title: `Status: ${status}${status === "won" ? " — widoczny w Yesterday's Wins ✅" : ""}` });
      await reload();
      onSaved?.();
    });
  };

  // ----------------------------- coupon edit ---------------------------------

  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [couponForm, setCouponForm] = useState<{
    name: string;
    stake: string;
    isPremium: boolean;
    status: Coupon["status"];
    matches: CouponMatch[];
  } | null>(null);
  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatchForm());
  const [editingLegIndex, setEditingLegIndex] = useState<number | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const editCoupon = (coupon: Coupon) => {
    setCouponForm({
      name: coupon.name,
      stake: coupon.stake ? String(coupon.stake) : "",
      isPremium: !!coupon.isPremium,
      status: coupon.status,
      matches: [...coupon.matches],
    });
    setEditingCouponId(coupon.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddLeg = () => {
    if (!couponForm) return;
    const { homeTeam, awayTeam, prediction, odds, league, sport, kickoff } = matchForm;
    if (!homeTeam || !awayTeam || !prediction || !odds) {
      toast({ title: "Wypełnij: drużyny, typ i kurs", variant: "destructive" });
      return;
    }
    const leg: CouponMatch = {
      homeTeam, awayTeam, prediction,
      odds: parseFloat(odds),
      league, sport,
      kickoff: fromLocalInput(kickoff),
      homeTeamLogo: matchForm.homeTeamLogo,
      awayTeamLogo: matchForm.awayTeamLogo,
    };
    if (editingLegIndex !== null) {
      const next = [...couponForm.matches];
      next[editingLegIndex] = leg;
      setCouponForm({ ...couponForm, matches: next });
      setEditingLegIndex(null);
      setMatchForm(emptyMatchForm());
      return;
    }
    const dup = couponForm.matches.some(
      (m) => m.homeTeam.toLowerCase() === homeTeam.toLowerCase() && m.awayTeam.toLowerCase() === awayTeam.toLowerCase(),
    );
    if (dup) {
      toast({ title: "Ten mecz już jest w kuponie", variant: "destructive" });
      return;
    }
    setCouponForm({ ...couponForm, matches: [...couponForm.matches, leg] });
    setMatchForm(emptyMatchForm());
  };

  const editLeg = (index: number) => {
    if (!couponForm) return;
    const m = couponForm.matches[index];
    setMatchForm({
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      prediction: m.prediction,
      odds: String(m.odds ?? ""),
      league: m.league || "",
      sport: m.sport || "Football",
      kickoff: toLocalInput(m.kickoff || ""),
      homeTeamLogo: m.homeTeamLogo || null,
      awayTeamLogo: m.awayTeamLogo || null,
    });
    setEditingLegIndex(index);
  };

  const removeLeg = (index: number) => {
    if (!couponForm) return;
    setCouponForm({ ...couponForm, matches: couponForm.matches.filter((_, x) => x !== index) });
    if (editingLegIndex === index) {
      setEditingLegIndex(null);
      setMatchForm(emptyMatchForm());
    } else if (editingLegIndex !== null && editingLegIndex > index) {
      setEditingLegIndex(editingLegIndex - 1);
    }
  };

  const handleSaveCoupon = async () => {
    if (!couponForm || editingCouponId === null) return;
    if (!couponForm.name || couponForm.matches.length < 2) {
      toast({ title: "Podaj nazwę i min. 2 mecze", variant: "destructive" });
      return;
    }
    setSavingCoupon(true);
    try {
      const original = coupons.find((c) => c.id === editingCouponId);
      await updateCoupon({
        id: editingCouponId,
        name: couponForm.name,
        matches: couponForm.matches,
        totalOdds: calculateTotalOdds(couponForm.matches),
        stake: couponForm.stake ? parseFloat(couponForm.stake) : undefined,
        status: couponForm.status,
        isPremium: couponForm.isPremium,
        createdAt: original?.createdAt || new Date().toISOString(),
        queued: false,
      });
      // Archiwum Yesterday's Wins przy statusie końcowym
      if (couponForm.status === "won" || couponForm.status === "lost" || couponForm.status === "void") {
        await (supabase as any).from("match_results").upsert({
          source_type: "coupon", source_id: editingCouponId, result_status: couponForm.status,
          final_score: null, settled_at: new Date().toISOString(), settled_method: "manual",
          payload: { name: couponForm.name, matches: couponForm.matches.map((m) => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, prediction: m.prediction, odds: m.odds, league: m.league, sport: m.sport, kickoff: m.kickoff, legStatus: m.legStatus ?? null, finalScore: m.finalScore ?? null })), totalOdds: calculateTotalOdds(couponForm.matches), stake: couponForm.stake ? parseFloat(couponForm.stake) : null, isPremium: couponForm.isPremium, createdAt: original?.createdAt || null },
        }, { onConflict: "source_type,source_id" });
      } else {
        await (supabase as any).from("match_results").delete().eq("source_type", "coupon").eq("source_id", editingCouponId);
      }
      toast({ title: "Coupon updated ✅" });
      setCouponForm(null);
      setEditingCouponId(null);
      await reload();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingCoupon(false);
    }
  };

  // -------------------------------- hero edit --------------------------------

  const [heroForm, setHeroForm] = useState<TipForm & { confidence: string } | null>(null);
  const [savingHero, setSavingHero] = useState(false);

  const editHero = () => {
    if (!hero) return;
    setHeroForm({
      sport: hero.sport || "Football",
      league: hero.league || "",
      homeTeam: hero.homeTeam || "",
      awayTeam: hero.awayTeam || "",
      prediction: hero.prediction || "",
      odds: String(hero.odds ?? ""),
      kickoff: toLocalInput(hero.kickoff || ""),
      description: hero.description || "",
      isPremium: true,
      confidence: hero.confidence || "High",
      homeTeamLogo: hero.homeTeamLogo || null,
      awayTeamLogo: hero.awayTeamLogo || null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveHero = async () => {
    if (!hero?.id || !heroForm) return;
    if (!heroForm.homeTeam || !heroForm.awayTeam || !heroForm.prediction) {
      toast({ title: "Wypełnij: drużyny i typ", variant: "destructive" });
      return;
    }
    setSavingHero(true);
    try {
      await updateFeaturedPickById(hero.id, {
        sport: heroForm.sport,
        league: heroForm.league,
        homeTeam: heroForm.homeTeam,
        awayTeam: heroForm.awayTeam,
        prediction: heroForm.prediction,
        odds: heroForm.odds,
        kickoff: heroForm.kickoff ? fromLocalInput(heroForm.kickoff) : hero.kickoff,
        confidence: heroForm.confidence,
        status: hero.status || "upcoming",
        description: heroForm.description,
        homeTeamLogo: heroForm.homeTeamLogo,
        awayTeamLogo: heroForm.awayTeamLogo,
        queued: false,
      });
      toast({ title: "Hero updated ⚡" });
      setHeroForm(null);
      await reload();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingHero(false);
    }
  };

  const deleteActiveHero = async () => {
    if (!hero?.id || !window.confirm("Usunąć aktywny hero? Strona pokaże sekcję demonstracyjną.")) return;
    await withBusy("hero-del", async () => {
      const ok = await deleteQueuedFeaturedPick(hero.id!);
      if (!ok) throw new Error("Nie udało się usunąć — upewnij się, że jesteś zalogowany kontem admina.");
      toast({ title: "Hero deleted" });
      await reload();
      onSaved?.();
    });
  };

  // --------------------------------- render ----------------------------------

  const busyIcon = (key: string) =>
    busyId === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-emerald-500/30 shadow-md shadow-emerald-500/5">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" /> Live Content ({total})
            </h2>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { reload(); toast({ title: "Odświeżono" }); }} disabled={loading}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Refresh
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">
            Podgląd i edycja wszystkiego, co jest aktualnie opublikowane na stronie. Zmiany widoczne od razu.
          </p>

          <div className="flex gap-2 mb-4">
            {([
              { id: "tips" as const, label: `Tips (${tips.length})`, icon: TrendingUp },
              { id: "coupons" as const, label: `Coupons (${coupons.length})`, icon: Receipt },
              { id: "hero" as const, label: `Hero (${hero ? 1 : 0})`, icon: Zap },
            ]).map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={subTab === t.id ? "default" : "outline"}
                className={`h-8 gap-1.5 text-[10px] ${subTab === t.id ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" : ""}`}
                onClick={() => setSubTab(t.id)}
              >
                <t.icon className="w-3 h-3" /> {t.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* ============================ TIPS ============================ */}
              {subTab === "tips" && (
                <div className="space-y-3">
                  {tipForm !== null && editingTipId !== null && (
                    <div className="p-4 bg-muted/10 border border-emerald-500/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold font-display uppercase tracking-wider">Edit live tip</p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setTipForm(null); setEditingTipId(null); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Sport</Label>
                          <Select value={tipForm.sport} onValueChange={(v) => setTipForm({ ...tipForm, sport: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">League</Label>
                          <Input className="h-8 text-xs" value={tipForm.league} onChange={(e) => setTipForm({ ...tipForm, league: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Kickoff *</Label>
                          <Input type="datetime-local" className="h-8 text-xs" value={tipForm.kickoff} onChange={(e) => setTipForm({ ...tipForm, kickoff: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Odds *</Label>
                          <Input className="h-8 text-xs" value={tipForm.odds} onChange={(e) => setTipForm({ ...tipForm, odds: e.target.value })} inputMode="decimal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <LogoPicker label="Home" teamName={tipForm.homeTeam} value={tipForm.homeTeamLogo} onChange={(url) => setTipForm({ ...tipForm, homeTeamLogo: url })} />
                        <LogoPicker label="Away" teamName={tipForm.awayTeam} value={tipForm.awayTeamLogo} onChange={(url) => setTipForm({ ...tipForm, awayTeamLogo: url })} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input className="h-8 text-xs" value={tipForm.homeTeam} onChange={(e) => setTipForm({ ...tipForm, homeTeam: e.target.value })} placeholder="Home team *" />
                        <Input className="h-8 text-xs" value={tipForm.awayTeam} onChange={(e) => setTipForm({ ...tipForm, awayTeam: e.target.value })} placeholder="Away team *" />
                        <Input className="h-8 text-xs" value={tipForm.prediction} onChange={(e) => setTipForm({ ...tipForm, prediction: e.target.value })} placeholder="Prediction *" />
                      </div>
                      <Textarea className="min-h-[70px] text-xs" value={tipForm.description} onChange={(e) => setTipForm({ ...tipForm, description: e.target.value })} placeholder="Analysis" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox id="ltPremium" checked={tipForm.isPremium} onCheckedChange={(c) => setTipForm({ ...tipForm, isPremium: c === true })} />
                          <Label htmlFor="ltPremium" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-yellow-500" /> Premium
                          </Label>
                        </div>
                        <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white" onClick={handleSaveTip} disabled={savingTip}>
                          {savingTip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                          Save changes
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {tips.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Brak opublikowanych tipów.</p>}
                    {tips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl hover:bg-emerald-500/10 group">
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
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" title="Mark won" onClick={() => setTipStatus(tip, "won")}>{busyIcon(`won-${tip.id}`) || <BadgeCheck className="w-3.5 h-3.5" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Mark lost" onClick={() => setTipStatus(tip, "lost")}>{busyIcon(`lost-${tip.id}`) || <BadgeX className="w-3.5 h-3.5" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Reset to upcoming" onClick={() => setTipStatus(tip, "upcoming")}>{busyIcon(`up-${tip.id}`) || <RotateCcw className="w-3.5 h-3.5" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => editTip(tip)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Unpublish (→ draft)" onClick={() => withBusy(`unpub-${tip.id}`, async () => {
                            await unpublishTipById(tip.id);
                            toast({ title: "Tip przeniesiony do szkiców 📝" });
                            await reload();
                            onSaved?.();
                          })}><EyeOff className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete" onClick={() => { if (window.confirm("Usunąć ten tip na stałe?")) withBusy(`del-${tip.id}`, async () => {
                            await deleteTip(tip.id);
                            await reload();
                            onSaved?.();
                          }); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =========================== COUPONS =========================== */}
              {subTab === "coupons" && (
                <div className="space-y-4">
                  {couponForm !== null && editingCouponId !== null && (
                    <div className="p-4 bg-muted/10 border border-emerald-500/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold font-display uppercase tracking-wider">Edit live coupon</p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setCouponForm(null); setEditingCouponId(null); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        <Input className="h-8 text-xs md:col-span-2" value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} placeholder="Nazwa kuponu *" />
                        <Input className="h-8 text-xs" value={couponForm.stake} onChange={(e) => setCouponForm({ ...couponForm, stake: e.target.value })} placeholder="Stake" inputMode="decimal" />
                        <Select value={couponForm.status} onValueChange={(v: any) => setCouponForm({ ...couponForm, status: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                            <SelectItem value="void">Void</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox id="lcPremium" checked={couponForm.isPremium} onCheckedChange={(c) => setCouponForm({ ...couponForm, isPremium: c === true })} />
                          <Label htmlFor="lcPremium" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-yellow-500" /> Premium
                          </Label>
                        </div>
                        <div className="text-right text-xs font-bold text-blue-300">
                          @{calculateTotalOdds(couponForm.matches).toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">({couponForm.matches.length} legs)</span>
                        </div>
                      </div>

                      <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-background/40">
                        <p className="text-[9px] uppercase text-muted-foreground font-bold">Dodaj mecz</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <Input className="h-8 text-xs" value={matchForm.homeTeam} onChange={(e) => setMatchForm({ ...matchForm, homeTeam: e.target.value })} placeholder="Home team *" />
                          <Input className="h-8 text-xs" value={matchForm.awayTeam} onChange={(e) => setMatchForm({ ...matchForm, awayTeam: e.target.value })} placeholder="Away team *" />
                          <Input className="h-8 text-xs" value={matchForm.prediction} onChange={(e) => setMatchForm({ ...matchForm, prediction: e.target.value })} placeholder="Prediction *" />
                          <Input className="h-8 text-xs" value={matchForm.odds} onChange={(e) => setMatchForm({ ...matchForm, odds: e.target.value })} placeholder="Odds *" inputMode="decimal" />
                          <Input className="h-8 text-xs" value={matchForm.league} onChange={(e) => setMatchForm({ ...matchForm, league: e.target.value })} placeholder="League" />
                          <Select value={matchForm.sport} onValueChange={(v) => setMatchForm({ ...matchForm, sport: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <LogoPicker label="Home" teamName={matchForm.homeTeam} value={matchForm.homeTeamLogo} onChange={(url) => setMatchForm({ ...matchForm, homeTeamLogo: url })} />
                          <LogoPicker label="Away" teamName={matchForm.awayTeam} value={matchForm.awayTeamLogo} onChange={(url) => setMatchForm({ ...matchForm, awayTeamLogo: url })} />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[9px] uppercase text-muted-foreground">Kickoff</Label>
                            <Input type="datetime-local" className="h-8 text-xs" value={matchForm.kickoff} onChange={(e) => setMatchForm({ ...matchForm, kickoff: e.target.value })} />
                          </div>
                          <Button size="sm" variant="outline" className={`h-8 gap-1.5 ${editingLegIndex !== null ? "border-amber-500/50 text-amber-300" : "border-blue-500/40 text-blue-300"}`} onClick={handleAddLeg}>
                            {editingLegIndex !== null ? "Update leg" : "Add leg"}
                          </Button>
                        </div>
                      </div>

                      {couponForm.matches.length > 0 && (
                        <div className="space-y-1.5">
                          {couponForm.matches.map((m, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${editingLegIndex === i ? "bg-amber-500/10 border border-amber-500/40" : "bg-blue-500/5 border border-blue-500/15"}`}
                              onClick={() => editLeg(i)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[9px] text-muted-foreground font-bold w-4">{i + 1}.</span>
                                <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo} size={16} />
                                <span className="text-[9px] text-muted-foreground">vs</span>
                                <TeamLogo teamName={m.awayTeam} logoUrl={m.awayTeamLogo} size={16} />
                                <div className="min-w-0 ml-1">
                                  <p className="text-[11px] truncate">{m.homeTeam} vs {m.awayTeam}</p>
                                  <p className="text-[9px] text-muted-foreground truncate">{m.prediction} @ {m.odds}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" onClick={(e) => { e.stopPropagation(); removeLeg(i); }}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white" onClick={handleSaveCoupon} disabled={savingCoupon}>
                        {savingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        Save changes
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[480px] overflow-y-auto">
                    {coupons.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Brak opublikowanych kuponów.</p>}
                    {coupons.map((coupon) => (
                      <div key={coupon.id} className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl hover:bg-blue-500/10 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <Receipt className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{coupon.name} <span className="text-[10px] text-muted-foreground">({coupon.matches.length} legs · @{coupon.totalOdds.toFixed(2)} · {coupon.status})</span></p>
                            <p className="text-[10px] text-muted-foreground truncate">{coupon.matches.map((m) => m.homeTeam).join(" · ")}</p>
                          </div>
                          {coupon.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => editCoupon(coupon)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete" onClick={() => { if (window.confirm("Usunąć kupon na stałe?")) withBusy(`cdc-${coupon.id}`, async () => {
                            await deleteCoupon(coupon.id);
                            toast({ title: "Coupon deleted" });
                            await reload();
                            onSaved?.();
                          }); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================= HERO ============================ */}
              {subTab === "hero" && (
                <div className="space-y-4">
                  {heroForm !== null && (
                    <div className="p-4 bg-muted/10 border border-emerald-500/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold font-display uppercase tracking-wider">Edit live hero</p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setHeroForm(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Sport</Label>
                          <Select value={heroForm.sport} onValueChange={(v) => setHeroForm({ ...heroForm, sport: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">League</Label>
                          <Input className="h-8 text-xs" value={heroForm.league} onChange={(e) => setHeroForm({ ...heroForm, league: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Kickoff</Label>
                          <Input type="datetime-local" className="h-8 text-xs" value={heroForm.kickoff} onChange={(e) => setHeroForm({ ...heroForm, kickoff: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Odds</Label>
                          <Input className="h-8 text-xs" value={heroForm.odds} onChange={(e) => setHeroForm({ ...heroForm, odds: e.target.value })} inputMode="decimal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <LogoPicker label="Home" teamName={heroForm.homeTeam} value={heroForm.homeTeamLogo} onChange={(url) => setHeroForm({ ...heroForm, homeTeamLogo: url })} />
                        <LogoPicker label="Away" teamName={heroForm.awayTeam} value={heroForm.awayTeamLogo} onChange={(url) => setHeroForm({ ...heroForm, awayTeamLogo: url })} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input className="h-8 text-xs" value={heroForm.homeTeam} onChange={(e) => setHeroForm({ ...heroForm, homeTeam: e.target.value })} placeholder="Home team *" />
                        <Input className="h-8 text-xs" value={heroForm.awayTeam} onChange={(e) => setHeroForm({ ...heroForm, awayTeam: e.target.value })} placeholder="Away team *" />
                        <Input className="h-8 text-xs" value={heroForm.prediction} onChange={(e) => setHeroForm({ ...heroForm, prediction: e.target.value })} placeholder="Prediction *" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Confidence</Label>
                          <Select value={heroForm.confidence} onValueChange={(v) => setHeroForm({ ...heroForm, confidence: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">High 🔥</SelectItem>
                              <SelectItem value="Medium">Medium ⚡</SelectItem>
                              <SelectItem value="Low">Low 🎲</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Textarea className="min-h-[70px] text-xs" value={heroForm.description} onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })} placeholder="Hero analysis" />
                      <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white" onClick={handleSaveHero} disabled={savingHero}>
                        {savingHero ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                        Save changes
                      </Button>
                    </div>
                  )}

                  {!hero && <p className="text-xs text-muted-foreground text-center py-8">Brak aktywnego hero — strona pokazuje sekcję demo. Dodaj hero przez Queue.</p>}
                  {hero && (
                    <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl hover:bg-amber-500/10 group">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{hero.homeTeam} vs {hero.awayTeam} <span className="text-[10px] text-muted-foreground">@{hero.odds}</span></p>
                          <p className="text-[10px] text-muted-foreground truncate">{hero.prediction} · {fmtKickoff(hero.kickoff)} · {hero.confidence}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={editHero}><Pencil className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete hero" onClick={deleteActiveHero}>{busyIcon("hero-del") || <Trash2 className="w-3 h-3" />}</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveTab;
