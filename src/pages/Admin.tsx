import { useState } from "react";
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
import { Tip } from "@/components/TipCard";
import { Plus, Trash2, ArrowLeft, Crown, Receipt, X, Zap, Pencil, Save, XCircle, Users, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import UpcomingMatchesList from "@/components/UpcomingMatchesList";
import { UpcomingMatch } from "@/hooks/useUpcomingMatches";
import Logo from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const { toast } = useToast();
  const [tips, setTips] = useState<Tip[]>(loadTips());
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons());
  const [featured, setFeatured] = useState<FeaturedPick>(loadFeaturedPick());

  // User Premium Management State
  const [userEmail, setUserEmail] = useState("");
  const [premiumDays, setPremiumDays] = useState("30");
  const [isUpdatingPremium, setIsUpdatingPremium] = useState(false);

  const handleGrantPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      toast({ title: "Please enter user email", variant: "destructive" });
      return;
    }

    setIsUpdatingPremium(true);
    try {
      // Wyszukiwanie użytkownika bezpośrednio w tabeli auth.users nie jest możliwe z poziomu klienta przeglądarkowego.
      // Najpierw spróbujemy znaleźć użytkownika w tabeli premium_access (jeśli już tam jest).
      // Ale najlepszym sposobem na powiązanie emaila z ID bez dodatkowej tabeli 'profiles' 
      // jest skorzystanie z faktu, że Supabase Auth przechowuje dane.
      
      // Ponieważ nie mamy pewności co do istnienia tabeli 'profiles', użyjemy bezpieczniejszego podejścia:
      // Spróbujemy wywołać RPC lub sprawdzić czy użytkownik jest w premium_access (jeśli tam był logowany ID).
      // JEDNAK najczęstszym powodem błędu jest brak tabeli 'profiles' lub brak uprawnień.
      
      // ZMIEŃMY TO: Spróbujemy użyć ID użytkownika bezpośrednio, jeśli admin go zna, 
      // lub spróbujemy znaleźć go w tabeli premium_access jeśli tam istnieje wpis z meta-danymi.
      
      // Poprawka: Najpierw sprawdźmy czy tabela profiles w ogóle istnieje i zawiera ten email.
      const { data: userData, error: userError } = await (supabase as any)
        .from('profiles') 
        .select('id')
        .eq('email', userEmail.trim())
        .maybeSingle();

      if (userError || !userData) {
        toast({ 
          title: "Użytkownik nie odnaleziony", 
          description: "Upewnij się, że email jest poprawny. Jeśli problem nadal występuje, użytkownik musi się najpierw zalogować.",
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
    setForm({ sport: "Football", league: "", homeTeam: "", awayTeam: "", prediction: "", odds: "", kickoff: "", status: "upcoming", isPremium: false });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.league || !form.homeTeam || !form.awayTeam || !form.prediction || !form.odds || !form.kickoff) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (editingTipId !== null) {
      updateTip({
        id: editingTipId,
        sport: form.sport,
        league: form.league,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        prediction: form.prediction,
        odds: parseFloat(form.odds),
        kickoff: form.kickoff,
        status: form.status,
        isPremium: form.isPremium,
      });
      setTips(loadTips());
      resetTipForm();
      toast({ title: "Tip updated! ✅" });
    } else {
      addTip({
        sport: form.sport,
        league: form.league,
        homeTeam: form.homeTeam,
        awayTeam: form.awayTeam,
        prediction: form.prediction,
        odds: parseFloat(form.odds),
        kickoff: form.kickoff,
        status: form.status,
        isPremium: form.isPremium,
      });
      setTips(loadTips());
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: number) => {
    deleteTip(id);
    setTips(loadTips());
    toast({ title: "Tip removed" });
  };

  const handleAddCouponMatch = () => {
    const { homeTeam, awayTeam, prediction, odds, league, sport, kickoff } = couponMatchForm;
    if (!homeTeam || !awayTeam || !prediction || !odds) {
      toast({ title: "Fill match fields", variant: "destructive" });
      return;
    }
    setCouponMatches([...couponMatches, {
      homeTeam, awayTeam, prediction,
      odds: parseFloat(odds),
      league, sport, kickoff,
    }]);
    setCouponMatchForm({ homeTeam: "", awayTeam: "", prediction: "", odds: "", league: "", sport: "Football", kickoff: "" });
    toast({ title: "Match added to coupon ✅" });
  };

  const handleRemoveCouponMatch = (index: number) => {
    setCouponMatches(couponMatches.filter((_, i) => i !== index));
  };

  const handleCreateOrUpdateCoupon = () => {
    if (!couponName || couponMatches.length < 2) {
      toast({ title: "Name and at least 2 matches required", variant: "destructive" });
      return;
    }

    if (editingCouponId !== null) {
      updateCoupon({
        id: editingCouponId,
        name: couponName,
        matches: couponMatches,
        totalOdds: calculateTotalOdds(couponMatches),
        stake: couponStake ? parseFloat(couponStake) : undefined,
        status: couponStatus,
        isPremium: couponIsPremium,
        createdAt: coupons.find(c => c.id === editingCouponId)?.createdAt || new Date().toISOString(),
      });
      setCoupons(loadCoupons());
      resetCouponForm();
      toast({ title: "Coupon updated! 🎫" });
    } else {
      addCoupon({
        name: couponName,
        matches: couponMatches,
        stake: couponStake ? parseFloat(couponStake) : undefined,
        status: "active",
        isPremium: couponIsPremium,
      });
      setCoupons(loadCoupons());
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

  const handleDeleteCoupon = (id: number) => {
    deleteCoupon(id);
    setCoupons(loadCoupons());
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
              Zarządzaj Premium (Ręcznie)
            </h2>
            <form onSubmit={handleGrantPremium} className="grid gap-5 md:grid-cols-3 items-end">
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email Użytkownika</Label>
                <Input 
                  type="email"
                  placeholder="user@example.com" 
                  value={userEmail} 
                  onChange={(e) => setUserEmail(e.target.value)} 
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Dni Premium</Label>
                <Select value={premiumDays} onValueChange={setPremiumDays}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz czas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Dzień</SelectItem>
                    <SelectItem value="7">7 Dni</SelectItem>
                    <SelectItem value="15">15 Dni</SelectItem>
                    <SelectItem value="30">30 Dni</SelectItem>
                    <SelectItem value="90">90 Dni</SelectItem>
                    <SelectItem value="365">1 Rok</SelectItem>
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
                  Nadaj Dostęp
                </Button>
              </div>
            </form>
            <p className="mt-4 text-[11px] text-muted-foreground italic">
              * Uwaga: Użytkownik musi istnieć w tabeli 'profiles'. Jeśli nie go nie ma, upewnij się, że zalogował się przynajmniej raz do aplikacji.
            </p>
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
              <div className="flex items-end">
                <Button
                  className="w-full gap-2 h-11 font-display uppercase tracking-wider text-xs"
                  onClick={() => {
                    saveFeaturedPick(featured);
                    toast({ title: "Featured Pick updated! ⚡" });
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
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Kickoff</Label>
                <Input placeholder="e.g. Today, 21:00" value={form.kickoff} onChange={(e) => setForm({ ...form, kickoff: e.target.value })} />
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
