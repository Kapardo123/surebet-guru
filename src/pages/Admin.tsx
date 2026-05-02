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
import { Plus, Trash2, ArrowLeft, Crown, Receipt, X, Zap, Pencil, Save, XCircle, Users, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import UpcomingMatchesList from "@/components/UpcomingMatchesList";
import { UpcomingMatch } from "@/hooks/useUpcomingMatches";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

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
    
    // Check if logos are being stored
    const hasLogos = loadedTips.some(t => t.homeTeamLogo || t.awayTeamLogo);
    if (loadedTips.length > 0 && !hasLogos) {
      console.warn("SQL Migration needed: ALTER TABLE tips ADD COLUMN home_team_logo TEXT, ADD COLUMN away_team_logo TEXT;");
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
  });

  // Coupon form state
  const [editingCouponId, setEditingCouponId] = useState<number | null>(null);
  const [couponName, setCouponName] = useState("");
  const [couponStake, setCouponStake] = useState("");
  const [couponIsPremium, setCouponIsPremium] = useState(false);
  const [couponStatus, setCouponStatus] = useState<Coupon["status"]>("active");
  const [couponMatches, setCouponMatches] = useState<CouponMatch[]>([]);
  const [couponMatchForm, setCouponMatchForm] = useState({
    homeTeam: "",
    awayTeam: "",
    prediction: "",
    odds: "",
    league: "",
    sport: "Football",
    kickoff: "",
  });

  const resetTipForm = () => {
    setEditingTipId(null);
    setForm({ sport: "Football", league: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", kickoff: "", status: "upcoming", isPremium: false, description: "" });
  };

  const resetCouponForm = () => {
    setEditingCouponId(null);
    setCouponName("");
    setCouponStake("");
    setCouponIsPremium(false);
    setCouponStatus("active");
    setCouponMatches([]);
  };

  const handleSelectMatch = (match: UpcomingMatch) => {
    setForm((prev) => ({
      ...prev,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      kickoff: `${match.date}, ${match.time}`,
    }));
    toast({ title: `Match loaded: ${match.homeTeam} vs ${match.awayTeam}` });
  };

  const handleSelectCouponMatch = (match: UpcomingMatch) => {
    setCouponMatchForm((prev) => ({
      ...prev,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      kickoff: `${match.date}, ${match.time}`,
    }));
    toast({ title: `Coupon match loaded: ${match.homeTeam} vs ${match.awayTeam}` });
  };

  const handleSelectFeaturedMatch = (match: UpcomingMatch) => {
    setFeatured((prev) => ({
      ...prev,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      kickoff: `${match.date}, ${match.time}`,
    }));
    toast({ title: `Featured match loaded: ${match.homeTeam} vs ${match.awayTeam}` });
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
      // If it looks like a simple date time string, try to parse it
      if (form.kickoff.includes('-') && form.kickoff.includes(':')) {
        const datePart = form.kickoff.split(' ')[0];
        const timePart = form.kickoff.split(' ')[1];
        // Create date assuming Polish time (UTC+2 or UTC+1)
        // For simplicity, let's treat it as a date string that browser can parse
        // or just store as is if it's already ISO.
        const parsedDate = new Date(form.kickoff.replace(' ', 'T'));
        if (!isNaN(parsedDate.getTime())) {
          kickoffISO = parsedDate.toISOString();
        }
      }
    } catch (err) {
      console.error("Date parsing error:", err);
    }

    if (editingTipId !== null) {
      // Find current logos if not changed
      const current = tips.find(t => t.id === editingTipId);
      const homeLogo = current?.homeTeamLogo || await fetchTeamLogoUrl(form.homeTeam);
      const awayLogo = current?.awayTeamLogo || await fetchTeamLogoUrl(form.awayTeam);

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
        homeTeamLogo: homeLogo,
        awayTeamLogo: awayLogo,
        description: form.description,
      });
      await refreshData();
      resetTipForm();
      toast({ title: "Tip updated! ✅" });
    } else {
      // Fetch logos on add
      const homeLogo = await fetchTeamLogoUrl(form.homeTeam);
      const awayLogo = await fetchTeamLogoUrl(form.awayTeam);

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
        homeTeamLogo: homeLogo,
        awayTeamLogo: awayLogo,
        description: form.description,
      });
      
      if (created && form.isPremium) {
        // Automatically send push notification for new premium tip
        try {
          await supabase.functions.invoke("send-premium-push", {
            body: { 
              title: "New Premium Tip! 🔥", 
              message: `${form.homeTeam} vs ${form.awayTeam} - ${form.prediction}` 
            }
          });
          toast({ title: "Premium push sent! 🚀" });
        } catch (pushError) {
          console.error("Failed to send automatic push:", pushError);
          // Don't show error toast here to not confuse user if tip was added successfully
        }
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    await deleteTip(id);
    await refreshData();
    toast({ title: "Tip removed" });
  };

  const handleAddCouponMatch = async () => {
    const { homeTeam, awayTeam, prediction, odds, league, sport, kickoff } = couponMatchForm;
    if (!homeTeam || !awayTeam || !prediction || !odds) {
      toast({ title: "Fill match fields", variant: "destructive" });
      return;
    }
    
    // Fetch logos for each match in the coupon
    const homeLogo = await fetchTeamLogoUrl(homeTeam);
    const awayLogo = await fetchTeamLogoUrl(awayTeam);

    setCouponMatches([...couponMatches, {
      homeTeam, awayTeam, prediction,
      odds: parseFloat(odds),
      league, sport, kickoff,
      homeTeamLogo: homeLogo,
      awayTeamLogo: awayLogo,
    }]);
    setCouponMatchForm({ homeTeam: "", awayTeam: "", prediction: "", odds: "", league: "", sport: "Football", kickoff: "" });
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
        // Automatically send push notification for new premium coupon
        try {
          await supabase.functions.invoke("send-premium-push", {
            body: { 
              title: "New Premium Coupon! 🎫", 
              message: `${couponName} with total odds ${calculateTotalOdds(couponMatches).toFixed(2)}` 
            }
          });
          toast({ title: "Premium push sent! 🚀" });
        } catch (pushError) {
          console.error("Failed to send automatic push for coupon:", pushError);
        }
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

  return (
    <div className="min-h-screen bg-background">
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
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* USER PREMIUM MANAGEMENT */}
        <Card className="bg-card border-border/50 card-glow overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Crown className="w-24 h-24 text-accent" />
          </div>
          <CardContent className="p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-accent" />
              </div>
              Manage Premium (Manual)
            </h2>
            <form onSubmit={handleGrantPremium} className="grid gap-5 md:grid-cols-3 items-end">
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">User Email</Label>
                <Input 
                  type="email"
                  placeholder="user@example.com" 
                  value={userEmail} 
                  onChange={(e) => setUserEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Premium Days</Label>
                <Select value={premiumDays} onValueChange={setPremiumDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                    <SelectItem value="365">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Button 
                  type="submit" 
                  disabled={isUpdatingPremium}
                  className="w-full gap-2 h-11 font-display uppercase tracking-wider text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isUpdatingPremium ? (
                    <span className="animate-spin">⌛</span>
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                  Grant Access
                </Button>
              </div>
            </form>
            <p className="mt-4 text-[11px] text-muted-foreground italic">
              * Note: User must exist in 'profiles' table. If not found, ensure they have logged in at least once.
            </p>
          </CardContent>
        </Card>

        {/* PUSH NOTIFICATIONS */}
        <Card className="bg-card border-border/50 card-glow overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Bell className="w-24 h-24 text-accent" />
          </div>
          <CardContent className="p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Bell className="w-4 h-4 text-accent" />
              </div>
              Send Premium Push Notification
            </h2>
            <form onSubmit={sendPremiumPush} className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notification Title</Label>
                  <Input 
                    placeholder="e.g. New Premium Tip! 🔥" 
                    value={pushTitle} 
                    onChange={(e) => setPushTitle(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notification Message</Label>
                  <Input 
                    placeholder="e.g. A new high-confidence tip has been added." 
                    value={pushMessage} 
                    onChange={(e) => setPushMessage(e.target.value)} 
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSendingPush}
                  className="w-full md:w-auto min-w-[200px] gap-2 h-11 font-display uppercase tracking-wider text-xs bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {isSendingPush ? (
                    <span className="animate-spin">⌛</span>
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  Send to All Premium Users
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* FEATURED PICK EDITOR */}
        <Card className="bg-card border-border/50 card-glow">
          <CardContent className="p-6 md:p-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-6 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-accent" />
              </div>
              Featured Pick (Hero)
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">League</Label>
                <Input value={featured.league} onChange={(e) => setFeatured({ ...featured, league: e.target.value })} placeholder="e.g. Premier League" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kickoff Time</Label>
                <Input value={featured.kickoff} onChange={(e) => setFeatured({ ...featured, kickoff: e.target.value })} placeholder="e.g. 20:00" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Home Team</Label>
                <div className="flex items-center gap-2">
                  <Input value={featured.homeTeam} onChange={(e) => setFeatured({ ...featured, homeTeam: e.target.value })} placeholder="e.g. Arsenal" />
                  {featured.homeTeam.length > 2 && <TeamLogo teamName={featured.homeTeam} size={32} />}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Away Team</Label>
                <div className="flex items-center gap-2">
                  <Input value={featured.awayTeam} onChange={(e) => setFeatured({ ...featured, awayTeam: e.target.value })} placeholder="e.g. Chelsea" />
                  {featured.awayTeam.length > 2 && <TeamLogo teamName={featured.awayTeam} size={32} />}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prediction</Label>
                <Input value={featured.prediction} onChange={(e) => setFeatured({ ...featured, prediction: e.target.value })} placeholder="e.g. Over 2.5 Goals" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Odds</Label>
                <Input value={featured.odds} onChange={(e) => setFeatured({ ...featured, odds: e.target.value })} placeholder="e.g. 1.85" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</Label>
                <Select value={featured.confidence} onValueChange={(v) => setFeatured({ ...featured, confidence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High 🔥</SelectItem>
                    <SelectItem value="Medium">Medium ⚡</SelectItem>
                    <SelectItem value="Low">Low 🎲</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select 
                  value={featured.status || "upcoming"} 
                  onValueChange={(v: any) => setFeatured({ ...featured, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="won">Won ✓</SelectItem>
                    <SelectItem value="lost">Lost ✗</SelectItem>
                    <SelectItem value="draw">Draw</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <UpcomingMatchesList teamName={featured.homeTeam} onSelectMatch={handleSelectFeaturedMatch} />

              <div className="space-y-2 col-span-full">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Analysis / Description (Featured)</Label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Why is this the featured pick?" 
                  value={featured.description || ""} 
                  onChange={(e) => setFeatured({ ...featured, description: e.target.value })} 
                />
              </div>

              <div className="flex items-end">
                <Button
                  className="w-full gap-2 h-11 font-display uppercase tracking-wider text-xs"
                  onClick={async () => {
                    try {
                      const homeLogo = await fetchTeamLogoUrl(featured.homeTeam);
                      const awayLogo = await fetchTeamLogoUrl(featured.awayTeam);
                      await saveFeaturedPick({
                        ...featured,
                        homeTeamLogo: homeLogo,
                        awayTeamLogo: awayLogo
                      });
                      
                      // Wait a bit for Supabase to process before refreshing
                      setTimeout(async () => {
                        await refreshData();
                      toast({ title: "Featured Pick updated! ⚡" });
                    }, 500);
                  } catch (error: any) {
                    console.error("Failed to save featured pick", error);
                    if (error.message === "COLUMN_MISSING_STATUS") {
                      toast({ 
                        title: "Status not saved!", 
                        description: "You need to add the 'status' column in Supabase SQL Editor. Check the console for SQL command.",
                        variant: "destructive" 
                      });
                    } else {
                      toast({ title: "Failed to update Featured Pick", variant: "destructive" });
                    }
                  }
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Save Featured Pick
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ADD / EDIT TIP */}
        <Card className={`bg-card border-border/50 card-glow ${editingTipId !== null ? 'ring-2 ring-accent' : ''}`}>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  {editingTipId !== null ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
                </div>
                {editingTipId !== null ? "Edit Tip" : "Add New Tip"}
              </h2>
              {editingTipId !== null && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetTipForm}>
                  <XCircle className="w-4 h-4" /> Cancel
                </Button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Sport</Label>
                <Select value={form.sport} onValueChange={(v) => setForm({ ...form, sport: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Football", "Basketball", "Tennis", "MMA", "Baseball", "Hockey", "Esports"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">League</Label>
                <Input placeholder="e.g. La Liga, NBA..." value={form.league} onChange={(e) => setForm({ ...form, league: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Home Team</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="e.g. Barcelona" value={form.homeTeam} onChange={(e) => setForm({ ...form, homeTeam: e.target.value })} />
                  {form.homeTeam.length > 2 && <TeamLogo teamName={form.homeTeam} size={32} />}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Away Team</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="e.g. Real Madrid" value={form.awayTeam} onChange={(e) => setForm({ ...form, awayTeam: e.target.value })} />
                  {form.awayTeam.length > 2 && <TeamLogo teamName={form.awayTeam} size={32} />}
                </div>
              </div>

              <UpcomingMatchesList teamName={form.homeTeam} onSelectMatch={handleSelectMatch} />

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Prediction</Label>
                <Input placeholder="e.g. Over 2.5 Goals" value={form.prediction} onChange={(e) => setForm({ ...form, prediction: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Odds</Label>
                <Input type="number" step="0.01" placeholder="e.g. 1.85" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kickoff (Format: YYYY-MM-DD HH:MM)</Label>
                <Input placeholder="e.g. 2026-04-21 21:00" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
                <p className="text-[10px] text-muted-foreground italic">Podaj czas polski (zostanie przeliczony na czas użytkownika)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Tip["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="won">Won ✓</SelectItem>
                    <SelectItem value="lost">Lost ✗</SelectItem>
                    <SelectItem value="draw">Draw</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-full">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Analysis / Description</Label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="Why are you picking this tip?" 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                />
              </div>

              <div className="flex items-center gap-3 col-span-full bg-accent/5 border border-accent/20 rounded-xl px-4 py-3">
                <Checkbox
                  id="isPremium"
                  checked={form.isPremium}
                  onCheckedChange={(checked) => setForm({ ...form, isPremium: checked === true })}
                />
                <Label htmlFor="isPremium" className="flex items-center gap-2 cursor-pointer text-sm">
                  <Crown className="w-4 h-4 text-accent" />
                  Premium only tip
                </Label>
              </div>

              <div className="flex items-end col-span-full">
                <Button type="submit" className="w-full gap-2 h-11 font-display uppercase tracking-wider text-xs">
                  {editingTipId !== null ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingTipId !== null ? "Save Changes" : "Add Tip"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ALL TIPS LIST */}
        <div>
          <h2 className="font-display text-xl font-bold text-foreground mb-4 tracking-tight">
            All Tips ({tips.length})
          </h2>
          <div className="grid gap-3">
            {tips.map((tip) => (
              <Card key={tip.id} className="bg-card border-border/50 group hover:border-border transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TeamLogo teamName={tip.homeTeam} size={24} />
                    <div>
                      <p className="font-display font-semibold text-foreground text-sm tracking-tight">
                        {tip.homeTeam} vs {tip.awayTeam}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tip.sport} • {tip.league} • {tip.prediction} @ {tip.odds}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tip.isPremium && (
                      <Badge variant="confidence" className="gap-1 text-[10px]">
                        <Crown className="w-3 h-3" />
                        Premium
                      </Badge>
                    )}
                    <Badge variant={tip.status === "won" ? "win" : tip.status === "lost" ? "loss" : tip.status === "draw" ? "draw" : "outline"}>
                      {tip.status}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEditTip(tip)} className="text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(tip.id)} className="text-loss hover:text-loss hover:bg-loss/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* COUPON BUILDER */}
        <Card className={`bg-card border-border/50 card-glow ${editingCouponId !== null ? 'ring-2 ring-accent' : ''}`}>
          <CardContent className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  {editingCouponId !== null ? <Pencil className="w-4 h-4 text-accent" /> : <Receipt className="w-4 h-4 text-accent" />}
                </div>
                {editingCouponId !== null ? "Edit Coupon" : "Create Coupon"}
              </h2>
              {editingCouponId !== null && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={resetCouponForm}>
                  <XCircle className="w-4 h-4" /> Cancel
                </Button>
              )}
            </div>

            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Coupon Name</Label>
                  <Input placeholder="e.g. Weekend Combo" value={couponName} onChange={(e) => setCouponName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Stake ($)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 10" value={couponStake} onChange={(e) => setCouponStake(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={couponStatus} onValueChange={(v) => setCouponStatus(v as Coupon["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="won">Won ✓</SelectItem>
                      <SelectItem value="lost">Lost ✗</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 w-full">
                    <Checkbox id="couponPremium" checked={couponIsPremium} onCheckedChange={(c) => setCouponIsPremium(c === true)} />
                    <Label htmlFor="couponPremium" className="flex items-center gap-2 cursor-pointer text-sm">
                      <Crown className="w-4 h-4 text-accent" /> Premium
                    </Label>
                  </div>
                </div>
              </div>

              {/* Add match to coupon */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-display font-bold">Add Match to Coupon</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input placeholder="Home Team" value={couponMatchForm.homeTeam} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, homeTeam: e.target.value })} />
                  <Input placeholder="Away Team" value={couponMatchForm.awayTeam} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, awayTeam: e.target.value })} />
                  
                  <div className="col-span-full">
                    <UpcomingMatchesList teamName={couponMatchForm.homeTeam} onSelectMatch={handleSelectCouponMatch} />
                  </div>

                  <Input placeholder="Prediction" value={couponMatchForm.prediction} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, prediction: e.target.value })} />
                  <Input type="number" step="0.01" placeholder="Odds" value={couponMatchForm.odds} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, odds: e.target.value })} />
                  <Input placeholder="League" value={couponMatchForm.league} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, league: e.target.value })} />
                  <Input placeholder="Kickoff" value={couponMatchForm.kickoff} onChange={(e) => setCouponMatchForm({ ...couponMatchForm, kickoff: e.target.value })} />
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleAddCouponMatch}>
                  <Plus className="w-3.5 h-3.5" /> Add Match
                </Button>
              </div>

              {/* Current coupon matches */}
              {couponMatches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-display">
                    Matches ({couponMatches.length}) — Total Odds: <span className="text-primary font-bold">{calculateTotalOdds(couponMatches).toFixed(2)}</span>
                    {couponStake && (
                      <span className="text-accent ml-2">
                        Potential Win: ${(parseFloat(couponStake) * calculateTotalOdds(couponMatches)).toFixed(2)}
                      </span>
                    )}
                  </p>
                  {couponMatches.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-card border border-border/50 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <TeamLogo teamName={m.homeTeam} size={20} />
                        <span className="text-sm text-foreground">{m.homeTeam} vs {m.awayTeam}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{m.prediction}</span>
                        <span className="font-display font-bold text-accent text-sm">{m.odds.toFixed(2)}</span>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-loss hover:text-loss" onClick={() => handleRemoveCouponMatch(i)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full gap-2 h-11 font-display uppercase tracking-wider text-xs" onClick={handleCreateOrUpdateCoupon}>
                {editingCouponId !== null ? <Save className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
                {editingCouponId !== null ? "Save Changes" : "Create Coupon"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Existing coupons */}
        {coupons.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-bold text-foreground mb-4 tracking-tight">
              All Coupons ({coupons.length})
            </h2>
            <div className="grid gap-3">
              {coupons.map((coupon) => (
                <Card key={coupon.id} className="bg-card border-border/50 group hover:border-border transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-display font-semibold text-foreground text-sm">{coupon.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {coupon.matches.length} matches • Total: {coupon.totalOdds.toFixed(2)} • {coupon.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {coupon.isPremium && (
                        <Badge variant="confidence" className="gap-1 text-[10px]">
                          <Crown className="w-3 h-3" /> Premium
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEditCoupon(coupon)} className="text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCoupon(coupon.id)} className="text-loss hover:text-loss hover:bg-loss/10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
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
