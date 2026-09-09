import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { addTip, loadTips, deleteTip, updateTip, loadDraftTips, publishAllDrafts, publishTipById, unpublishTipById, loadQueuedTips, unqueueTipById } from "@/lib/tipsStorage";
import { addCoupon, loadCoupons, deleteCoupon, updateCoupon, calculateTotalOdds, loadQueuedCoupons, publishCouponById, CouponMatch, Coupon } from "@/lib/couponStorage";
import { loadFeaturedPick, saveFeaturedPick, deleteQueuedFeaturedPick, publishFeaturedPickById, loadQueuedFeaturedPicks, QueuedFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { fetchTeamLogoCandidates, LogoCandidate, saveCustomTeamLogo } from "@/lib/logoFetcher";
import QueueTab, { QueueBuilderState } from "@/components/admin/QueueTab";
import LiveTab from "@/components/admin/LiveTab";
import { Tip } from "@/components/TipCard";
import { Trash2, ArrowLeft, Crown, Receipt, X, Zap, Pencil, Save, Users, Bell, Search, RefreshCw, PlusCircle, Loader2, Sparkles, ClipboardPaste, List, Send, Clock, EyeOff, Upload, Download, History, Hourglass, Globe, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import SportyTraderImport from "@/components/SportyTraderImport";
import ZawodTyperImport from "@/components/ZawodTyperImport";
import { ScrapedMatch, ImportTarget } from "@/lib/sportyTrader";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const { toast } = useToast();
  const [tips, setTips] = useState<Tip[]>([]);
  const [draftTips, setDraftTips] = useState<Tip[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [queuedForRelease, setQueuedForRelease] = useState(false);
  const [waitingRoom, setWaitingRoom] = useState<Tip[]>([]);
  const [queuedCoupons, setQueuedCoupons] = useState<Coupon[]>([]);
  const [queuedHeroPicks, setQueuedHeroPicks] = useState<QueuedFeaturedPick[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [featured, setFeatured] = useState<FeaturedPick>({
    league: "", kickoff: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", confidence: "High", status: "upcoming", homeTeamLogo: null, awayTeamLogo: null, sport: "Football"
  });

  useEffect(() => {
    refreshData();
    // Wygasłe tipy (8h po kickoff/won_at) mają znikać same także w otwartej
    // zakładce Published Tips — purge+reload co 60 s.
    const interval = setInterval(() => refreshData(false), 60_000);
    return () => clearInterval(interval);
  }, []);

  const refreshData = async (forceRefresh: boolean = false) => {
    console.log('🔄 Refreshing data (force:', forceRefresh, ')');
    const loadedTips = await loadTips(true, forceRefresh);
    const loadedDrafts = await loadDraftTips();
    const loadedQueued = await loadQueuedTips();
    const loadedCoupons = await loadCoupons();
    const loadedQueuedCoupons = await loadQueuedCoupons();
    const loadedFeatured = await loadFeaturedPick();
    const loadedQueuedHero = await loadQueuedFeaturedPicks();

    setTips(loadedTips);
    setDraftTips(loadedDrafts);
    setWaitingRoom(loadedQueued);
    setCoupons(loadedCoupons);
    setQueuedCoupons(loadedQueuedCoupons);
    setQueuedHeroPicks(loadedQueuedHero);
    if (loadedFeatured) {
      setFeatured(loadedFeatured);
    }
  };

  /** Ręczna publikacja poczekalni + jedno powiadomienie "są nowe typy". */
  const handleReleaseWaitingRoom = async () => {
    setIsReleasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("settle-results", {
        body: { action: "release" },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const released = typeof data?.released === "number" ? data.released : 0;
      const pushed = typeof data?.push?.success === "number" ? data.push.success : 0;
      toast({
        title: released > 0 ? `Released ${released} tips! 🚀` : "Waiting room is empty",
        description: released > 0 ? `Push notification sent to ${pushed} devices.` : undefined,
      });
      await refreshData(true);
    } catch (error: any) {
      toast({ title: "Release failed", description: error.message, variant: "destructive" });
    } finally {
      setIsReleasing(false);
    }
  };

  /** Publikacja pojedynczego elementu kolejki (bez czekania na 3:00). */
  const handlePublishQueuedItem = async (kind: "tip" | "coupon" | "hero", id: number) => {
    try {
      if (kind === "tip") {
        const ok = await publishTipById(id);
        if (!ok) throw new Error("publish failed");
      } else if (kind === "coupon") {
        const ok = await publishCouponById(id);
        if (!ok) throw new Error("publish failed");
      } else {
        const ok = await publishFeaturedPickById(id);
        if (!ok) throw new Error("publish failed");
      }
      toast({ title: "Published now ✅" });
      await refreshData(true);
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSelectCouponMatch = (match: any) => {
    setCouponMatchForm((prev) => ({
      ...prev,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      kickoff: `${match.date} ${match.time}`,
      homeTeamLogo: match.homeLogo,
      awayTeamLogo: match.awayLogo
    }));
    toast({ title: `Coupon match loaded: ${match.homeTeam} vs ${match.awayTeam}` });
  };

  // Route a scraped match: everything is ONE-CLICK and stays on the Import tab.
  const handleSportyImport = async (match: ScrapedMatch, analysis: string, target: ImportTarget) => {
    const oddsVal = Number(match.odds) || 0;
    let kickoffISO = match.kickoff;
    try {
      if (typeof match.kickoff === 'string' && match.kickoff.includes('-') && match.kickoff.includes(':')) {
        const d = new Date(match.kickoff.replace(' ', 'T'));
        if (!isNaN(d.getTime())) kickoffISO = d.toISOString();
      }
    } catch { /* ignore */ }

    const baseTip = {
      sport: match.sport || "Football",
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      prediction: match.prediction,
      odds: oddsVal,
      kickoff: kickoffISO,
      status: "upcoming" as const,
      isPremium: true,
      homeTeamLogo: match.homeTeamLogo,
      awayTeamLogo: match.awayTeamLogo,
      description: analysis,
    };

    if (target === "queue") {
      // One-click: prosto do poczekalni (live o 3:00). Zostajemy na Import.
      try {
        const created = await addTip({ ...baseTip, isPublished: false, queued: true });
        if (!created) throw new Error("Nie udało się zapisać tipa");
        toast({ title: "Queued ⏳", description: `${match.homeTeam} vs ${match.awayTeam} — live at 3:00 (edycja w Queue)` });
      } catch (e: any) {
        toast({ title: "Queue save failed", description: e.message, variant: "destructive" });
      }
    } else if (target === "publish") {
      // One-click: publikacja natychmiastowa (dla meczów startujących zaraz).
      try {
        const created = await addTip({ ...baseTip, isPublished: true });
        if (!created) throw new Error("Nie udało się zapisać tipa");
        toast({ title: "Published ✅", description: `${match.homeTeam} vs ${match.awayTeam} — widoczny od razu` });
      } catch (e: any) {
        toast({ title: "Publish failed", description: e.message, variant: "destructive" });
      }
    } else if (target === "hero") {
      // One-click: prosto do kolejki hero (nie wypiera aktywnego hero).
      try {
        await saveFeaturedPick({
          sport: match.sport || "Football",
          league: match.league,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          prediction: match.prediction,
          odds: String(oddsVal),
          kickoff: kickoffISO,
          description: analysis,
          confidence: "High",
          status: "upcoming",
          homeTeamLogo: match.homeTeamLogo,
          awayTeamLogo: match.awayTeamLogo,
          queued: true,
        });
        toast({ title: "Hero queued ⏳", description: `${match.homeTeam} vs ${match.awayTeam} — live at 3:00 (Release w Queue)` });
      } catch (e: any) {
        toast({ title: "Hero save failed", description: e.message, variant: "destructive" });
      }
    } else if (target === "coupon") {
      // Dopisz nogę do buildera kuponu w zakładce Queue (zostajemy na Import).
      setCouponMatches((prev) => [
        ...prev,
        {
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          prediction: match.prediction,
          odds: match.odds,
          league: match.league,
          sport: match.sport || "Football",
          kickoff: match.kickoff,
          homeTeamLogo: match.homeTeamLogo,
          awayTeamLogo: match.awayTeamLogo,
        },
      ]);
      toast({
        title: `Coupon leg added 🧾 (${couponMatches.length + 1})`,
        description: `${match.homeTeam} vs ${match.awayTeam} — finish in the Queue tab.`,
      });
    }
  };

  // User Premium Management State
  const [userEmail, setUserEmail] = useState("");
  const [premiumDays, setPremiumDays] = useState("30");
  const [isUpdatingPremium, setIsUpdatingPremium] = useState(false);

  // Push Notification State
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSendingPush, setIsSendingPush] = useState(false);

  // Admin Navigation State
  const [activeTab, setActiveTab] = useState("import");
  const [filterStatus, setFilterStatus] = useState("all");

  // Which scraper the Import tab shows. Both route through handleSportyImport.
  const [importSource, setImportSource] = useState<"sportytrader" | "zawodtyper">("sportytrader");
  const importSources = [
    { id: "sportytrader" as const, label: "SportyTrader" },
    { id: "zawodtyper" as const, label: "ZawodTyper" },
  ];

  const adminTabs = [
    { id: "import", label: "Import", icon: Download },
    { id: "queue", label: "Queue", icon: History },
    { id: "live", label: "Live", icon: Globe },
    { id: "premium", label: "Premium", icon: Users },
  ];

  const filteredTips = tips.filter(tip => filterStatus === "all" ? true : tip.status === filterStatus);

  const sendPremiumPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast({ title: "Please enter title and message", variant: "destructive" });
      return;
    }

    setIsSendingPush(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Twoja sesja wygasła. Wyloguj się i zaloguj ponownie.");
      }

      // Używamy bezpośredniego fetch zamiast supabase.functions.invoke
      // aby mieć pełną kontrolę nad nagłówkami i uniknąć błędów 401
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-premium-push`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ 
          title: pushTitle.trim(), 
          message: pushMessage.trim() 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Błąd serwera: ${response.status}`);
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      if (data.success === 0) {
        toast({
          title: "Push not sent",
          description: data.reason || "No eligible users found with active premium and push enabled.",
          variant: "default"
        });
      } else {
        toast({
          title: "Push Sent! 🚀",
          description: `Notification sent to ${data.success} premium users.`
        });
      }
      setPushTitle("");
      setPushMessage("");
    } catch (error: any) {
      toast({ 
        title: "Error sending push", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleGrantPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      toast({ title: "Please enter user email", variant: "destructive" });
      return;
    }

    setIsUpdatingPremium(true);
    try {
      const { data: userData, error: userError } = await (supabase as any)
        .from('profiles') 
        .select('id')
        .eq('email', userEmail.trim())
        .maybeSingle();

      if (userError || !userData) {
        toast({ 
          title: "User not found", 
          description: "Make sure the email is correct. The user must have logged in at least once.",
          variant: "destructive" 
        });
        setIsUpdatingPremium(false);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(premiumDays));

      const { error: updateError } = await (supabase as any)
        .from('premium_access')
        .upsert({
          user_id: userData.id,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      toast({ 
        title: "Premium Granted! 🎉", 
        description: `Added ${premiumDays} days for ${userEmail}` 
      });
      setUserEmail("");
    } catch (error: any) {
      toast({ 
        title: "Error granting premium", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsUpdatingPremium(false);
    }
  };

  // Tip form
  const [editingTipId, setEditingTipId] = useState<number | null>(null);

  // Coupon form state
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [couponName, setCouponName] = useState("");
  const [couponStake, setCouponStake] = useState("");
  const [couponIsPremium, setCouponIsPremium] = useState(false);
  const [couponStatus, setCouponStatus] = useState<Coupon["status"]>("active");
  const [couponSport, setCouponSport] = useState("Football");
  const [couponMatches, setCouponMatches] = useState<CouponMatch[]>([]);

  // Builder kuponu w zakładce Queue — mapowany na powyższe stany
  // (handleSportyImport dokłada nogi przez setCouponMatches).
  const queueBuilder: QueueBuilderState = {
    name: couponName,
    stake: couponStake,
    isPremium: couponIsPremium,
    matches: couponMatches,
  };
  const setQueueBuilder = (patch: Partial<QueueBuilderState>) => {
    if (patch.name !== undefined) setCouponName(patch.name);
    if (patch.stake !== undefined) setCouponStake(patch.stake);
    if (patch.isPremium !== undefined) setCouponIsPremium(patch.isPremium);
    if (patch.matches !== undefined) setCouponMatches(patch.matches);
  };


  const resetTipForm = () => {
    setEditingTipId(null);
    setQueuedForRelease(false);
    setForm({ sport: "Football", league: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", kickoff: "", status: "upcoming", isPremium: false, isPublished: true, description: "", homeTeamLogo: null, awayTeamLogo: null });
    setHomeLogoCandidates([]);
    setAwayLogoCandidates([]);
  };

  /** Wspólny szkielet pobierania kandydatów: progresywne wyniki + feedback. */
  const runLogoFetch = async (
    teamName: string | undefined,
    apply: (candidates: LogoCandidate[]) => void,
  ) => {
    if (!teamName || teamName.length < 3) {
      toast({ title: "Najpierw wpisz nazwę drużyny (min. 3 znaki)", variant: "destructive" });
      return;
    }
    apply([]); // wyczyść stare wyniki — spinner zamiast nich
    const candidates = await fetchTeamLogoCandidates(teamName, (partial) => {
      // Szybkie źródła (TheSportsDB/SofaScore/Wikipedia EN + fallbacki) pokazują
      // się od razu; wolne (Commons/Wikidata/multiLang) dopisują się po nich.
      if (partial.length) apply(partial);
    });
    apply(candidates);
    if (!candidates.length) {
      toast({
        title: `Brak wyników dla „${teamName}"`,
        description: "Żadne źródło nie znalazło tego logo. Wgraj własny plik (ikona obok lupy).",
        variant: "destructive",
      });
    }
  };

  const fetchHomeCandidates = async () => {
    setLoadingHomeLogos(true);
    try {
      await runLogoFetch(form.homeTeam, setHomeLogoCandidates);
    } finally {
      setLoadingHomeLogos(false);
    }
  };

  const fetchAwayCandidates = async () => {
    setLoadingAwayLogos(true);
    try {
      await runLogoFetch(form.awayTeam, setAwayLogoCandidates);
    } finally {
      setLoadingAwayLogos(false);
    }
  };

  const handleLogoUpload = (
    teamName: string,
    onSuccess: (url: string) => void,
    onRefresh?: () => void,
  ) => {
    if (!teamName || teamName.trim().length < 2) {
      toast({ title: "Najpierw wpisz nazwę drużyny", variant: "destructive" });
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Plik jest za duży (max 2MB)", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        saveCustomTeamLogo(teamName.trim(), dataUrl);
        onSuccess(dataUrl);
        if (onRefresh) onRefresh();
        toast({ title: `Logo "${teamName.trim()}" zapisane z dysku` });
      };
      reader.onerror = () => {
        toast({ title: "Błąd odczytu pliku", variant: "destructive" });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const fetchFeaturedHomeCandidates = async () => {
    setLoadingFeaturedHome(true);
    try {
      await runLogoFetch(featured.homeTeam, setFeaturedHomeCandidates);
    } finally {
      setLoadingFeaturedHome(false);
    }
  };

  const fetchFeaturedAwayCandidates = async () => {
    setLoadingFeaturedAway(true);
    try {
      await runLogoFetch(featured.awayTeam, setFeaturedAwayCandidates);
    } finally {
      setLoadingFeaturedAway(false);
    }
  };

  const fetchCouponHomeCandidates = async () => {
    setLoadingCouponHome(true);
    try {
      await runLogoFetch(couponMatchForm.homeTeam, setCouponHomeCandidates);
    } finally {
      setLoadingCouponHome(false);
    }
  };

  const fetchCouponAwayCandidates = async () => {
    setLoadingCouponAway(true);
    try {
      await runLogoFetch(couponMatchForm.awayTeam, setCouponAwayCandidates);
    } finally {
      setLoadingCouponAway(false);
    }
  };

  const resetCouponForm = () => {
    setEditingCouponId(null);
    setCouponName("");
    setCouponStake("");
    setCouponIsPremium(false);
    setCouponStatus("active");
    setCouponSport("Football");
    setCouponMatches([]);
    setEditingCouponMatchIndex(null);
    setCouponMatchForm({ homeTeam: "", awayTeam: "", prediction: "", odds: "", league: "", sport: "Football", kickoff: "", homeTeamLogo: null, awayTeamLogo: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.league || !form.homeTeam || !form.awayTeam || !form.prediction || !form.odds || !form.kickoff) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    // Convert date to ISO format for consistent storage
    let kickoffISO = form.kickoff;
    try {
      if (form.kickoff.includes('-') && form.kickoff.includes(':')) {
        const parsedDate = new Date(form.kickoff.replace(' ', 'T'));
        if (!isNaN(parsedDate.getTime())) {
          kickoffISO = parsedDate.toISOString();
        }
      }
    } catch (err) {
      console.error("Date parsing error:", err);
    }

    if (editingTipId !== null) {
      await updateTip({
        id: editingTipId,
        sport: form.sport,
        league: form.league,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        prediction: form.prediction,
        odds: parseFloat(form.odds),
        kickoff: kickoffISO,
        status: form.status,
        isPremium: form.isPremium,
        isPublished: queuedForRelease ? false : form.isPublished,
        queued: queuedForRelease,
        homeTeamLogo: form.homeTeamLogo,
        awayTeamLogo: form.awayTeamLogo,
        description: form.description,
      });
      await refreshData(true); // Force refresh after update
      resetTipForm();
      toast({
        title: queuedForRelease ? "Tip moved to Waiting Room ⏳" : "Tip updated! ✅",
      });
    } else {
      const created = await addTip({
        sport: form.sport,
        league: form.league,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        prediction: form.prediction,
        odds: parseFloat(form.odds),
        kickoff: kickoffISO,
        status: form.status,
        isPremium: form.isPremium,
        isPublished: queuedForRelease ? false : form.isPublished,
        queued: queuedForRelease,
        homeTeamLogo: form.homeTeamLogo,
        awayTeamLogo: form.awayTeamLogo,
        description: form.description,
      });

      await refreshData(true); // Force refresh after add
      resetTipForm();
      toast({
        title: queuedForRelease
          ? "Added to Waiting Room ⏳"
          : form.isPublished ? "Tip published! ✅" : "Tip saved as draft 📝",
        description: queuedForRelease ? "Will go live automatically at 3:00 with one push." : undefined,
      });
    }
  };

  const handleEditTip = (tip: Tip) => {
    setEditingTipId(tip.id);
    setQueuedForRelease(tip.queued === true);
    setForm({
      sport: tip.sport,
      league: tip.league,
      homeTeam: tip.homeTeam,
      awayTeam: tip.awayTeam,
      prediction: tip.prediction,
      odds: tip.odds.toString(),
      kickoff: tip.kickoff,
      status: tip.status,
      isPremium: tip.isPremium || false,
      isPublished: tip.isPublished ?? true,
      description: tip.description || "",
      homeTeamLogo: tip.homeTeamLogo || null,
      awayTeamLogo: tip.awayTeamLogo || null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    await deleteTip(id);
    await refreshData(true); // Force refresh after delete
    toast({ title: "Tip removed" });
  };

  const handleSettleYesterday = async () => {
    setIsSettling(true);
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
      const coupons = data?.coupons || {};
      if (typeof coupons.settled === "number" && coupons.settled > 0) {
        parts.push(`coupons: ${coupons.settled}`);
      }
      toast({
        title: parts.length ? `Settled: ${parts.join(" / ")}` : "Nothing to settle",
        description: `Date (Warsaw): ${data?.date || "yesterday"}`,
      });
    } catch (error: any) {
      toast({ title: "Settlement failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSettling(false);
    }
  };

  const handlePublishAllDrafts = async () => {
    setIsPublishing(true);
    try {
      const count = await publishAllDrafts();
      toast({ title: `Published ${count} drafts! 🚀` });
      await refreshData(true); // Force refresh after publish all
    } catch (error: any) {
      toast({ title: "Error publishing", description: error.message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishTip = async (id: number) => {
    try {
      await publishTipById(id);
      // Powiadomienie premium dopiero przy publikacji (typ z importu jest najpierw szkicem).
      const publishedTip = draftTips.find((t) => t.id === id);
      if (publishedTip?.isPremium) {
        // Push o nowych typach idzie JEDEN, zbiorczo — o 3:00 (release poczekalni)
        // albo przy ręcznym "Release now". Bez pusha przy pojedynczej publikacji.
      }
      toast({ title: "Tip published! ✅" });
      await refreshData(true); // Force refresh after publish
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUnpublishTip = async (id: number) => {
    try {
      await unpublishTipById(id);
      toast({ title: "Tip unpublished 📝" });
      await refreshData(true); // Force refresh after unpublish
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddCouponMatch = async () => {
    const { homeTeam, awayTeam, prediction, odds, league, sport, kickoff, homeTeamLogo, awayTeamLogo } = couponMatchForm;
    if (!homeTeam || !awayTeam || !prediction || !odds) {
      toast({ title: "Fill match fields", variant: "destructive" });
      return;
    }

    const matchData = {
      homeTeam, awayTeam, prediction,
      odds: parseFloat(odds),
      league, sport, kickoff,
      homeTeamLogo,
      awayTeamLogo,
    };

    if (editingCouponMatchIndex !== null) {
      const updatedMatches = [...couponMatches];
      updatedMatches[editingCouponMatchIndex] = matchData;
      setCouponMatches(updatedMatches);
      setEditingCouponMatchIndex(null);
      toast({ title: "Match updated! ✅" });
    } else {
      setCouponMatches([...couponMatches, matchData]);
      toast({ title: "Match added to coupon ✅" });
    }

    setCouponMatchForm({ homeTeam: "", awayTeam: "", prediction: "", odds: "", league: "", sport: "Football", kickoff: "", homeTeamLogo: null, awayTeamLogo: null });
  };

  const handleRemoveCouponMatch = (index: number) => {
    setCouponMatches(couponMatches.filter((_, i) => i !== index));
  };

  const handleSaveCoupon = async (asQueued: boolean = false) => {
    if (!couponName || couponMatches.length < 2) {
      toast({ title: "Name and at least 2 matches required", variant: "destructive" });
      return;
    }

    if (editingCouponId !== null) {
      await updateCoupon({
        id: editingCouponId,
        name: couponName,
        matches: couponMatches,
        totalOdds: calculateTotalOdds(couponMatches),
        stake: couponStake ? parseFloat(couponStake) : undefined,
        status: couponStatus,
        isPremium: couponIsPremium,
        createdAt: coupons.find(c => c.id === editingCouponId)?.createdAt || new Date().toISOString(),
        queued: asQueued,
      });
      await refreshData(true); // Force refresh after coupon update
      resetCouponForm();
      toast({ title: asQueued ? "Coupon moved to Queue ⏳" : "Coupon updated! 🎫" });
    } else {
      await addCoupon({
        name: couponName,
        matches: couponMatches,
        stake: couponStake ? parseFloat(couponStake) : undefined,
        status: "active",
        isPremium: couponIsPremium,
        queued: asQueued,
      });

      // Push o nowych typach idzie JEDEN, zbiorczo — o 3:00 (release poczekalni).

      await refreshData(true); // Force refresh after coupon add
      resetCouponForm();
      toast({
        title: asQueued ? "Coupon added to Queue ⏳" : "Coupon created! 🎫",
        description: asQueued ? "Will go live automatically at 3:00 with one push." : undefined,
      });
    }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setCouponName(coupon.name);
    setCouponStake(coupon.stake?.toString() || "");
    setCouponIsPremium(coupon.isPremium || false);
    setCouponStatus(coupon.status);
    setCouponSport(coupon.sport || "Football");
    setCouponMatches([...coupon.matches]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCoupon = async (id: number) => {
    await deleteCoupon(id);
    await refreshData(true); // Force refresh after coupon delete
    toast({ title: "Coupon removed" });
  };

  const handleClearLogoCache = async () => {
    if (!window.confirm("Are you sure you want to clear ALL cached team logos? They will be re-fetched on next load.")) return;
    
    try {
      const { error } = await supabase
        .from('team_logos_cache')
        .delete()
        .neq('team_name', 'FORCE_DELETE_ALL_WORKAROUND'); // Delete all rows

      if (error) throw error;
      
      toast({ title: "Logo cache cleared! 🧹", description: "Logos will be re-fetched when needed." });
      refreshData();
    } catch (err: any) {
      toast({ title: "Error clearing cache", description: err.message, variant: "destructive" });
    }
  };

  const [aiText, setAiText] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const handleAiImport = async (target: 'tip' | 'hero' | 'coupon') => {
    if (!aiText.trim()) {
      toast({ title: "Paste text first", variant: "destructive" });
      return;
    }

    setIsAiProcessing(true);
    try {
      const text = aiText.trim();
      
      const leagueInParentheses = text.match(/^\(([^)]+)\)/);
      const matchPattern = /Match:\s*(.+?)\s+vs\s+([^(]+?)(?=\s*(?:Betting Tip|Odds|Date|$))/i;
      const dateTimePattern = /(?:Date\s*&\s*Time:|Czas:|Kickoff:)\s*(\d{2}\.\d{2}\.\d{4}),?\s*(\d{2}:\d{2})/i;
      const tipPattern = /Betting Tip:\s*(.+?)(?=\s*Odds:)/i;
      const oddsPattern = /Odds:\s*(\d+[.,]?\d*)/i;
      const analysisPattern = /Analysis:\s*([\s\S]+)/i;

      const matchMatch = text.match(matchPattern);
      const dateTimeMatch = text.match(dateTimePattern);
      const tipMatch = text.match(tipPattern);
      const oddsMatch = text.match(oddsPattern);
      const analysisMatch = text.match(analysisPattern);

      if (!matchMatch) throw new Error("Could not find Match (Home vs Away)");

      let homeTeam = matchMatch[1].trim();
      let awayTeam = matchMatch[2].trim();

      let league = "";
      if (leagueInParentheses) {
        league = leagueInParentheses[1].trim();
      }

      let formattedDate = "";
      if (dateTimeMatch) {
        const [_, dmy, time] = dateTimeMatch;
        const [day, month, year] = dmy.split('.');
        formattedDate = `${year}-${month}-${day} ${time}`;
      }

      const parsedData = {
        league: league,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        kickoff: formattedDate,
        prediction: tipMatch ? tipMatch[1].trim() : "",
        odds: oddsMatch ? oddsMatch[1].trim().replace(',', '.') : "",
        description: analysisMatch ? analysisMatch[1].trim() : "",
      };

      if (target === 'tip') {
        setForm(prev => ({ ...prev, ...parsedData }));
        toast({ title: "Tip Form Filled! ✨" });
      } else if (target === 'hero') {
        setFeatured(prev => ({ 
          ...prev, 
          homeTeam: parsedData.homeTeam,
          awayTeam: parsedData.awayTeam,
          league: parsedData.league,
          kickoff: parsedData.kickoff,
          prediction: parsedData.prediction,
          odds: parsedData.odds,
          description: parsedData.description,
          confidence: "High",
          status: "upcoming"
        }));
        toast({ title: "Hero Section Filled! 🔥" });
      } else if (target === 'coupon') {
        setCouponMatchForm({
          homeTeam: parsedData.homeTeam,
          awayTeam: parsedData.awayTeam,
          prediction: parsedData.prediction,
          odds: parsedData.odds,
          league: parsedData.league,
          sport: "Football",
          kickoff: parsedData.kickoff,
          homeTeamLogo: null,
          awayTeamLogo: null
        });
        toast({ title: "Coupon Form Filled! 🎫" });
      }

      setAiText("");
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Replace old state with simpler mobile-friendly form state
  const [form, setForm] = useState({
    sport: "Football",
    league: "",
    homeTeam: "",
    awayTeam: "",
    prediction: "",
    odds: "",
    kickoff: "",
    status: "upcoming" as Tip["status"],
    isPremium: false,
    isPublished: true,
    description: "",
    homeTeamLogo: null as string | null,
    awayTeamLogo: null as string | null,
  });

  const [homeLogoCandidates, setHomeLogoCandidates] = useState<LogoCandidate[]>([]);
  const [awayLogoCandidates, setAwayLogoCandidates] = useState<LogoCandidate[]>([]);
  const [loadingHomeLogos, setLoadingHomeLogos] = useState(false);
  const [loadingAwayLogos, setLoadingAwayLogos] = useState(false);

  const [featuredHomeCandidates, setFeaturedHomeCandidates] = useState<LogoCandidate[]>([]);
  const [featuredAwayCandidates, setFeaturedAwayCandidates] = useState<LogoCandidate[]>([]);
  const [loadingFeaturedHome, setLoadingFeaturedHome] = useState(false);
  const [loadingFeaturedAway, setLoadingFeaturedAway] = useState(false);

  const [couponHomeCandidates, setCouponHomeCandidates] = useState<LogoCandidate[]>([]);
  const [couponAwayCandidates, setCouponAwayCandidates] = useState<LogoCandidate[]>([]);
  const [loadingCouponHome, setLoadingCouponHome] = useState(false);
  const [loadingCouponAway, setLoadingCouponAway] = useState(false);

  const [couponMatchForm, setCouponMatchForm] = useState({
    homeTeam: "",
    awayTeam: "",
    prediction: "",
    odds: "",
    league: "",
    sport: "Football",
    kickoff: "",
    homeTeamLogo: null as string | null,
    awayTeamLogo: null as string | null,
  });

  const [editingCouponMatchIndex, setEditingCouponMatchIndex] = useState<number | null>(null);

  const handleEditCouponMatch = (index: number) => {
    const match = couponMatches[index];
    setCouponMatchForm({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      prediction: match.prediction,
      odds: match.odds.toString(),
      league: match.league,
      sport: match.sport,
      kickoff: match.kickoff,
      homeTeamLogo: match.homeTeamLogo || null,
      awayTeamLogo: match.awayTeamLogo || null,
    });
    setEditingCouponMatchIndex(index);
  };

  const handleCancelCouponMatchEdit = () => {
    setCouponMatchForm({ homeTeam: "", awayTeam: "", prediction: "", odds: "", league: "", sport: "Football", kickoff: "", homeTeamLogo: null, awayTeamLogo: null });
    setEditingCouponMatchIndex(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 relative overflow-hidden">
      {/* Synthwave glow effects */}
      <div className="fixed top-0 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />
      
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/80 via-[#150025]/80 to-[#0a0020]/80 border-b border-purple-500/20 shadow-xl shadow-black/30">
        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
            </Link>
            <Badge variant="confidence" className="font-display text-[10px] uppercase tracking-wider bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border-purple-500/30">Admin</Badge>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-purple-300/70 hover:text-pink-400 hover:bg-white/5 transition-all duration-200 rounded-full px-3 md:px-3.5 border border-transparent hover:border-pink-500/30">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ADMIN NAVIGATION TABS */}
        <div className="sticky top-[72px] z-40 bg-[#0a0015]/80 backdrop-blur-xl border border-purple-500/20 rounded-xl p-1 shadow-lg shadow-black/20">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-lg shadow-pink-500/30"
                    : "text-purple-300/70 hover:text-pink-300 hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* IMPORT TAB - fetch matches from a source, route to Tip / Hero / Coupon */}
        {activeTab === 'import' && (
          <Card className="bg-card border-accent/20 shadow-md overflow-hidden border">
            <CardContent className="p-3 sm:p-4 space-y-4">
              {/* Source switcher: both scrapers feed the same import pipeline */}
              <div className="flex items-center gap-1.5 bg-muted/30 border border-border/50 rounded-xl p-1 w-fit">
                {importSources.map((src) => (
                  <button
                    key={src.id}
                    onClick={() => setImportSource(src.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                      importSource === src.id
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>

              {importSource === "sportytrader" ? (
                <SportyTraderImport
                  onImport={handleSportyImport}
                  couponCount={couponMatches.length}
                  onGoToCoupon={() => setActiveTab("queue")}
                />
              ) : (
                <ZawodTyperImport
                  onImport={handleSportyImport}
                  couponCount={couponMatches.length}
                  onGoToCoupon={() => setActiveTab("queue")}
                />
              )}

              {/* Compact Coupon Preview — visible when building a coupon */}
              {couponMatches.length > 0 && (
                <div className="border border-blue-500/20 rounded-xl p-3 space-y-3 bg-blue-500/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-blue-400" />
                      <span className="font-display text-sm font-bold">Coupon Preview</span>
                      <Badge variant="outline" className="text-[9px]">{couponMatches.length} matches</Badge>
                    </div>
                    <span className="text-xs font-bold text-blue-400">
                      @ {calculateTotalOdds(couponMatches).toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                    {couponMatches.map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-muted/20 rounded-lg px-2.5 py-1.5 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo || undefined} size={14} />
                          <span className="font-semibold truncate">{m.homeTeam}</span>
                          <span className="text-muted-foreground">vs</span>
                          <span className="font-semibold truncate">{m.awayTeam}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-black text-blue-400">{m.odds.toFixed(2)}</span>
                          <button
                            onClick={() => setCouponMatches((prev) => prev.filter((_, j) => j !== i))}
                            className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick save coupon */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                    <Input
                      placeholder="Coupon name..."
                      value={couponName}
                      onChange={(e) => setCouponName(e.target.value)}
                      className="h-8 text-xs flex-1 bg-muted/20"
                    />
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-2 py-1 bg-accent/5 border border-accent/20 rounded-md">
                        <Checkbox id="couponPremiumImport" checked={couponIsPremium} onCheckedChange={(c) => setCouponIsPremium(c === true)} className="h-3.5 w-3.5" />
                        <Label htmlFor="couponPremiumImport" className="text-[9px] font-bold cursor-pointer">PRO</Label>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-[10px] bg-blue-600 hover:bg-blue-500"
                        onClick={() => handleSaveCoupon(false)}
                        disabled={!couponName || couponMatches.length < 2}
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-[10px] bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                        onClick={() => handleSaveCoupon(true)}
                        disabled={!couponName || couponMatches.length < 2}
                        title="Zapisz do kolejki (live o 3:00)"
                      >
                        <Hourglass className="w-3 h-3" />
                        Queue
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* QUEUE (3:00 waiting room) */}
        {activeTab === 'queue' && (
          <QueueTab
            onSaved={() => refreshData(false)}
            builder={queueBuilder}
            setBuilder={setQueueBuilder}
          />
        )}

        {/* LIVE CONTENT (podglad/edycja/usuwanie opublikowanych) */}
        {activeTab === 'live' && (
          <LiveTab onSaved={() => refreshData(false)} />
        )}




        {/* PREMIUM & PUSH */}
        {activeTab === 'premium' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent" /> Premium Access
                </h3>
                <form onSubmit={handleGrantPremium} className="space-y-3">
                  <Input className="h-9 text-xs" placeholder="User Email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                  <div className="flex gap-2">
                    <Select value={premiumDays} onValueChange={(v) => setPremiumDays(v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="365">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" disabled={isUpdatingPremium} className="h-9 text-[10px] flex-1 bg-accent">Grant</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <h3 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-accent" /> Send Push Notification
                </h3>
                <form onSubmit={sendPremiumPush} className="space-y-3">
                  <Input className="h-9 text-xs" placeholder="Title" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} />
                  <div className="flex gap-2">
                    <Input className="h-9 text-xs flex-1" placeholder="Message" value={pushMessage} onChange={(e) => setPushMessage(e.target.value)} />
                    <Button type="submit" disabled={isSendingPush} className="h-9 text-[10px] bg-accent">Send</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}


        {/* UTILITY BUTTONS */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[10px] border-orange-500/30 text-orange-500"
            onClick={handleClearLogoCache}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear Logos
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => refreshData()}>
            <RefreshCw className="w-3 h-3 mr-1" /> Sync
          </Button>
        </div>

      </main>
    </div>
  );
};

export default Admin;
