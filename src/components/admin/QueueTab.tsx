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
  Hourglass,
  Send,
  Loader2,
  Trash2,
  EyeOff,
  Zap,
  Receipt,
  TrendingUp,
  Crown,
  Pencil,
  X,
  PlusCircle,
} from "lucide-react";
import {
  loadQueuedTips,
  unqueueTipById,
  addTip,
  updateTip,
  publishTipById,
  Tip,
} from "@/lib/tipsStorage";
import {
  loadQueuedCoupons,
  publishCouponById,
  deleteCoupon,
  calculateTotalOdds,
  CouponMatch,
  Coupon,
} from "@/lib/couponStorage";
import {
  loadQueuedFeaturedPicks,
  publishFeaturedPickById,
  deleteQueuedFeaturedPick,
  saveFeaturedPick,
  updateFeaturedPickById,
  QueuedFeaturedPick,
} from "@/lib/featuredPickStorage";
import { supabase } from "@/integrations/supabase/client";
import LogoPicker from "@/components/admin/LogoPicker";

export const SPORTS = [
  "Football", "Basketball", "Tennis", "Volleyball", "Hockey", "Handball",
  "MMA", "Baseball", "Esports", "Darts", "Snooker", "Other",
];

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

const SearchIconSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

const UploadIconSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
);

const CheckIconSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
);

// --------------------------------------------------------------- tip form ---

