import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { addTip, loadTips, deleteTip, updateTip, loadDraftTips, publishAllDrafts, publishTipById, unpublishTipById } from "@/lib/tipsStorage";
import { addCoupon, loadCoupons, deleteCoupon, updateCoupon, calculateTotalOdds, CouponMatch, Coupon } from "@/lib/couponStorage";
import { loadFeaturedPick, saveFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { fetchTeamLogoUrl, fetchTeamLogoCandidates, LogoCandidate, saveCustomTeamLogo } from "@/lib/logoFetcher";
import { Tip } from "@/components/TipCard";
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Crown, 
  Receipt, 
  X, 
  Zap, 
  Pencil, 
  Save, 
  XCircle, 
  Users, 
  Bell,
  Search,
  Check,
  RefreshCw,
  LogOut,
  ChevronRight,
  Trophy,
  PlusCircle,
  LayoutDashboard,
  TrendingUp,
  Loader2,
  Sparkles,
  ClipboardPaste,
  List,
  Send,
  Clock,
  EyeOff,
  Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import UpcomingMatchesList from "@/components/UpcomingMatchesList";
import Logo from "@/components/Logo";
import { fetchMatchesByDate, fetchTeamForm } from "@/lib/sportApi";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const { toast } = useToast();
  const [tips, setTips] = useState<Tip[]>([]);
  const [draftTips, setDraftTips] = useState<Tip[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [featured, setFeatured] = useState<FeaturedPick>({
    league: "", kickoff: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", confidence: "High", status: "upcoming", homeTeamLogo: null, awayTeamLogo: null, sport: "Football"
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async (forceRefresh: boolean = false) => {
    console.log('🔄 Refreshing data (force:', forceRefresh, ')');
    const loadedTips = await loadTips(true, forceRefresh);
    const loadedDrafts = await loadDraftTips();
    const loadedCoupons = await loadCoupons();
    const loadedFeatured = await loadFeaturedPick();

    setTips(loadedTips);
    setDraftTips(loadedDrafts);
    setCoupons(loadedCoupons);
    if (loadedFeatured) {
      setFeatured(loadedFeatured);
    }
  };

  const handleSelectMatch = async (match: any) => {
    setForm((prev) => ({
      ...prev,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      kickoff: `${match.date} ${match.time}`,
      homeTeamLogo: match.homeLogo,
      awayTeamLogo: match.awayLogo
    }));
    toast({ title: `Match loaded: ${match.homeTeam} vs ${match.awayTeam}` });
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

  const handleSelectFeaturedMatch = async (match: any) => {
    setFeatured((prev) => ({
      ...prev,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      kickoff: `${match.date} ${match.time}`,
      homeTeamLogo: match.homeLogo,
      awayTeamLogo: match.awayLogo,
      sport: match.sport || "Football"
    }));
    toast({ title: `Featured match loaded: ${match.homeTeam} vs ${match.awayTeam}` });
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
  const [activeTab, setActiveTab] = useState("tips");
  const [filterStatus, setFilterStatus] = useState("all");

  const adminTabs = [
    { id: "tips", label: "Tips", icon: PlusCircle },
    { id: "coupons", label: "Coupons", icon: Receipt },
    { id: "hero", label: "Hero Pick", icon: Zap },
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


  const resetTipForm = () => {
    setEditingTipId(null);
    setForm({ sport: "Football", league: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", kickoff: "", status: "upcoming", isPremium: false, isPublished: true, description: "", homeTeamLogo: null, awayTeamLogo: null });
    setHomeLogoCandidates([]);
    setAwayLogoCandidates([]);
  };

  const fetchHomeCandidates = async () => {
    if (!form.homeTeam || form.homeTeam.length < 3) return;
    setLoadingHomeLogos(true);
    try {
      const candidates = await fetchTeamLogoCandidates(form.homeTeam);
      setHomeLogoCandidates(candidates);
    } catch {
      setHomeLogoCandidates([]);
    } finally {
      setLoadingHomeLogos(false);
    }
  };

  const fetchAwayCandidates = async () => {
    if (!form.awayTeam || form.awayTeam.length < 3) return;
    setLoadingAwayLogos(true);
    try {
      const candidates = await fetchTeamLogoCandidates(form.awayTeam);
      setAwayLogoCandidates(candidates);
    } catch {
      setAwayLogoCandidates([]);
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
    if (!featured.homeTeam || featured.homeTeam.length < 3) return;
    setLoadingFeaturedHome(true);
    try {
      const candidates = await fetchTeamLogoCandidates(featured.homeTeam);
      setFeaturedHomeCandidates(candidates);
    } catch {
      setFeaturedHomeCandidates([]);
    } finally {
      setLoadingFeaturedHome(false);
    }
  };

  const fetchFeaturedAwayCandidates = async () => {
    if (!featured.awayTeam || featured.awayTeam.length < 3) return;
    setLoadingFeaturedAway(true);
    try {
      const candidates = await fetchTeamLogoCandidates(featured.awayTeam);
      setFeaturedAwayCandidates(candidates);
    } catch {
      setFeaturedAwayCandidates([]);
    } finally {
      setLoadingFeaturedAway(false);
    }
  };

  const fetchCouponHomeCandidates = async () => {
    if (!couponMatchForm.homeTeam || couponMatchForm.homeTeam.length < 3) return;
    setLoadingCouponHome(true);
    try {
      const candidates = await fetchTeamLogoCandidates(couponMatchForm.homeTeam);
      setCouponHomeCandidates(candidates);
    } catch {
      setCouponHomeCandidates([]);
    } finally {
      setLoadingCouponHome(false);
    }
  };

  const fetchCouponAwayCandidates = async () => {
    if (!couponMatchForm.awayTeam || couponMatchForm.awayTeam.length < 3) return;
    setLoadingCouponAway(true);
    try {
      const candidates = await fetchTeamLogoCandidates(couponMatchForm.awayTeam);
      setCouponAwayCandidates(candidates);
    } catch {
      setCouponAwayCandidates([]);
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
        homeTeamLogo: form.homeTeamLogo,
        awayTeamLogo: form.awayTeamLogo,
        description: form.description,
      });
      await refreshData(true); // Force refresh after update
      resetTipForm();
      toast({ title: "Tip updated! ✅" });
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
        isPublished: form.isPublished,
        homeTeamLogo: form.homeTeamLogo,
        awayTeamLogo: form.awayTeamLogo,
        description: form.description,
      });
      
      if (created && form.isPremium) {
        try {
          await supabase.functions.invoke("send-premium-push", {
            body: { 
              title: "New Premium Tip! 🔥", 
              message: `${form.homeTeam} vs ${form.awayTeam} - ${form.prediction}` 
            }
          });
        } catch (pushError) {}
      }
      
      await refreshData(true); // Force refresh after add
      resetTipForm();
      toast({ title: form.isPublished ? "Tip published! ✅" : "Tip saved as draft 📝" });
    }
  };

  const handleEditTip = (tip: Tip) => {
    setEditingTipId(tip.id);
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

  const handleSaveCoupon = async () => {
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
      });
      await refreshData(true); // Force refresh after coupon update
      resetCouponForm();
      toast({ title: "Coupon updated! 🎫" });
    } else {
      const createdCoupon = await addCoupon({
        name: couponName,
        matches: couponMatches,
        stake: couponStake ? parseFloat(couponStake) : undefined,
        status: "active",
        isPremium: couponIsPremium,
      });

      if (createdCoupon && couponIsPremium) {
        try {
          await supabase.functions.invoke("send-premium-push", {
            body: {
              title: "New Premium Coupon! 🎫",
              message: `${couponName} with total odds ${calculateTotalOdds(couponMatches).toFixed(2)}`
            }
          });
        } catch (pushError) {}
      }

      await refreshData(true); // Force refresh after coupon add
      resetCouponForm();
      toast({ title: "Coupon created! 🎫" });
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

        {/* QUICK FIND & TIP FORM */}
        {activeTab === 'tips' && (
          <>
            {/* AI IMPORT - COMPACT */}
            <Card className="bg-card border-accent/20 shadow-md overflow-hidden border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h3 className="font-display text-xs font-bold">AI Import</h3>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Paste AI-generated tip..."
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    className="h-9 text-xs bg-muted/20"
                  />
                  <Button 
                    size="sm" 
                    className="h-9 px-3 gap-1.5 bg-accent hover:bg-accent/90"
                    onClick={() => handleAiImport('tip')}
                    disabled={isAiProcessing || !aiText.trim()}
                  >
                    {isAiProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardPaste className="w-3 h-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-primary/20 shadow-lg overflow-hidden border-2">
              <CardContent className="p-4 sm:p-6">
                <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Quick Match Finder
                </h2>
                <UpcomingMatchesList onSelectMatch={handleSelectMatch} />
                <p className="text-[10px] text-muted-foreground mt-3 italic">
                  * Select a match above to automatically fill the "Add New Tip" form below.
                </p>
              </CardContent>
            </Card>

            {/* ADD / EDIT TIP - RE-LAYOUT FOR MOBILE */}
            <Card className={`bg-card border-border/50 ${editingTipId !== null ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                {editingTipId !== null ? <Pencil className="w-4 h-4 text-primary" /> : <PlusCircle className="w-4 h-4 text-primary" />}
                {editingTipId !== null ? "Edit Tip" : "Add New Tip"}
              </h2>
              {editingTipId !== null && (
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={resetTipForm}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sport</Label>
                  <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Football", "Basketball", "Tennis", "MMA", "Baseball", "Hockey", "Esports"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">League</Label>
                  <Input className="h-10 bg-muted/20" placeholder="e.g. La Liga" value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Home Team</Label>
                    <div className="relative">
                      <Input className="h-10 bg-muted/20 pr-28" value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {form.homeTeamLogo && <TeamLogo teamName={form.homeTeam} logoUrl={form.homeTeamLogo} size={20} />}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={fetchHomeCandidates}
                          disabled={loadingHomeLogos}
                          title="Wyszukaj logo w internecie"
                        >
                          {loadingHomeLogos ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Search className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={() => handleLogoUpload(form.homeTeam, (url) => setForm({ ...form, homeTeamLogo: url }), fetchHomeCandidates)}
                          title="Wgraj logo z dysku"
                        >
                          <Upload className="w-3 h-3" />
                        </Button>
                        {form.homeTeamLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-loss/70 hover:text-loss"
                            onClick={() => setForm({ ...form, homeTeamLogo: null })}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Away Team</Label>
                    <div className="relative">
                      <Input className="h-10 bg-muted/20 pr-28" value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {form.awayTeamLogo && <TeamLogo teamName={form.awayTeam} logoUrl={form.awayTeamLogo} size={20} />}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={fetchAwayCandidates}
                          disabled={loadingAwayLogos}
                          title="Wyszukaj logo w internecie"
                        >
                          {loadingAwayLogos ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Search className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={() => handleLogoUpload(form.awayTeam, (url) => setForm({ ...form, awayTeamLogo: url }), fetchAwayCandidates)}
                          title="Wgraj logo z dysku"
                        >
                          <Upload className="w-3 h-3" />
                        </Button>
                        {form.awayTeamLogo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-loss/70 hover:text-loss"
                            onClick={() => setForm({ ...form, awayTeamLogo: null })}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {homeLogoCandidates.length > 0 && (
                  <div className="p-3 bg-muted/30 border border-border/30 rounded-xl">
                    <Label className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2 block">
                      Home Team Logos — click to select
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {homeLogoCandidates.map((candidate, i) => (
                        <button
                          type="button"
                          key={`home-${i}`}
                          onClick={() => {
                            setForm({ ...form, homeTeamLogo: candidate.url });
                            setHomeLogoCandidates([]);
                          }}
                          className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center overflow-hidden transition-all ${
                            form.homeTeamLogo === candidate.url
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : "border-border/50 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
                          }`}
                          title={`${candidate.teamName} (${candidate.source})`}
                        >
                          <img src={candidate.url} alt="" className="w-10 h-10 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {awayLogoCandidates.length > 0 && (
                  <div className="p-3 bg-muted/30 border border-border/30 rounded-xl">
                    <Label className="text-[9px] uppercase tracking-wider text-muted-foreground mb-2 block">
                      Away Team Logos — click to select
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {awayLogoCandidates.map((candidate, i) => (
                        <button
                          type="button"
                          key={`away-${i}`}
                          onClick={() => {
                            setForm({ ...form, awayTeamLogo: candidate.url });
                            setAwayLogoCandidates([]);
                          }}
                          className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center overflow-hidden transition-all ${
                            form.awayTeamLogo === candidate.url
                              ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                              : "border-border/50 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
                          }`}
                          title={`${candidate.teamName} (${candidate.source})`}
                        >
                          <img src={candidate.url} alt="" className="w-10 h-10 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(homeLogoCandidates.length > 0 || awayLogoCandidates.length > 0) && (
                  <p className="text-[9px] text-muted-foreground text-center">
                    Kliknij logo aby je zaakceptować i zapisać do bazy danych
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Prediction</Label>
                  <Input className="h-10 bg-muted/20" placeholder="e.g. Home Win" value={form.prediction} onChange={(e) => setForm({ ...form, prediction: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Odds</Label>
                  <Input type="number" step="0.01" className="h-10 bg-muted/20" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Kickoff (YYYY-MM-DD HH:MM)</Label>
                  <Input className="h-10 bg-muted/20" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Tip["status"] })}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="won">Won ✓</SelectItem>
                      <SelectItem value="lost">Lost ✗</SelectItem>
                      <SelectItem value="draw">Draw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Analysis / Description</Label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  placeholder="Why this tip?" 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox id="isPremium" checked={form.isPremium} onCheckedChange={(c) => setForm({ ...form, isPremium: c === true })} />
                    <Label htmlFor="isPremium" className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <Crown className="w-3.5 h-3.5 text-accent" /> Premium
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="isDraft" checked={!form.isPublished} onCheckedChange={(c) => setForm({ ...form, isPublished: !(c === true) })} />
                    <Label htmlFor="isDraft" className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <Clock className="w-3.5 h-3.5 text-yellow-500" /> Save as Draft
                    </Label>
                  </div>
                </div>
                <Button type="submit" className="h-10 px-6 font-display uppercase tracking-widest text-[10px]">
                  {editingTipId !== null ? "Save Changes" : form.isPublished ? "Publish Tip" : "Save Draft"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
          </>
        )}

        {/* HERO SECTION */}
        {activeTab === 'hero' && (
          <>
            {/* AI IMPORT - COMPACT */}
            <Card className="bg-card border-accent/20 shadow-md overflow-hidden border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h3 className="font-display text-xs font-bold">AI Import</h3>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Paste AI-generated hero pick..."
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    className="h-9 text-xs bg-muted/20"
                  />
                  <Button 
                    size="sm" 
                    className="h-9 px-3 gap-1.5 bg-accent hover:bg-accent/90"
                    onClick={() => handleAiImport('hero')}
                    disabled={isAiProcessing || !aiText.trim()}
                  >
                    {isAiProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardPaste className="w-3 h-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-accent/30 shadow-accent/10 shadow-xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Featured Pick (Hero)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-4">
                <UpcomingMatchesList onSelectMatch={handleSelectFeaturedMatch} />
                <div className="space-y-3 p-4 bg-muted/10 rounded-xl border border-border/50">
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-muted-foreground">League</Label>
                    <Input className="h-9 text-xs" placeholder="e.g. UEFA Champions League" value={featured.league} onChange={(e) => setFeatured({ ...featured, league: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-muted-foreground">Sport</Label>
                    <Select value={featured.sport || "Football"} onValueChange={(v) => setFeatured({ ...featured, sport: v })}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Football", "Basketball", "Tennis", "MMA", "Baseball", "Hockey", "Esports"].map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-muted-foreground">Kickoff Time</Label>
                    <Input className="h-9 text-xs" placeholder="e.g. 21:00" value={featured.kickoff} onChange={(e) => setFeatured({ ...featured, kickoff: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 relative">
                      <Label className="text-[9px] uppercase text-muted-foreground">Home Team</Label>
                      <div className="relative">
                        <Input className="h-9 text-xs bg-muted/20 pr-28" placeholder="Home team" value={featured.homeTeam} onChange={(e) => setFeatured({ ...featured, homeTeam: e.target.value })} />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {featured.homeTeamLogo && <TeamLogo teamName={featured.homeTeam} logoUrl={featured.homeTeamLogo} size={18} />}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                            onClick={fetchFeaturedHomeCandidates}
                            disabled={loadingFeaturedHome}
                            title="Wyszukaj logo w internecie"
                          >
                            {loadingFeaturedHome ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Search className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                            onClick={() => handleLogoUpload(featured.homeTeam, (url) => setFeatured({ ...featured, homeTeamLogo: url }), fetchFeaturedHomeCandidates)}
                            title="Wgraj logo z dysku"
                          >
                            <Upload className="w-3 h-3" />
                          </Button>
                          {featured.homeTeamLogo && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[9px] text-loss/70 hover:text-loss"
                              onClick={() => setFeatured({ ...featured, homeTeamLogo: null })}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 relative">
                      <Label className="text-[9px] uppercase text-muted-foreground">Away Team</Label>
                      <div className="relative">
                        <Input className="h-9 text-xs bg-muted/20 pr-28" placeholder="Away team" value={featured.awayTeam} onChange={(e) => setFeatured({ ...featured, awayTeam: e.target.value })} />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {featured.awayTeamLogo && <TeamLogo teamName={featured.awayTeam} logoUrl={featured.awayTeamLogo} size={18} />}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                            onClick={fetchFeaturedAwayCandidates}
                            disabled={loadingFeaturedAway}
                            title="Wyszukaj logo w internecie"
                          >
                            {loadingFeaturedAway ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Search className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[9px] text-muted-foreground hover:text-primary"
                            onClick={() => handleLogoUpload(featured.awayTeam, (url) => setFeatured({ ...featured, awayTeamLogo: url }), fetchFeaturedAwayCandidates)}
                            title="Wgraj logo z dysku"
                          >
                            <Upload className="w-3 h-3" />
                          </Button>
                          {featured.awayTeamLogo && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[9px] text-loss/70 hover:text-loss"
                              onClick={() => setFeatured({ ...featured, awayTeamLogo: null })}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {featuredHomeCandidates.length > 0 && (
                    <div className="p-2 bg-muted/20 border border-border/30 rounded-lg">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Home Team Logos</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {featuredHomeCandidates.map((candidate, i) => (
                          <button
                            type="button"
                            key={`fh-${i}`}
                            onClick={() => {
                              setFeatured({ ...featured, homeTeamLogo: candidate.url });
                              setFeaturedHomeCandidates([]);
                            }}
                            className={`w-10 h-10 rounded-md border flex items-center justify-center overflow-hidden transition-all ${
                              featured.homeTeamLogo === candidate.url
                                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                : "border-border/50 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
                            }`}
                            title={`${candidate.teamName} (${candidate.source})`}
                          >
                            <img src={candidate.url} alt="" className="w-7 h-7 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {featuredAwayCandidates.length > 0 && (
                    <div className="p-2 bg-muted/20 border border-border/30 rounded-lg">
                      <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Away Team Logos</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {featuredAwayCandidates.map((candidate, i) => (
                          <button
                            type="button"
                            key={`fa-${i}`}
                            onClick={() => {
                              setFeatured({ ...featured, awayTeamLogo: candidate.url });
                              setFeaturedAwayCandidates([]);
                            }}
                            className={`w-10 h-10 rounded-md border flex items-center justify-center overflow-hidden transition-all ${
                              featured.awayTeamLogo === candidate.url
                                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                : "border-border/50 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
                            }`}
                            title={`${candidate.teamName} (${candidate.source})`}
                          >
                            <img src={candidate.url} alt="" className="w-7 h-7 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase text-muted-foreground">Confidence</Label>
                      <Select value={featured.confidence} onValueChange={(v) => setFeatured({ ...featured, confidence: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High 🔥</SelectItem>
                          <SelectItem value="Medium">Medium ⚡</SelectItem>
                          <SelectItem value="Low">Low 🎲</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase text-muted-foreground">Status</Label>
                      <Select value={featured.status || "upcoming"} onValueChange={(v: any) => setFeatured({ ...featured, status: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="won">Won ✓</SelectItem>
                          <SelectItem value="lost">Lost ✗</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] uppercase text-muted-foreground">Prediction & Odds</Label>
                    <div className="flex gap-2">
                      <Input className="h-9 text-xs flex-1" placeholder="Prediction" value={featured.prediction} onChange={(e) => setFeatured({ ...featured, prediction: e.target.value })} />
                      <Input className="h-9 text-xs w-20" placeholder="Odds" value={featured.odds} onChange={(e) => setFeatured({ ...featured, odds: e.target.value })} />
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2 h-10 font-display uppercase tracking-wider text-[10px] bg-accent hover:bg-accent/90"
                    onClick={async () => {
                      const { id, ...pickWithoutId } = featured;
                      await saveFeaturedPick(pickWithoutId);
                      await refreshData(true); // Force refresh after hero update
                      toast({ title: "Hero Pick Saved! ⚡" });
                    }}
                  >
                    Update Hero Section
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 rounded-xl border border-accent/20 h-full">
                  <Label className="text-[9px] uppercase text-accent font-bold">Hero Analysis</Label>
                  <textarea 
                    className="mt-2 w-full h-[calc(100%-30px)] min-h-[120px] bg-transparent border-none text-xs text-muted-foreground focus:ring-0 resize-none italic"
                    placeholder="Describe why this is the pick of the day..."
                    value={featured.description || ""}
                    onChange={(e) => setFeatured({ ...featured, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </>
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
                    <Select value={premiumDays} onValueChange={premiumDays}>
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

        {activeTab === 'tips' && (
          <div className="space-y-4">
            <Card className="bg-card border-border/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    <List className="w-5 h-5 text-primary" /> Published Tips ({tips.length})
                  </h2>
                  {draftTips.length > 0 && (
                    <Button 
                      size="sm" 
                      className="h-8 gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      onClick={handlePublishAllDrafts}
                      disabled={isPublishing}
                    >
                      {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Publish All ({draftTips.length})
                    </Button>
                  )}
                </div>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)} className="mb-4">
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredTips.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No published tips found.</p>}
                  {filteredTips.map((tip) => {
                    const status = tip.status === 'won' ? 'win' : tip.status === 'lost' ? 'lost' : 'default';
                    return (
                      <div key={tip.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl hover:bg-muted/40 group">
                        <div className="flex items-center gap-2">
                          <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={18} />
                          <span className="text-[9px] text-muted-foreground">vs</span>
                          <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={18} />
                          <div className="ml-2">
                            <p className="text-xs font-medium">{tip.homeTeam} vs {tip.awayTeam}</p>
                            <p className="text-[10px] text-muted-foreground">{tip.prediction} @ {tip.odds}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status}>{tip.status}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleEditTip(tip)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-loss opacity-0 group-hover:opacity-100" onClick={() => handleDelete(tip.id)}><Trash2 className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-yellow-500 opacity-0 group-hover:opacity-100" onClick={() => handleUnpublishTip(tip.id)} title="Move to drafts"><EyeOff className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {draftTips.length > 0 && (
              <Card className="bg-card border-yellow-500/30 shadow-md">
                <CardContent className="p-4 sm:p-6">
                  <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2 text-yellow-500">
                    <Clock className="w-5 h-5" /> Drafts ({draftTips.length})
                    <span className="text-[10px] font-normal text-muted-foreground ml-auto">Not visible on main screen</span>
                  </h2>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {draftTips.map((tip) => {
                      const status = tip.status === 'won' ? 'win' : tip.status === 'lost' ? 'lost' : 'default';
                      return (
                        <div key={tip.id} className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/10 group">
                          <div className="flex items-center gap-2">
                            <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo} size={18} />
                            <span className="text-[9px] text-muted-foreground">vs</span>
                            <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo} size={18} />
                            <div className="ml-2">
                              <p className="text-xs font-medium">{tip.homeTeam} vs {tip.awayTeam}</p>
                              <p className="text-[10px] text-muted-foreground">{tip.prediction} @ {tip.odds}</p>
                              <p className="text-[9px] text-yellow-600">{new Date(tip.kickoff).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={status}>{tip.status}</Badge>
                            <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">Draft</Badge>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleEditTip(tip)}><Pencil className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-loss opacity-0 group-hover:opacity-100" onClick={() => handleDelete(tip.id)}><Trash2 className="w-3 h-3" /></Button>
                            <Button 
                              size="sm" 
                              className="h-6 w-6 bg-green-500 hover:bg-green-600 text-white opacity-0 group-hover:opacity-100" 
                              onClick={() => handlePublishTip(tip.id)}
                              title="Publish now"
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* COUPONS SECTION */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* AI IMPORT - COMPACT */}
            <Card className="bg-card border-accent/20 shadow-md overflow-hidden border">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h3 className="font-display text-xs font-bold">AI Import</h3>
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Paste AI-generated coupon tips..."
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    className="h-9 text-xs bg-muted/20"
                  />
                  <Button 
                    size="sm" 
                    className="h-9 px-3 gap-1.5 bg-accent hover:bg-accent/90"
                    onClick={() => handleAiImport('coupon')}
                    disabled={isAiProcessing || !aiText.trim()}
                  >
                    {isAiProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardPaste className="w-3 h-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ADD / EDIT COUPON - RESTORED & MOBILE FRIENDLY */}
            <Card className={`bg-card border-border/50 ${editingCouponId ? 'ring-2 ring-accent' : ''}`}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold flex items-center gap-2">
                    {editingCouponId ? <Pencil className="w-4 h-4 text-accent" /> : <Receipt className="w-4 h-4 text-accent" />}
                    {editingCouponId ? "Edit Coupon" : "Create New Coupon"}
                  </h2>
                  {editingCouponId && (
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={resetCouponForm}>
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Coupon Name</Label>
                      <Input className="h-10 bg-muted/20" placeholder="e.g. Weekend Acca" value={couponName} onChange={(e) => setCouponName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Stake ($)</Label>
                      <Input type="number" step="0.01" className="h-10 bg-muted/20" placeholder="0.00" value={couponStake} onChange={(e) => setCouponStake(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sport</Label>
                      <Select value={couponSport} onValueChange={(v) => setCouponSport(v)}>
                        <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Football", "Basketball", "Tennis", "MMA", "Baseball", "Hockey", "Esports"].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
                      <Select value={couponStatus} onValueChange={(v) => setCouponStatus(v as Coupon["status"])}>
                        <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="won">Won ✓</SelectItem>
                          <SelectItem value="lost">Lost ✗</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl">
                    <Checkbox id="couponPremium" checked={couponIsPremium} onCheckedChange={(c) => setCouponIsPremium(c === true)} />
                    <Label htmlFor="couponPremium" className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <Crown className="w-3.5 h-3.5 text-accent" /> Premium Coupon
                    </Label>
                  </div>

                  {/* COUPON MATCHES LIST */}
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Matches ({couponMatches.length})</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {couponMatches.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4 italic">No matches added yet. Add matches below.</p>
                      )}
                      {couponMatches.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-background border border-border/50 rounded-lg p-2.5 group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo || undefined} size={16} />
                            <div className="truncate">
                              <p className="text-[10px] font-bold truncate">{m.homeTeam} vs {m.awayTeam}</p>
                              <p className="text-[9px] text-muted-foreground">{m.prediction} @ {m.odds.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditCouponMatch(i)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-7 h-7 text-loss hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveCouponMatch(i)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {couponMatches.length > 1 && (
                      <div className="flex items-center justify-between bg-accent/10 rounded-lg p-2">
                        <span className="text-[10px] uppercase tracking-wider text-accent font-bold">Total Odds:</span>
                        <span className="text-sm font-bold text-accent">
                          {couponMatches.reduce((acc, m) => acc * m.odds, 1).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ADD MATCH TO COUPON FORM */}
                  <div className="p-4 bg-muted/10 border border-border/50 rounded-xl space-y-3">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Add Match</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Home Team</Label>
                        <div className="relative">
                          <Input className="h-9 text-xs bg-muted/20 pr-24" value={couponMatchForm.homeTeam} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, homeTeam: e.target.value })} />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            {couponMatchForm.homeTeamLogo && <TeamLogo teamName={couponMatchForm.homeTeam} logoUrl={couponMatchForm.homeTeamLogo} size={14} />}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-[8px] text-muted-foreground hover:text-primary"
                              onClick={fetchCouponHomeCandidates}
                              disabled={loadingCouponHome}
                              title="Wyszukaj logo w internecie"
                            >
                              {loadingCouponHome ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Search className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-[8px] text-muted-foreground hover:text-primary"
                              onClick={() => handleLogoUpload(couponMatchForm.homeTeam, (url) => setCouponMatchForm({ ...couponMatchForm, homeTeamLogo: url }), fetchCouponHomeCandidates)}
                              title="Wgraj logo z dysku"
                            >
                              <Upload className="w-3 h-3" />
                            </Button>
                            {couponMatchForm.homeTeamLogo && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1 text-[8px] text-loss/70 hover:text-loss"
                                onClick={() => setCouponMatchForm({ ...couponMatchForm, homeTeamLogo: null })}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Away Team</Label>
                        <div className="relative">
                          <Input className="h-9 text-xs bg-muted/20 pr-24" value={couponMatchForm.awayTeam} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, awayTeam: e.target.value })} />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            {couponMatchForm.awayTeamLogo && <TeamLogo teamName={couponMatchForm.awayTeam} logoUrl={couponMatchForm.awayTeamLogo} size={14} />}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-[8px] text-muted-foreground hover:text-primary"
                              onClick={fetchCouponAwayCandidates}
                              disabled={loadingCouponAway}
                              title="Wyszukaj logo w internecie"
                            >
                              {loadingCouponAway ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Search className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1 text-[8px] text-muted-foreground hover:text-primary"
                              onClick={() => handleLogoUpload(couponMatchForm.awayTeam, (url) => setCouponMatchForm({ ...couponMatchForm, awayTeamLogo: url }), fetchCouponAwayCandidates)}
                              title="Wgraj logo z dysku"
                            >
                              <Upload className="w-3 h-3" />
                            </Button>
                            {couponMatchForm.awayTeamLogo && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1 text-[8px] text-loss/70 hover:text-loss"
                                onClick={() => setCouponMatchForm({ ...couponMatchForm, awayTeamLogo: null })}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Prediction</Label>
                        <Input className="h-9 text-xs bg-muted/20" value={couponMatchForm.prediction} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, prediction: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] uppercase text-muted-foreground">Odds</Label>
                        <Input type="number" step="0.01" className="h-9 text-xs bg-muted/20" value={couponMatchForm.odds} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, odds: e.target.value })} />
                      </div>
                    </div>
                    {couponHomeCandidates.length > 0 && (
                      <div className="p-2 bg-muted/20 border border-border/30 rounded-lg">
                        <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Home Team Logos</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {couponHomeCandidates.map((candidate, i) => (
                            <button
                              type="button"
                              key={`ch-${i}`}
                              onClick={() => {
                                setCouponMatchForm({ ...couponMatchForm, homeTeamLogo: candidate.url });
                                setCouponHomeCandidates([]);
                              }}
                              className={`w-9 h-9 rounded-md border flex items-center justify-center overflow-hidden transition-all ${
                                couponMatchForm.homeTeamLogo === candidate.url
                                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                  : "border-border/50 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
                              }`}
                              title={`${candidate.teamName} (${candidate.source})`}
                            >
                              <img src={candidate.url} alt="" className="w-6 h-6 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {couponAwayCandidates.length > 0 && (
                      <div className="p-2 bg-muted/20 border border-border/30 rounded-lg">
                        <Label className="text-[8px] uppercase text-muted-foreground mb-1 block">Away Team Logos</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {couponAwayCandidates.map((candidate, i) => (
                            <button
                              type="button"
                              key={`ca-${i}`}
                              onClick={() => {
                                setCouponMatchForm({ ...couponMatchForm, awayTeamLogo: candidate.url });
                                setCouponAwayCandidates([]);
                              }}
                              className={`w-9 h-9 rounded-md border flex items-center justify-center overflow-hidden transition-all ${
                                couponMatchForm.awayTeamLogo === candidate.url
                                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                                  : "border-border/50 bg-muted/50 hover:border-primary/50 hover:bg-primary/5"
                              }`}
                              title={`${candidate.teamName} (${candidate.source})`}
                            >
                              <img src={candidate.url} alt="" className="w-6 h-6 object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 h-9 text-[10px] uppercase tracking-wider" onClick={editingCouponMatchIndex !== null ? handleCancelCouponMatchEdit : handleAddCouponMatch}>
                        <X className="w-3.5 h-3.5" /> {editingCouponMatchIndex !== null ? "Cancel Edit" : "Add Match to Coupon"}
                      </Button>
                      {editingCouponMatchIndex !== null && (
                        <Button type="button" size="sm" className="w-full gap-1.5 h-9 text-[10px] uppercase tracking-wider bg-accent hover:bg-accent/90" onClick={handleAddCouponMatch}>
                          <Save className="w-3.5 h-3.5" /> Update Match
                        </Button>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    className="w-full h-11 font-display uppercase tracking-widest text-[10px] bg-accent hover:bg-accent/90"
                    onClick={handleSaveCoupon}
                  >
                    {editingCouponId ? "Save Coupon Changes" : "Save Coupon"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* COUPONS LIST */}
            <Card className="bg-card border-border/50">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-accent" />
                    Saved Coupons ({coupons.length})
                  </h2>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {coupons.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl hover:bg-muted/40 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                          <span className="text-lg font-bold text-accent">{c.matches.length}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {c.matches.length} picks • Odds: {c.matches.reduce((acc, m) => acc * m.odds, 1).toFixed(2)} • {c.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={c.status === 'won' ? 'win' : c.status === 'lost' ? 'lost' : 'default'} className="text-[9px]">{c.status}</Badge>
                        {c.isPremium && <Crown className="w-3.5 h-3.5 text-accent" />}
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEditCoupon(c)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-loss hover:text-loss opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteCoupon(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* UTILITY BUTTONS */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[10px] border-accent/30 text-accent"
            onClick={async () => {
              try {
                const date = new Date().toISOString().split('T')[0];
                toast({ title: "Testing SofaScore API..." });
                const results = await fetchMatchesByDate(date);
                console.log("Test results:", results);
                if (results.length > 0) {
                  toast({ title: "API OK! ✅", description: `Found ${results.length} fixtures.` });
                } else {
                  toast({ variant: "destructive", title: "API Error ❌", description: "No events found." });
                }
              } catch (e) {
                toast({ variant: "destructive", title: "Test Failed", description: String(e) });
              }
            }}
          >
            <Zap className="w-3 h-3 mr-1" /> Test API
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[10px] border-orange-500/30 text-orange-500"
            onClick={handleClearLogoCache}
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear Logos
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={refreshData}>
            <RefreshCw className="w-3 h-3 mr-1" /> Sync
          </Button>
        </div>

      </main>
    </div>
  );
};

export default Admin;
