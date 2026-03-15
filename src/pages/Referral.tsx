import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Gift, Users, Check, Loader2, Share2, Crown, Lock, Smartphone, Send, Instagram } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Referral = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [myCode, setMyCode] = useState("");
  const [inputCode, setInputCode] = useState(searchParams.get("code") || "");
  const [stats, setStats] = useState({ total_referrals: 0, total_reward_days: 0 });
  const [copied, setCopied] = useState(false);
  const [using, setUsing] = useState(false);
  const { active: isPremium, refresh: refreshPremium } = usePremiumStatus();

  useEffect(() => {
    if (user) {
      fetchCode();
      fetchStats();
    }
  }, [user]);

  const fetchCode = async () => {
    const { data } = await supabase.functions.invoke("referral", {
      body: { action: "get-code" },
    });
    if (data?.code) setMyCode(data.code);
  };

  const fetchStats = async () => {
    const { data } = await supabase.functions.invoke("referral", {
      body: { action: "stats" },
    });
    if (data) setStats(data);
  };

  const copyCode = async () => {
    if (!myCode) return;
    const shareUrl = `${window.location.origin}/referral?code=${myCode}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Skopiowano! 📋", description: "Link polecający został skopiowany do schowka" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTelegram = () => {
    const shareUrl = `${window.location.origin}/referral?code=${myCode}`;
    const text = `Dołącz do Surebet Guru i odbierz 3 dni Premium za darmo! Mój kod: ${myCode}`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareOnWhatsApp = () => {
    const shareUrl = `${window.location.origin}/referral?code=${myCode}`;
    const text = `Dołącz do Surebet Guru i odbierz 3 dni Premium za darmo! Mój kod: ${myCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`, '_blank');
  };

  const useCode = async () => {
    if (!inputCode.trim()) return;
    setUsing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("referral", {
        body: { action: "use-code", code: inputCode.trim() },
      });
      if (fnError) throw new Error("Something went wrong. Please try again.");
      if (data?.error) {
        const friendlyMessages: Record<string, string> = {
          "You can't use your own code": "Hey, you can't refer yourself! 😄 Ask a friend for their code.",
          "Invalid or already used code": "This code is invalid or has already been used.",
        };
        throw new Error(friendlyMessages[data.error] || data.error);
      }
      if (data?.success) {
        await refreshPremium();
        toast({
          title: "Code redeemed! 🎉",
          description: "You got 3 free days of Premium!",
        });
        setInputCode("");
        fetchStats();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Invalid code",
        variant: "destructive",
      });
    } finally {
      setUsing(false);
    }
  };

  if (!user) {
    return (
      <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="bg-card border-border/50 max-w-sm w-full overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Gift className="w-32 h-32 text-accent" />
          </div>
          <CardContent className="p-8 text-center space-y-4">
            <Gift className="w-12 h-12 text-accent mx-auto" />
            <h2 className="font-display text-xl font-bold text-foreground">Program Poleceń</h2>
            <p className="text-sm text-muted-foreground">Zaloguj się, aby zapraszać znajomych i odbierać darmowe dni Premium!</p>
            <Link to="/auth?redirect=/referral" className="block">
              <Button className="w-full bg-primary hover:bg-primary/90">Zaloguj się</Button>
            </Link>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 justify-center">
              <ArrowLeft className="w-3.5 h-3.5" />
              Wróć do strony głównej
            </Link>
          </CardContent>
        </Card>
      </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Wróć
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-4 relative">
          <div className="absolute inset-0 -z-10 flex justify-center opacity-10">
             <div className="w-64 h-64 bg-accent rounded-full blur-[100px]" />
          </div>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-primary/20 flex items-center justify-center mx-auto shadow-lg shadow-accent/10">
            <Gift className="w-10 h-10 text-accent" />
          </div>
           <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">
            <span className="text-gradient">Zaproś Znajomych</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            Udostępnij swój kod i zyskaj <span className="text-accent font-bold">3 dni Premium</span> za każdą zaproszoną osobę!
          </p>
        </div>

        {isPremium ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">{stats.total_referrals}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Zaproszeni</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 hover:border-accent/30 transition-colors">
                <CardContent className="p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Crown className="w-5 h-5 text-accent" />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground">{stats.total_reward_days}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Darmowe dni</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border/50 gradient-border overflow-hidden relative">
              <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-lg text-foreground">Twój Kod Polecający</h2>
                  <div className="flex items-center gap-1.5 text-accent text-xs font-bold uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full">
                    <Smartphone className="w-3 h-3" />
                    Kopiuj & Udostępnij
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-secondary/50 border-2 border-dashed border-border rounded-xl px-4 py-4 font-mono text-2xl text-foreground text-center tracking-[0.2em] font-bold shadow-inner">
                    {myCode || "Ładowanie..."}
                  </div>
                  <Button onClick={copyCode} variant="outline" className="h-auto px-5 rounded-xl border-border/50 hover:bg-secondary transition-all group" disabled={!myCode}>
                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <Button onClick={shareOnTelegram} variant="outline" className="gap-2 h-12 border-border/50 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50">
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Telegram</span>
                  </Button>
                  <Button onClick={shareOnWhatsApp} variant="outline" className="gap-2 h-12 border-border/50 hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/50">
                    <Smartphone className="w-4 h-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                  <Button onClick={copyCode} className="gap-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Inne</span>
                    <span className="sm:hidden">Kopiuj</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="bg-card border-border/50 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-primary" />
            <CardContent className="p-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                <Lock className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold text-foreground tracking-tight">Odblokuj Program Poleceń</h2>
                <p className="text-muted-foreground max-w-xs mx-auto">Tylko użytkownicy Premium mogą generować własne kody i zapraszać znajomych.</p>
              </div>
              <Link to="/premium" className="block">
                <Button className="w-full h-12 gap-2 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-lg shadow-accent/20">
                  <Crown className="w-5 h-5" />
                  Zdobądź Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
            <div className="w-2 h-8 bg-accent rounded-full" />
            Jak to działa?
          </h2>
          <div className="grid gap-4">
            {[
              { title: "Podziel się kodem", text: "Wyślij swój unikalny kod znajomemu.", icon: Share2 },
              { title: "Znajomy odbiera 3 dni", text: "Twój znajomy wpisuje kod i natychmiast dostaje 3 dni Premium.", icon: Gift },
              { title: "Ty zyskujesz 3 dni", text: "Gdy znajomy wpisze kod, Ty również dostajesz 3 dni za darmo!", icon: Crown },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card border border-border/50 rounded-2xl items-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-card border-border/50 shadow-inner">
          <CardContent className="p-8 space-y-6">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              Masz kod od znajomego?
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Wpisz kod np. GSB-ABC123"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="font-mono tracking-widest text-lg h-12 text-center sm:text-left border-border/50 bg-secondary/30 focus:bg-background transition-all"
              />
              <Button onClick={useCode} disabled={using || !inputCode.trim()} className="h-12 px-8 gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-bold">
                {using ? <Loader2 className="w-5 h-5 animate-spin" /> : <Gift className="w-5 h-5" />}
                Odbierz 3 dni
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
              * Możesz użyć tylko jednego kodu polecającego
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
    </PageTransition>
  );
};

export default Referral;