interface TipForm {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: string;
  kickoff: string; // datetime-local value
  description: string;
  isPremium: boolean;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

const emptyTipForm = (): TipForm => ({
  sport: "Football",
  league: "",
  homeTeam: "",
  awayTeam: "",
  prediction: "",
  odds: "",
  kickoff: "",
  description: "",
  isPremium: true,
  homeTeamLogo: null,
  awayTeamLogo: null,
});

// ------------------------------------------------------------ coupon match ---

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

// ---------------------------------------------------------------- component ---

export interface QueueBuilderState {
  name: string;
  stake: string;
  isPremium: boolean;
  matches: CouponMatch[];
}

interface QueueTabProps {
  onSaved?: () => void;
  /** Controlled builder kuponu — stan trzymany w Admin, by import mógł dokładać nogi. */
  builder: QueueBuilderState;
  setBuilder: (patch: Partial<QueueBuilderState>) => void;
}

const QueueTab = ({ onSaved, builder, setBuilder }: QueueTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [subTab, setSubTab] = useState<"tips" | "coupons" | "hero">("tips");
  const [loggedIn, setLoggedIn] = useState(true);

  const [queuedTips, setQueuedTips] = useState<Tip[]>([]);
  const [queuedCoupons, setQueuedCoupons] = useState<Coupon[]>([]);
  const [queuedHeroes, setQueuedHeroes] = useState<QueuedFeaturedPick[]>([]);

  const reload = useCallback(async () => {
    const [t, c, h] = await Promise.all([loadQueuedTips(), loadQueuedCoupons(), loadQueuedFeaturedPicks()]);
    setQueuedTips(t);
    setQueuedCoupons(c);
    setQueuedHeroes(h);
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
    });
    reload().finally(() => setLoading(false));
  }, [reload]);

  const total = queuedTips.length + queuedCoupons.length + queuedHeroes.length;

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

  // ------------------------------- release all -------------------------------

  const handleReleaseAll = async () => {
    if (!window.confirm("Opublikować całą kolejkę teraz + wysłać jedno powiadomienie push do Premium?")) return;
    setReleasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("settle-results", {
        body: { action: "release" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const released = typeof data?.released === "number" ? data.released : 0;
      const pushed = typeof data?.push?.success === "number" ? data.push.success : 0;
      toast({
        title: released > 0 ? `Opublikowano ${released} elementów! 🚀` : "Kolejka jest pusta",
        description: released > 0 ? `Push wysłany do ${pushed} urządzeń.` : undefined,
      });
      await reload();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Release failed", description: e.message, variant: "destructive" });
    } finally {
      setReleasing(false);
    }
  };

  // ------------------------------- tip actions -------------------------------

  const [tipForm, setTipForm] = useState<TipForm>(emptyTipForm());
  const [editingTipId, setEditingTipId] = useState<number | null>(null);
  const [savingTip, setSavingTip] = useState(false);
  const [showTipForm, setShowTipForm] = useState(false);

  const editQueuedTip = (tip: Tip) => {
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
    setShowTipForm(true);
    setSubTab("tips");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveTip = async () => {
    if (!tipForm.homeTeam || !tipForm.awayTeam || !tipForm.prediction || !tipForm.odds || !tipForm.kickoff) {
      toast({ title: "Wypełnij: drużyny, typ, kurs i godzinę", variant: "destructive" });
      return;
    }
    setSavingTip(true);
    try {
      const payload = {
        sport: tipForm.sport,
        league: tipForm.league,
        homeTeam: tipForm.homeTeam,
        awayTeam: tipForm.awayTeam,
        prediction: tipForm.prediction,
        odds: parseFloat(tipForm.odds),
        kickoff: fromLocalInput(tipForm.kickoff),
        status: "upcoming" as const,
        isPremium: tipForm.isPremium,
        isPublished: false,
        queued: true,
        homeTeamLogo: tipForm.homeTeamLogo,
        awayTeamLogo: tipForm.awayTeamLogo,
        description: tipForm.description,
      };
      if (editingTipId !== null) {
        await updateTip({ id: editingTipId, ...payload });
        toast({ title: "Queued tip updated ✅" });
      } else {
        const created = await addTip(payload);
        if (!created) throw new Error("Nie udało się zapisać tipa");
        toast({ title: "Tip dodany do kolejki ⏳", description: "Pojawi się w aplikacji o 3:00 (albo Publish now)." });
      }
      setTipForm(emptyTipForm());
      setEditingTipId(null);
      setShowTipForm(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingTip(false);
    }
  };

  // ----------------------------- coupon builder ------------------------------
  // Stan controlled z Admin (builder / setBuilder) — import dokłada nogi.

  const [matchForm, setMatchForm] = useState<MatchForm>(emptyMatchForm());
  const [editingLegIndex, setEditingLegIndex] = useState<number | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);

  const handleAddCouponMatch = () => {
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
      // Aktualizacja istniejącej nogi
      const next = [...builder.matches];
      next[editingLegIndex] = leg;
      setBuilder({ matches: next });
      setEditingLegIndex(null);
      setMatchForm(emptyMatchForm());
      return;
    }
    // Ochrona przed duplikatem tej samej pary
    const dup = builder.matches.some(
      (m) => m.homeTeam.toLowerCase() === homeTeam.toLowerCase() && m.awayTeam.toLowerCase() === awayTeam.toLowerCase(),
    );
    if (dup) {
      toast({ title: "Ten mecz już jest w kuponie", variant: "destructive" });
      return;
    }
    setBuilder({ matches: [...builder.matches, leg] });
    setMatchForm(emptyMatchForm());
  };

  const editLeg = (index: number) => {
    const m = builder.matches[index];
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
    setBuilder({ matches: builder.matches.filter((_, x) => x !== index) });
    if (editingLegIndex === index) {
      setEditingLegIndex(null);
      setMatchForm(emptyMatchForm());
    } else if (editingLegIndex !== null && editingLegIndex > index) {
      setEditingLegIndex(editingLegIndex - 1);
    }
  };

  /** Auto-nazwa kuponu: "Raków + Lech @4.5 (3 legs)" ze składowych. */
  const autoName = () => {
    if (!builder.matches.length) {
      toast({ title: "Najpierw dodaj mecze", variant: "destructive" });
      return;
    }
    const teams = builder.matches.slice(0, 2).map((m) => m.homeTeam.split(" ")[0]);
    const tail = builder.matches.length > 2 ? ` +${builder.matches.length - 2}` : "";
    setBuilder({ name: `${teams.join(" + ")}${tail} @${calculateTotalOdds(builder.matches).toFixed(2)}` });
  };

  const [editingQueuedCouponId, setEditingQueuedCouponId] = useState<number | null>(null);

  const editQueuedCoupon = (coupon: Coupon) => {
    setBuilder({
      name: coupon.name,
      stake: coupon.stake ? String(coupon.stake) : "",
      isPremium: !!coupon.isPremium,
      matches: [...coupon.matches],
    });
    setEditingQueuedCouponId(coupon.id);
    setSubTab("coupons");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEditQueuedCoupon = () => {
    setEditingQueuedCouponId(null);
    setBuilder({ name: "", stake: "", isPremium: true, matches: [] });
  };

  const handleSaveCoupon = async () => {
    if (!builder.name || builder.matches.length < 2) {
      toast({ title: "Podaj nazwę i dodaj min. 2 mecze", variant: "destructive" });
      return;
    }
    setSavingCoupon(true);
    try {
      if (editingQueuedCouponId !== null) {
        const { updateCoupon } = await import("@/lib/couponStorage");
        const original = queuedCoupons.find((c) => c.id === editingQueuedCouponId);
        await updateCoupon({
          id: editingQueuedCouponId,
          name: builder.name,
          matches: builder.matches,
          totalOdds: calculateTotalOdds(builder.matches),
          stake: builder.stake ? parseFloat(builder.stake) : undefined,
          status: "active",
          isPremium: builder.isPremium,
          createdAt: original?.createdAt || new Date().toISOString(),
          queued: true,
        });
        toast({ title: "Queued coupon updated ✅" });
      } else {
        const { addCoupon } = await import("@/lib/couponStorage");
        const created = await addCoupon({
          name: builder.name,
          matches: builder.matches,
          stake: builder.stake ? parseFloat(builder.stake) : undefined,
          status: "active",
          isPremium: builder.isPremium,
          queued: true,
        });
        if (!created) throw new Error("Nie udało się zapisać kuponu");
        toast({ title: "Kupon dodany do kolejki ⏳", description: `Total odds @${calculateTotalOdds(builder.matches).toFixed(2)}` });
      }
      setBuilder({ name: "", stake: "", isPremium: true, matches: [] });
      setEditingQueuedCouponId(null);
      await reload();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingCoupon(false);
    }
  };

  // -------------------------------- hero form --------------------------------

  const [heroForm, setHeroForm] = useState({
    sport: "Football",
    league: "",
    homeTeam: "",
    awayTeam: "",
    prediction: "",
    odds: "",
    kickoff: "",
    confidence: "High",
    description: "",
    isPremium: true,
    homeTeamLogo: null as string | null,
    awayTeamLogo: null as string | null,
  });
  const [savingHero, setSavingHero] = useState(false);
  const [editingHeroId, setEditingHeroId] = useState<number | null>(null);

  const editQueuedHero = (pick: QueuedFeaturedPick) => {
    setHeroForm({
      sport: pick.sport || "Football",
      league: pick.league || "",
      homeTeam: pick.homeTeam || "",
      awayTeam: pick.awayTeam || "",
      prediction: pick.prediction || "",
      odds: String(pick.odds ?? ""),
      kickoff: toLocalInput(pick.kickoff || ""),
      confidence: pick.confidence || "High",
      description: pick.description || "",
      isPremium: true,
      homeTeamLogo: pick.homeTeamLogo || null,
      awayTeamLogo: pick.awayTeamLogo || null,
    });
    setEditingHeroId(pick.id ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetHeroForm = () => {
    setHeroForm({
      sport: "Football", league: "", homeTeam: "", awayTeam: "",
      prediction: "", odds: "", kickoff: "", confidence: "High",
      description: "", isPremium: true,
      homeTeamLogo: null, awayTeamLogo: null,
    });
    setEditingHeroId(null);
  };

  const handleSaveHero = async () => {
    if (!heroForm.homeTeam || !heroForm.awayTeam || !heroForm.prediction || !heroForm.kickoff) {
      toast({ title: "Wypełnij: drużyny, typ i godzinę", variant: "destructive" });
      return;
    }
    setSavingHero(true);
    try {
      const payload: QueuedFeaturedPick = {
        sport: heroForm.sport,
        league: heroForm.league,
        homeTeam: heroForm.homeTeam,
        awayTeam: heroForm.awayTeam,
        prediction: heroForm.prediction,
        odds: heroForm.odds,
        kickoff: fromLocalInput(heroForm.kickoff),
        confidence: heroForm.confidence,
        status: "upcoming",
        description: heroForm.description,
        homeTeamLogo: heroForm.homeTeamLogo,
        awayTeamLogo: heroForm.awayTeamLogo,
        queued: true,
      };
      if (editingHeroId !== null) {
        await updateFeaturedPickById(editingHeroId, payload);
        toast({ title: "Queued hero updated ✅" });
      } else {
        await saveFeaturedPick(payload);
        toast({ title: "Hero dodany do kolejki ⏳", description: "O 3:00 zastąpi aktualny hero." });
      }
      resetHeroForm();
      await reload();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingHero(false);
    }
  };

  // --------------------------------- render ----------------------------------

  const [settling, setSettling] = useState(false);
  const handleSettleYesterday = async () => {
    setSettling(true);
    try {
      const { data, error } = await supabase.functions.invoke("settle-results", {
        body: { mode: "yesterday" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const t = data?.tips || {};
      const parts: string[] = [];
      if (typeof t.won === "number") parts.push(`${t.won}W`);
      if (typeof t.lost === "number") parts.push(`${t.lost}L`);
      if (typeof t.void === "number") parts.push(`${t.void}V`);
      const unresolvedCount = Array.isArray(t.unresolved) ? t.unresolved.length : 0;
      if (unresolvedCount > 0) parts.push(`${unresolvedCount} unresolved`);
      toast({
        title: parts.length ? `Settled: ${parts.join(" / ")}` : "Nothing to settle",
        description: `Date (Warsaw): ${data?.date || "yesterday"}`,
      });
    } catch (e: any) {
      toast({ title: "Settlement failed", description: e.message, variant: "destructive" });
    } finally {
      setSettling(false);
    }
  };

  const busyIcon = (key: string) =>
    busyId === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null;

  return (
    <div className="space-y-4">
      <Card className="bg-card border-pink-500/30 shadow-md shadow-pink-500/5">
        <CardContent className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-pink-500" /> Queue ({total})
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => { reload(); toast({ title: "Odświeżono" }); }}>
                {!loading && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
                )}
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                onClick={handleSettleYesterday}
                disabled={settling}
                title="Auto-settle yesterday's tips & coupons into Yesterday's Results (odds-api + AI fallback)"
              >
                {settling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckIconSvg />}
                Settle Yesterday
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                onClick={handleReleaseAll}
                disabled={releasing || total === 0}
              >
                {releasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Release Now
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mb-4">
            Wszystko tutaj publikuje się automatycznie o <span className="font-bold text-pink-400">3:00</span> (cron) z jednym powiadomieniem push do Premium. „Publish now" publikuje pojedynczy element od razu.
          </p>

          {!loggedIn && (
            <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-xl bg-amber-500/10 border border-amber-500/40">
              <p className="text-[11px] text-amber-200 font-bold">
                ⚠️ Nie jesteś zalogowany — dodawanie działa, ale Publish / Edit / Delete w kolejce wymagają zalogowania kontem admina.
              </p>
              <a href="#/auth" className="text-[10px] font-bold uppercase tracking-wider text-pink-300 hover:text-pink-200 whitespace-nowrap">
                Log in →
              </a>
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex gap-2 mb-4">
            {([
              { id: "tips" as const, label: `Tips (${queuedTips.length})`, icon: TrendingUp },
              { id: "coupons" as const, label: `Coupons (${queuedCoupons.length})`, icon: Receipt },
              { id: "hero" as const, label: `Hero (${queuedHeroes.length})`, icon: Zap },
            ]).map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={subTab === t.id ? "default" : "outline"}
                className={`h-8 gap-1.5 text-[10px] ${subTab === t.id ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white" : ""}`}
                onClick={() => setSubTab(t.id)}
              >
                <t.icon className="w-3 h-3" /> {t.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading queue…
            </div>
          ) : (
            <>
              {/* ============================ TIPS ============================ */}
              {subTab === "tips" && (
                <div className="space-y-3">
                  {!showTipForm && (
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 border-pink-500/40 text-pink-300 hover:bg-pink-500/10" onClick={() => { setShowTipForm(true); setTipForm(emptyTipForm()); setEditingTipId(null); }}>
                      <PlusCircle className="w-3.5 h-3.5" /> Add tip to queue
                    </Button>
                  )}

                  {showTipForm && (
                    <div className="p-4 bg-muted/10 border border-border/40 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold font-display uppercase tracking-wider">
                          {editingTipId !== null ? "Edit queued tip" : "New queued tip"}
                        </p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setShowTipForm(false); setEditingTipId(null); setTipForm(emptyTipForm()); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Sport</Label>
                          <Select value={tipForm.sport} onValueChange={(v) => setTipForm({ ...tipForm, sport: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">League</Label>
                          <Input className="h-8 text-xs" value={tipForm.league} onChange={(e) => setTipForm({ ...tipForm, league: e.target.value })} placeholder="Ekstraklasa" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Kickoff *</Label>
                          <Input type="datetime-local" className="h-8 text-xs" value={tipForm.kickoff} onChange={(e) => setTipForm({ ...tipForm, kickoff: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-muted-foreground">Odds *</Label>
                          <Input className="h-8 text-xs" value={tipForm.odds} onChange={(e) => setTipForm({ ...tipForm, odds: e.target.value })} placeholder="1.85" inputMode="decimal" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <LogoPicker label="Home" teamName={tipForm.homeTeam} value={tipForm.homeTeamLogo} onChange={(url) => setTipForm({ ...tipForm, homeTeamLogo: url })} />
                        <LogoPicker label="Away" teamName={tipForm.awayTeam} value={tipForm.awayTeamLogo} onChange={(url) => setTipForm({ ...tipForm, awayTeamLogo: url })} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input className="h-8 text-xs" value={tipForm.homeTeam} onChange={(e) => setTipForm({ ...tipForm, homeTeam: e.target.value })} placeholder="Home team *" />
                        <Input className="h-8 text-xs" value={tipForm.awayTeam} onChange={(e) => setTipForm({ ...tipForm, awayTeam: e.target.value })} placeholder="Away team *" />
                        <Input className="h-8 text-xs" value={tipForm.prediction} onChange={(e) => setTipForm({ ...tipForm, prediction: e.target.value })} placeholder="Prediction (np. Over 2.5) *" />
                      </div>
                      <Textarea className="min-h-[70px] text-xs" value={tipForm.description} onChange={(e) => setTipForm({ ...tipForm, description: e.target.value })} placeholder="Analysis / description (optional)" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox id="qtPremium" checked={tipForm.isPremium} onCheckedChange={(c) => setTipForm({ ...tipForm, isPremium: c === true })} />
                          <Label htmlFor="qtPremium" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-yellow-500" /> Premium
                          </Label>
                        </div>
                        <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white" onClick={handleSaveTip} disabled={savingTip}>
                          {savingTip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hourglass className="w-3.5 h-3.5" />}
                          {editingTipId !== null ? "Save changes" : "Add to Queue"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {queuedTips.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Brak tipów w kolejce. Dodaj ręcznie albo z Import (przycisk „Queue").</p>}
                    {queuedTips.map((tip) => (
                      <div key={tip.id} className="flex items-center justify-between p-3 bg-pink-500/5 border border-pink-500/15 rounded-xl hover:bg-pink-500/10 group">
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
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => editQueuedTip(tip)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" title="Publish now" onClick={() => withBusy(`tip-${tip.id}`, async () => {
                            if (!(await publishTipById(tip.id))) throw new Error("publish failed");
                            toast({ title: "Tip published ✅" });
                            await reload();
                          })}>{busyIcon(`tip-${tip.id}`) || <Send className="w-3 h-3" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Remove from queue (→ draft)" onClick={() => withBusy(`unq-${tip.id}`, async () => {
                            await unqueueTipById(tip.id);
                            toast({ title: "Tip przeniesiony do szkiców 📝" });
                            await reload();
                          })}>{busyIcon(`unq-${tip.id}`) || <EyeOff className="w-3 h-3" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete" onClick={() => { if (window.confirm("Usunąć ten tip?")) withBusy(`del-${tip.id}`, async () => {
                            const { deleteTip } = await import("@/lib/tipsStorage");
                            await deleteTip(tip.id);
                            await reload();
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
                  {/* Builder */}
                  <div className={`p-4 bg-muted/10 border rounded-xl space-y-3 ${editingQueuedCouponId !== null ? "border-amber-500/50" : "border-border/40"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold font-display uppercase tracking-wider">
                        {editingQueuedCouponId !== null ? "Edit queued coupon" : "Nowy kupon do kolejki"}
                      </p>
                      {editingQueuedCouponId !== null && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={cancelEditQueuedCoupon}>
                          <X className="w-3 h-3" /> Cancel
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <Input className="h-8 text-xs md:col-span-2" value={builder.name} onChange={(e) => setBuilder({ name: e.target.value })} placeholder="Nazwa kuponu *" />
                      <Input className="h-8 text-xs" value={builder.stake} onChange={(e) => setBuilder({ stake: e.target.value })} placeholder="Stake (opcjonalnie)" inputMode="decimal" />
                      <Button type="button" size="sm" variant="outline" className="h-8 text-[10px]" onClick={autoName} title="Wygeneruj nazwę ze składowych">
                        Auto name ✨
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 px-2">
                        <Checkbox id="qcPremium" checked={builder.isPremium} onCheckedChange={(c) => setBuilder({ isPremium: c === true })} />
                        <Label htmlFor="qcPremium" className="text-xs font-bold cursor-pointer flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-yellow-500" /> Premium
                        </Label>
                      </div>
                      <div className="text-right text-xs font-bold text-blue-300">
                        @{calculateTotalOdds(builder.matches).toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">({builder.matches.length} legs)</span>
                      </div>
                    </div>

                    {/* Match add form */}
                    <div className="border border-border/40 rounded-lg p-3 space-y-2 bg-background/40">
                      <p className="text-[9px] uppercase text-muted-foreground font-bold">Dodaj mecz do kuponu</p>
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
                        <Button size="sm" variant="outline" className={`h-8 gap-1.5 ${editingLegIndex !== null ? "border-amber-500/50 text-amber-300 hover:bg-amber-500/10" : "border-blue-500/40 text-blue-300 hover:bg-blue-500/10"}`} onClick={handleAddCouponMatch}>
                          {editingLegIndex !== null ? <><Pencil className="w-3.5 h-3.5" /> Update leg</> : <><PlusCircle className="w-3.5 h-3.5" /> Add leg</>}
                        </Button>
                        {editingLegIndex !== null && (
                          <Button size="sm" variant="ghost" className="h-8 text-[10px]" onClick={() => { setEditingLegIndex(null); setMatchForm(emptyMatchForm()); }}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Legs list */}
                    {builder.matches.length > 0 && (
                      <div className="space-y-1.5">
                        {builder.matches.map((m, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              editingLegIndex === i
                                ? "bg-amber-500/10 border border-amber-500/40"
                                : "bg-blue-500/5 border border-blue-500/15 hover:bg-blue-500/10"
                            }`}
                            onClick={() => editLeg(i)}
                            title="Kliknij, aby edytować tę nogę"
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-loss"
                              onClick={(e) => { e.stopPropagation(); removeLeg(i); }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white" onClick={handleSaveCoupon} disabled={savingCoupon}>
                      {savingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hourglass className="w-3.5 h-3.5" />}
                      {editingQueuedCouponId !== null ? "Save changes" : "Add coupon to Queue"}
                    </Button>
                  </div>

                  {/* Queued coupons list */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {queuedCoupons.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Brak kuponów w kolejce.</p>}
                    {queuedCoupons.map((coupon) => (
                      <div key={coupon.id} className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl hover:bg-blue-500/10 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <Receipt className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{coupon.name} <span className="text-[10px] text-muted-foreground">({coupon.matches.length} legs · @{coupon.totalOdds.toFixed(2)})</span></p>
                            <p className="text-[10px] text-muted-foreground truncate">{coupon.matches.map((m) => m.homeTeam).join(" · ")}</p>
                          </div>
                          {coupon.isPremium && <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => editQueuedCoupon(coupon)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" title="Publish now" onClick={() => withBusy(`cpn-${coupon.id}`, async () => {
                            if (!(await publishCouponById(coupon.id))) throw new Error("publish failed");
                            toast({ title: "Coupon published ✅" });
                            await reload();
                            onSaved?.();
                          })}>{busyIcon(`cpn-${coupon.id}`) || <Send className="w-3 h-3" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete" onClick={() => { if (window.confirm("Usunąć kupon z kolejki?")) withBusy(`cdc-${coupon.id}`, async () => {
                            await deleteCoupon(coupon.id);
                            if (editingQueuedCouponId === coupon.id) { setEditingQueuedCouponId(null); setBuilder({ name: "", stake: "", isPremium: true, matches: [] }); }
                            await reload();
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
                  {/* Form */}
                  <div className={`p-4 bg-muted/10 border rounded-xl space-y-3 ${editingHeroId !== null ? "border-amber-500/50" : "border-border/40"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold font-display uppercase tracking-wider">
                        {editingHeroId !== null ? "Edit queued hero" : "Nowy hero pick do kolejki"}
                      </p>
                      {editingHeroId !== null && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => { setEditingHeroId(null); resetHeroForm(); }}>
                          <X className="w-3 h-3" /> Cancel
                        </Button>
                      )}
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
                        <Input className="h-8 text-xs" value={heroForm.league} onChange={(e) => setHeroForm({ ...heroForm, league: e.target.value })} placeholder="Ekstraklasa" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Kickoff *</Label>
                        <Input type="datetime-local" className="h-8 text-xs" value={heroForm.kickoff} onChange={(e) => setHeroForm({ ...heroForm, kickoff: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Odds</Label>
                        <Input className="h-8 text-xs" value={heroForm.odds} onChange={(e) => setHeroForm({ ...heroForm, odds: e.target.value })} placeholder="1.85" inputMode="decimal" />
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
                      <div className="flex items-end pb-1">
                        <Checkbox id="qtHeroPremium" checked={heroForm.isPremium} onCheckedChange={(c) => setHeroForm({ ...heroForm, isPremium: c === true })} />
                        <Label htmlFor="qtHeroPremium" className="text-xs font-bold cursor-pointer flex items-center gap-1.5 ml-2">
                          <Crown className="w-3.5 h-3.5 text-yellow-500" /> Premium
                        </Label>
                      </div>
                    </div>
                    <Textarea className="min-h-[70px] text-xs" value={heroForm.description} onChange={(e) => setHeroForm({ ...heroForm, description: e.target.value })} placeholder="Hero analysis (optional)" />
                    <Button size="sm" className="h-8 gap-1.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white" onClick={handleSaveHero} disabled={savingHero}>
                      {savingHero ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hourglass className="w-3.5 h-3.5" />}
                      {editingHeroId !== null ? "Save changes" : "Add hero to Queue"}
                    </Button>
                  </div>

                  {/* Queued heroes */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {queuedHeroes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Brak hero w kolejce.</p>}
                    {queuedHeroes.map((pick) => (
                      <div key={pick.id} className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl hover:bg-amber-500/10 group">
                        <div className="flex items-center gap-2 min-w-0">
                          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{pick.homeTeam} vs {pick.awayTeam} <span className="text-[10px] text-muted-foreground">@{pick.odds}</span></p>
                            <p className="text-[10px] text-muted-foreground truncate">{pick.prediction} · {fmtKickoff(pick.kickoff)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => editQueuedHero(pick)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-emerald-500" title="Publish now (zastępuje aktualny hero)" onClick={() => withBusy(`hero-${pick.id}`, async () => {
                            const ok = await publishFeaturedPickById(pick.id!);
                            if (!ok) throw new Error("Nie udało się opublikować — upewnij się, że jesteś zalogowany kontem admina.");
                            toast({ title: "Hero published ⚡", description: "Zastąpił aktualny hero." });
                            await reload();
                            onSaved?.();
                          })}>{busyIcon(`hero-${pick.id}`) || <Send className="w-3 h-3" />}</Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss" title="Delete" onClick={() => { if (window.confirm("Usunąć hero z kolejki?")) withBusy(`cdh-${pick.id}`, async () => {
                            const ok = await deleteQueuedFeaturedPick(pick.id!);
                            if (!ok) throw new Error("Nie udało się usunąć — upewnij się, że jesteś zalogowany kontem admina.");
                            if (editingHeroId === pick.id) { setEditingHeroId(null); resetHeroForm(); }
                            toast({ title: "Hero usunięty z kolejki 🗑️" });
                            await reload();
                          }); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueTab;
