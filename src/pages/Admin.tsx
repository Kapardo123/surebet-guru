import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { addTip, loadTips } from "@/lib/tipsStorage";
import { addCoupon, loadCoupons, calculateTotalOdds, CouponMatch } from "@/lib/couponStorage";
import { saveFeaturedPick, loadFeaturedPick } from "@/lib/featuredPickStorage";
import QueueTab, { QueueBuilderState } from "@/components/admin/QueueTab";
import LiveTab from "@/components/admin/LiveTab";
import {
  Trash2, ArrowLeft, Receipt, X, Save, Users, Bell, RefreshCw,
  Hourglass, Download, History, Globe,
} from "lucide-react";
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

  // Admin navigation
  const [activeTab, setActiveTab] = useState("import");
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

  // Coupon builder — shared between the Import tab and the Queue tab.
  const [couponName, setCouponName] = useState("");
  const [couponStake, setCouponStake] = useState("");
  const [couponIsPremium, setCouponIsPremium] = useState(false);
  const [couponMatches, setCouponMatches] = useState<CouponMatch[]>([]);

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

  // Premium management + push notifications
  const [userEmail, setUserEmail] = useState("");
  const [premiumDays, setPremiumDays] = useState("30");
  const [isUpdatingPremium, setIsUpdatingPremium] = useState(false);
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [isSendingPush, setIsSendingPush] = useState(false);

  /** Odświeża wspólne cache danych używane przez publiczne widoki. */
  const refreshData = async (forceRefresh: boolean = false) => {
    await Promise.all([
      loadTips(true, forceRefresh),
      loadCoupons(),
      loadFeaturedPick(),
    ]);
  };

  useEffect(() => {
    refreshData();
    // Wygasłe tipy mają znikać same także gdy panel jest otwarty.
    const interval = setInterval(() => refreshData(false), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Route a scraped match: everything is ONE-CLICK and stays on the Import tab.
  const handleSportyImport = async (match: ScrapedMatch, analysis: string, target: ImportTarget) => {
    const oddsVal = Number(match.odds) || 0;
    let kickoffISO = match.kickoff;
    try {
      if (typeof match.kickoff === "string" && match.kickoff.includes("-") && match.kickoff.includes(":")) {
        const d = new Date(match.kickoff.replace(" ", "T"));
        if (!isNaN(d.getTime())) kickoffISO = d.toISOString();
      }
    } catch {
      /* keep the raw kickoff */
    }

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
      try {
        const created = await addTip({ ...baseTip, isPublished: false, queued: true });
        if (!created) throw new Error("Nie udało się zapisać tipa");
        toast({ title: "Queued ⏳", description: `${match.homeTeam} vs ${match.awayTeam} — live at 3:00 (edycja w Queue)` });
      } catch (e: any) {
        toast({ title: "Queue save failed", description: e.message, variant: "destructive" });
      }
    } else if (target === "publish") {
      try {
        const created = await addTip({ ...baseTip, isPublished: true });
        if (!created) throw new Error("Nie udało się zapisać tipa");
        toast({ title: "Published ✅", description: `${match.homeTeam} vs ${match.awayTeam} — widoczny od razu` });
      } catch (e: any) {
        toast({ title: "Publish failed", description: e.message, variant: "destructive" });
      }
    } else if (target === "hero") {
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

  const handleSaveCoupon = async (asQueued: boolean = false) => {
    if (!couponName || couponMatches.length < 2) {
      toast({ title: "Name and at least 2 matches required", variant: "destructive" });
      return;
    }
    try {
      await addCoupon({
        name: couponName,
        matches: couponMatches,
        stake: couponStake ? parseFloat(couponStake) : undefined,
        status: "active",
        isPremium: couponIsPremium,
        queued: asQueued,
      });
      await refreshData(true);
      setCouponName("");
      setCouponStake("");
      setCouponIsPremium(false);
      setCouponMatches([]);
      toast({
        title: asQueued ? "Coupon added to Queue ⏳" : "Coupon created! 🎫",
        description: asQueued ? "Will go live automatically at 3:00 with one push." : undefined,
      });
    } catch (e: any) {
      toast({ title: "Coupon save failed", description: e.message, variant: "destructive" });
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
      const { data, error } = await supabase.functions.invoke("grant-premium", {
        body: { email: userEmail.trim(), days: parseInt(premiumDays, 10) },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Nie udało się nadać premium");

      toast({ title: "Premium Granted! 🎉", description: `Added ${premiumDays} days for ${userEmail}` });
      setUserEmail("");
    } catch (error: any) {
      toast({ title: "Error granting premium", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingPremium(false);
    }
  };

  const sendPremiumPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushMessage.trim()) {
      toast({ title: "Please enter title and message", variant: "destructive" });
      return;
    }

    setIsSendingPush(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Twoja sesja wygasła. Wyloguj się i zaloguj ponownie.");

      // Direct fetch for full header control (avoids 401s).
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-premium-push`;
      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ title: pushTitle.trim(), message: pushMessage.trim() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Błąd serwera: ${response.status}`);
      if (data?.error) throw new Error(data.error);

      if (data.success === 0) {
        toast({
          title: "Push not sent",
          description: data.reason || "No eligible users found with active premium and push enabled.",
          variant: "default",
        });
      } else {
        toast({ title: "Push Sent! 🚀", description: `Notification sent to ${data.success} premium users.` });
      }
      setPushTitle("");
      setPushMessage("");
    } catch (error: any) {
      toast({ title: "Error sending push", description: error.message, variant: "destructive" });
    } finally {
      setIsSendingPush(false);
    }
  };

  const handleClearLogoCache = async () => {
    if (!window.confirm("Are you sure you want to clear ALL cached team logos? They will be re-fetched on next load.")) return;
    try {
      const { data, error } = await supabase.functions.invoke("team-logo", { body: { action: "clear" } });
      if (error) throw error;
      if (!data?.cleared) throw new Error(data?.error || "Nie udało się wyczyścić cache");
      toast({ title: "Logo cache cleared! 🧹", description: "Logos will be re-fetched when needed." });
      refreshData();
    } catch (err: any) {
      toast({ title: "Error clearing cache", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 relative overflow-hidden">
      <div className="fixed top-0 left-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)" }} />

      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/80 via-[#150025]/80 to-[#0a0020]/80 border-b border-white/10 shadow-xl shadow-black/30">
        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <Logo />
            </Link>
            <Badge variant="confidence" className="font-display text-[10px] uppercase tracking-wider bg-gradient-to-r from-pink-500/20 to-pink-500/10 text-pink-300 border-pink-500/30">Admin</Badge>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-white/60 hover:text-pink-400 hover:bg-white/5 transition-all duration-200 rounded-full px-3 md:px-3.5 border border-transparent hover:border-pink-500/30">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* ADMIN NAVIGATION TABS */}
        <div className="sticky top-[72px] z-40 bg-[#0a0015]/80 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-lg shadow-black/20">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30"
                    : "text-white/60 hover:text-pink-300 hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* IMPORT TAB — fetch matches from a source, route to Tip / Hero / Coupon */}
        {activeTab === "import" && (
          <Card className="bg-card border-accent/20 shadow-md overflow-hidden border">
            <CardContent className="p-3 sm:p-4 space-y-4">
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

              {couponMatches.length > 0 && (
                <div className="border border-cyan-500/20 rounded-xl p-3 space-y-3 bg-cyan-500/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-cyan-400" />
                      <span className="font-display text-sm font-bold">Coupon Preview</span>
                      <Badge variant="outline" className="text-[9px]">{couponMatches.length} matches</Badge>
                    </div>
                    <span className="text-xs font-bold text-cyan-400">
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
                          <span className="font-black text-cyan-400">{m.odds.toFixed(2)}</span>
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
                        className="h-8 gap-1 text-[10px] bg-pink-500 hover:bg-pink-600"
                        onClick={() => handleSaveCoupon(false)}
                        disabled={!couponName || couponMatches.length < 2}
                      >
                        <Save className="w-3 h-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-[10px] bg-gradient-to-r from-pink-500 to-pink-600 text-white"
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
        {activeTab === "queue" && (
          <QueueTab onSaved={() => refreshData(false)} builder={queueBuilder} setBuilder={setQueueBuilder} />
        )}

        {/* LIVE CONTENT (podglad/edycja/usuwanie opublikowanych) */}
        {activeTab === "live" && <LiveTab onSaved={() => refreshData(false)} />}

        {/* PREMIUM & PUSH */}
        {activeTab === "premium" && (
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
