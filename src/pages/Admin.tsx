import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { addTip, loadTips, deleteTip, updateTip } from "@/lib/tipsStorage";
import { addCoupon, loadCoupons, deleteCoupon, updateCoupon, calculateTotalOdds, CouponMatch, Coupon } from "@/lib/couponStorage";
import { loadFeaturedPick, saveFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { fetchTeamLogoUrl } from "@/lib/logoFetcher";
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
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import UpcomingMatchesList from "@/components/UpcomingMatchesList";
import Logo from "@/components/Logo";
import { fetchMatchesByDate, fetchTeamForm } from "@/lib/sportApi";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ClipboardPaste } from "lucide-react";

const Admin = () => {
  const { toast } = useToast();
  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [featured, setFeatured] = useState<FeaturedPick>({
    league: "", kickoff: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", confidence: "High", status: "upcoming"
  });

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const loadedTips = await loadTips();
    const loadedCoupons = await loadCoupons();
    const loadedFeatured = await loadFeaturedPick();
    
    setTips(loadedTips);
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
      awayTeamLogo: match.awayLogo
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
  const [couponMatches, setCouponMatches] = useState<CouponMatch[]>([]);


  const resetTipForm = () => {
    setEditingTipId(null);
    setForm({ sport: "Football", league: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", kickoff: "", status: "upcoming", isPremium: false, description: "", homeTeamLogo: null, awayTeamLogo: null, likesCount: 0 });
  };

  const resetCouponForm = () => {
    setEditingCouponId(null);
    setCouponName("");
    setCouponStake("");
    setCouponIsPremium(false);
    setCouponStatus("active");
    setCouponMatches([]);
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
        likesCount: form.likesCount,
      });
      await refreshData();
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
        homeTeamLogo: form.homeTeamLogo,
        awayTeamLogo: form.awayTeamLogo,
        description: form.description,
        likesCount: form.likesCount,
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
      
      await refreshData();
      resetTipForm();
      toast({ title: "Tip added! ✅" });
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
      description: tip.description || "",
      homeTeamLogo: tip.homeTeamLogo || null,
      awayTeamLogo: tip.awayTeamLogo || null,
      likesCount: tip.likesCount || 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    await deleteTip(id);
    await refreshData();
    toast({ title: "Tip removed" });
  };

  const handleAddCouponMatch = async () => {
    const { homeTeam, awayTeam, prediction, odds, league, sport, kickoff, homeTeamLogo, awayTeamLogo } = couponMatchForm;
    if (!homeTeam || !awayTeam || !prediction || !odds) {
      toast({ title: "Fill match fields", variant: "destructive" });
      return;
    }

    setCouponMatches([...couponMatches, {
      homeTeam, awayTeam, prediction,
      odds: parseFloat(odds),
      league, sport, kickoff,
      homeTeamLogo,
      awayTeamLogo,
    }]);
    setCouponMatchForm({ homeTeam: "", awayTeam: "", prediction: "", odds: "", league: "", sport: "Football", kickoff: "", homeTeamLogo: null, awayTeamLogo: null });
    toast({ title: "Match added to coupon ✅" });
  };

  const handleRemoveCouponMatch = (index: number) => {
    setCouponMatches(couponMatches.filter((_, i) => i !== index));
  };

  const handleCreateOrUpdateCoupon = async () => {
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
      await refreshData();
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

      await refreshData();
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
    setCouponMatches([...coupon.matches]);
  };

  const handleDeleteCoupon = async (id: number) => {
    await deleteCoupon(id);
    await refreshData();
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
      // Improved Regex patterns to handle the updated template
      const leaguePattern = /^(.+?)\s*(?:\(|$)/i; // Matches first line before any parenthesis or end of line
      const matchPattern = /Match:\s*(.+?)\svs\s*(.+)/i;
      const dateTimePattern = /Date & Time:\s*(\d{2}\.\d{2}\.\d{4}),\s*(\d{2}:\d{2})/i;
      const tipPattern = /Betting Tip:\s*(.+)/i;
      const oddsPattern = /Odds:\s*(\d+\.?\d*)/i;
      const analysisPattern = /Analysis:\s*([\s\S]+)/i;

      const lines = aiText.trim().split('\n');
      const leagueMatch = lines[0].match(leaguePattern);
      const matchMatch = aiText.match(matchPattern);
      const dateTimeMatch = aiText.match(dateTimePattern);
      const tipMatch = aiText.match(tipPattern);
      const oddsMatch = aiText.match(oddsPattern);
      const analysisMatch = aiText.match(analysisPattern);

      if (!matchMatch) throw new Error("Could not find Match (Home vs Away)");

      let formattedDate = "";
      if (dateTimeMatch) {
        const [_, dmy, time] = dateTimeMatch;
        const [day, month, year] = dmy.split('.');
        formattedDate = `${year}-${month}-${day} ${time}`;
      }

      const parsedData = {
        league: leagueMatch ? leagueMatch[1].trim() : "",
        homeTeam: matchMatch[1].trim(),
        awayTeam: matchMatch[2].trim(),
        kickoff: formattedDate,
        prediction: tipMatch ? tipMatch[1].trim() : "",
        odds: oddsMatch ? oddsMatch[1].trim() : "",
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
    description: "",
    homeTeamLogo: null as string | null,
    awayTeamLogo: null as string | null,
    likesCount: 0,
  });

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
            </Link>
            <Badge variant="confidence" className="font-display text-[10px] uppercase tracking-wider">Admin</Badge>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* SMART AI IMPORT - NEW SECTION */}
        <Card className="bg-card border-accent/20 shadow-lg overflow-hidden border-2 bg-gradient-to-br from-card to-accent/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                AI Smart Import
              </h2>
              <Badge variant="outline" className="text-[9px] border-accent/30 text-accent">TIME SAVER</Badge>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <textarea 
                  className="w-full min-h-[120px] rounded-xl border border-input bg-muted/20 px-4 py-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all"
                  placeholder="Paste AI-generated tip here... (Match, Date, Tip, Odds, Analysis)"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                />
                {aiText && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-2 h-7 w-7 p-0 rounded-full"
                    onClick={() => setAiText("")}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button 
                  onClick={() => handleAiImport('tip')}
                  disabled={isAiProcessing || !aiText.trim()}
                  className="gap-2 h-11 font-display uppercase tracking-widest text-[10px] bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20"
                >
                  {isAiProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPaste className="w-4 h-4" />}
                  Normal Tip
                </Button>
                <Button 
                  onClick={() => handleAiImport('hero')}
                  disabled={isAiProcessing || !aiText.trim()}
                  className="gap-2 h-11 font-display uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Hero Section
                </Button>
                <Button 
                  onClick={() => handleAiImport('coupon')}
                  disabled={isAiProcessing || !aiText.trim()}
                  className="gap-2 h-11 font-display uppercase tracking-widest text-[10px] bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Add to Coupon
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic">
                * Just paste the text from ChatGPT/Claude and click Import. The form below will be filled automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* QUICK FIND MATCH SECTION - MOBILE FIRST */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Likes Count 👍</Label>
                  <Input type="number" className="h-10 bg-muted/20" value={form.likesCount} onChange={(e) => setForm({ ...form, likesCount: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Home Team</Label>
                  <div className="relative">
                    <Input className="h-10 bg-muted/20" value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} />
                    {form.homeTeamLogo && <div className="absolute right-2 top-1/2 -translate-y-1/2"><TeamLogo teamName={form.homeTeam} logoUrl={form.homeTeamLogo} size={20} /></div>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Away Team</Label>
                  <div className="relative">
                    <Input className="h-10 bg-muted/20" value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} />
                    {form.awayTeamLogo && <div className="absolute right-2 top-1/2 -translate-y-1/2"><TeamLogo teamName={form.awayTeam} logoUrl={form.awayTeamLogo} size={20} /></div>}
                  </div>
                </div>
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
                <div className="flex items-center gap-3">
                  <Checkbox id="isPremium" checked={form.isPremium} onCheckedChange={(c) => setForm({ ...form, isPremium: c === true })} />
                  <Label htmlFor="isPremium" className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <Crown className="w-3.5 h-3.5 text-accent" /> Premium Tip
                  </Label>
                </div>
                <Button type="submit" className="h-10 px-6 font-display uppercase tracking-widest text-[10px]">
                  {editingTipId !== null ? "Save Changes" : "Add Tip"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* FEATURED PICK (HERO) - SIMPLIFIED */}
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

                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] uppercase text-muted-foreground">Likes 👍</Label>
                      <Input type="number" className="h-9 text-xs" value={featured.likesCount || 0} onChange={(e) => setFeatured({ ...featured, likesCount: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>

                  <Button
                    className="w-full gap-2 h-10 font-display uppercase tracking-wider text-[10px] bg-accent hover:bg-accent/90"
                    onClick={async () => {
                      const { id, ...pickWithoutId } = featured; 
                      await saveFeaturedPick(pickWithoutId);
                      await refreshData();
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

        {/* PREMIUM & PUSH - COMPACT ON MOBILE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                <Bell className="w-4 h-4 text-accent" /> Send Push
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

        {/* ALL TIPS LIST - COMPACT */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Active Tips ({tips.length})</h2>
            <div className="flex gap-2">
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
                      toast({ title: "API OK! ✅", description: `Found ${results.length} fixtures. Check console for details.` });
                    } else {
                      toast({ 
                        variant: "destructive", 
                        title: "API Error ❌", 
                        description: "No events found. Check browser console for debug info." 
                      });
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
              <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={refreshData}><RefreshCw className="w-3 h-3 mr-1" /> Sync</Button>
            </div>
          </div>
          <div className="space-y-2">
            {tips.map((tip) => (
              <div key={tip.id} className="flex items-center justify-between p-3 bg-card border border-border/50 rounded-xl group active:bg-muted/50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo || undefined} size={20} />
                  <div className="truncate">
                    <p className="text-xs font-bold truncate">{tip.homeTeam} vs {tip.awayTeam}</p>
                    <p className="text-[10px] text-muted-foreground">{tip.prediction} @ {tip.odds}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant={tip.status === "won" ? "win" : tip.status === "lost" ? "loss" : "outline"} className="text-[8px] h-5 px-1">{tip.status}</Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTip(tip)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-loss" onClick={() => handleDelete(tip.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ADD / EDIT COUPON - RESTORED & MOBILE FRIENDLY */}
        <Card className={`bg-card border-border/50 ${editingCouponId !== null ? 'ring-2 ring-primary' : ''}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                {editingCouponId !== null ? "Edit Coupon" : "Create New Coupon"}
              </h2>
              {editingCouponId !== null && (
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={resetCouponForm}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Coupon Name</Label>
                  <Input placeholder="e.g. Weekend Combo" value={couponName} onChange={(e) => setCouponName(e.target.value)} className="h-10 bg-muted/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Stake ($)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 10" value={couponStake} onChange={(e) => setCouponStake(e.target.value)} className="h-10 bg-muted/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={couponStatus} onValueChange={(v) => setCouponStatus(v as Coupon["status"])}>
                    <SelectTrigger className="h-10 bg-muted/20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="won">Won ✓</SelectItem>
                      <SelectItem value="lost">Lost ✗</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-xl px-4 py-2.5 w-full">
                    <Checkbox id="couponPremium" checked={couponIsPremium} onCheckedChange={(c) => setCouponIsPremium(c === true)} />
                    <Label htmlFor="couponPremium" className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                      <Crown className="w-3.5 h-3.5 text-accent" /> Premium Coupon
                    </Label>
                  </div>
                </div>
              </div>

              {/* Add match to coupon */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display font-bold">Add Match to Coupon</p>
                
                <UpcomingMatchesList onSelectMatch={handleSelectCouponMatch} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase text-muted-foreground">Home Team</Label>
                    <Input value={couponMatchForm.homeTeam} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, homeTeam: e.target.value })} className="h-9 text-xs bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase text-muted-foreground">Away Team</Label>
                    <Input value={couponMatchForm.awayTeam} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, awayTeam: e.target.value })} className="h-9 text-xs bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase text-muted-foreground">Prediction</Label>
                    <Input placeholder="e.g. Over 2.5" value={couponMatchForm.prediction} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, prediction: e.target.value })} className="h-9 text-xs bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] uppercase text-muted-foreground">Odds</Label>
                    <Input type="number" step="0.01" value={couponMatchForm.odds} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, odds: e.target.value })} className="h-9 text-xs bg-background" />
                  </div>
                </div>
                
                <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 h-9 text-[10px] uppercase tracking-wider" onClick={handleAddCouponMatch}>
                  <Plus className="w-3.5 h-3.5" /> Add Match to Coupon
                </Button>
              </div>

              {/* Current coupon matches */}
              {couponMatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">
                      Matches ({couponMatches.length})
                    </p>
                    <p className="text-[10px] font-bold">
                      Total Odds: <span className="text-primary">@{calculateTotalOdds(couponMatches).toFixed(2)}</span>
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {couponMatches.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-background border border-border/50 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo || undefined} size={16} />
                          <div className="truncate">
                            <p className="text-[10px] font-bold truncate">{m.homeTeam} vs {m.awayTeam}</p>
                            <p className="text-[9px] text-muted-foreground">{m.prediction} @ {m.odds.toFixed(2)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-loss hover:text-loss" onClick={() => handleRemoveCouponMatch(i)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full gap-2 h-11 font-display uppercase tracking-wider text-xs shadow-lg shadow-primary/20" onClick={handleCreateOrUpdateCoupon}>
                {editingCouponId !== null ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {editingCouponId !== null ? "Save Coupon Changes" : "Create Coupon"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* EXISTING COUPONS LIST */}
        {coupons.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold">All Coupons ({coupons.length})</h2>
            <div className="grid grid-cols-1 gap-3">
              {coupons.map((coupon) => (
                <Card key={coupon.id} className="bg-card border-border/50 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-sm">{coupon.name}</p>
                        {coupon.isPremium && <Badge variant="confidence" className="h-4 px-1 text-[8px] uppercase tracking-tighter"><Crown className="w-2 h-2 mr-0.5" /> Premium</Badge>}
                      </div>
                      <Badge variant={coupon.status === "won" ? "win" : coupon.status === "lost" ? "loss" : "outline"} className="text-[8px] h-4 px-1">{coupon.status}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                      <span>{coupon.matches.length} matches • Total Odds: @{coupon.totalOdds.toFixed(2)}</span>
                      {coupon.stake && <span>Stake: ${coupon.stake}</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] uppercase tracking-wider" onClick={() => handleEditCoupon(coupon)}>
                        <Pencil className="w-3 h-3 mr-1.5" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 text-loss border-loss/30 hover:bg-loss/10" onClick={() => handleDeleteCoupon(coupon.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Admin;
