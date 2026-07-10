import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Zap, Shield, TrendingUp, Star, Loader2, 
  LogIn, LogOut, Bell, Smartphone, Check, Clock, Globe, X, Home
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

export default function Premium() {
  // v1.9.5
  const { user, signOut, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState<number | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();

  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  const handleBack = () => {
    // Force a complete reload to "/" to avoid any potential WebView history/state hanging
    // This is a known workaround for Android WebView navigation/black screen issues
    window.location.href = "/";
  };

  useEffect(() => {
    // Immediate status check and RC offering fetch
    refresh().catch(() => {});

    if (Capacitor.getPlatform() !== 'web') {
      getOfferings().then(offerings => {
        if (offerings) setRcOfferings(offerings);
      }).catch(() => {});
    }
  }, [refresh]);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await refresh(info);
        toast({ title: "Purchases restored! ✅" });
      } else {
        toast({ title: "No active purchases found", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Restore failed", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const handleBuy = async (duration: number, paymentLink?: string) => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }
    setLoading(duration);
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const info = await presentPaywall();
        if (info) {
          await refresh(info, duration);
        } else if (rcOfferings?.current) {
          let pkg = null;
          if (duration === 7) pkg = rcOfferings.current.weekly;
          else if (duration === 30) pkg = rcOfferings.current.monthly;
          else {
            pkg = rcOfferings.current.availablePackages.find((p: any) => p.identifier.includes('15'));
          }
          if (pkg) {
            const dInfo = await purchasePackage(pkg);
            if (dInfo) await refresh(dInfo, duration);
          }
        }
      } else if (paymentLink) {
        window.location.href = `${paymentLink}?client_reference_id=${user.id}&customer_email=${encodeURIComponent(user.email || "")}`;
      }
    } catch (e) {
      console.error("Purchase error", e);
    } finally {
      setLoading(null);
    }
  };

  // Define features inside to avoid TDZ
  const features = [
    { icon: <TrendingUp className="w-5 h-5 text-accent" />, title: "Premium Betting Picks", desc: "Unlock exclusive, high-value betting selections researched by our experts." },
    { icon: <Bell className="w-5 h-5 text-primary" />, title: "Instant Push Notifications", desc: "Get real-time alerts for every new premium pick so you never miss an opportunity." },
    { icon: <Shield className="w-5 h-5 text-green-500" />, title: "AI Match Analytics", desc: "Deep statistical analysis powered by AI to identify the best value opportunities." },
    { icon: <Star className="w-5 h-5 text-blue-500" />, title: "VIP Strategy Guides", desc: "Exclusive bankroll management and betting strategy guides for consistent profits." }
  ];

  const plans = [
    { duration: 7, label: "Weekly Pass", days: "7 Days", price: "$3.99", paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03", perDay: "$0.57/day" },
    { duration: 15, label: "Pro Access", days: "15 Days", price: "$6.99", popular: true, paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04", perDay: "$0.46/day", save: "15% OFF" },
    { duration: 30, label: "Monthly VIP", days: "30 Days", price: "$9.99", paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05", perDay: "$0.33/day", save: "40% OFF" },
  ];

  // Helper to get localized price from RC
  const getPlanPrice = (plan: any) => {
    if (Capacitor.getPlatform() !== 'web' && rcOfferings?.current) {
      let pkg = null;
      if (plan.duration === 7) pkg = rcOfferings.current.weekly;
      else if (plan.duration === 30) pkg = rcOfferings.current.monthly;
      else {
        pkg = rcOfferings.current.availablePackages.find((p: any) => p.identifier.includes('15'));
      }
      if (pkg && pkg.product) {
        return pkg.product.priceString;
      }
    }
    return plan.price;
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 md:pb-0 relative overflow-hidden">
      {/* Synthwave glow effects */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />

      {/* Modern Glass Header - Synthwave Style */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/80 via-[#150025]/80 to-[#0a0020]/80 border-b border-purple-500/20 shadow-xl shadow-black/30">
        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-3.5 flex items-center justify-between">
          <div onClick={handleBack} className="cursor-pointer flex items-center gap-2.5 md:gap-3">
            <Logo />
          </div>
          <div className="flex items-center gap-2 md:gap-2.5">
            {user ? (
              <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-purple-300/70 hover:text-pink-400 hover:bg-white/5 transition-all duration-200 rounded-full px-3 md:px-3.5 border border-transparent hover:border-pink-500/30">
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-medium hidden lg:inline">Logout</span>
              </Button>
            ) : (
              <Link to="/auth?redirect=/premium">
                <Button variant="outline" size="sm" className="gap-2 text-xs font-medium border-purple-500/30 text-purple-300 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all duration-200 rounded-full px-3 md:px-3.5 shadow-sm">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-purple-300/70 hover:text-cyan-400 hover:bg-white/5 transition-all duration-200 rounded-full px-3 md:px-3.5 border border-transparent hover:border-cyan-500/30">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-12 relative z-10">
        {/* Hero Section - Synthwave Style */}
        <section className="text-center space-y-6 py-8">
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase">
              GSB <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">Premium</span>
            </h1>
            <p className="text-purple-300/70 text-sm md:text-base max-w-lg mx-auto">
              Unlock the full potential of your betting with expert analysis and real-time picks.
            </p>
          </div>
          {/* Decorative line */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-pink-500/40" />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" 
                     style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-cyan-500/40" />
          </div>
        </section>

        {/* Current Status (if active) */}
        {active && (
          <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Shield className="w-16 h-16 text-accent" />
              </div>
              <CardContent className="p-8 text-center space-y-4">
                <p className="text-accent font-display uppercase tracking-[0.2em] text-xs font-bold">Premium Active</p>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-4xl font-black">{daysLeft}</div>
                  <div className="text-left leading-tight">
                    <div className="text-sm font-bold">DAYS</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Remaining</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm">Push Notifications</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Get picks instantly</p>
                    </div>
                  </div>
                  <Switch 
                    checked={push.enabled} 
                    onCheckedChange={async (val) => {
                      try {
                        await push.setPushEnabled(val);
                        toast({ title: val ? "Enabled! 🔔" : "Disabled" });
                      } catch (e: any) {
                        toast({ title: "Error", description: e.message, variant: "destructive" });
                      }
                    }}
                    disabled={push.loading}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Features Grid */}
        <section className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {features.map((f, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl bg-card/30 border border-white/5 hover:border-white/10 transition-colors">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                {f.icon}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Pricing Plans */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase tracking-tight">Choose Your Plan</h2>
            <div className="h-1 w-12 bg-accent mx-auto mt-2 rounded-full" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.duration} 
                className={`relative bg-card border-white/5 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-accent/10 ${plan.popular ? 'ring-2 ring-accent shadow-xl shadow-accent/5' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                {plan.save && (
                  <div className="absolute top-4 left-4 bg-green-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">
                    {plan.save}
                  </div>
                )}
                <CardContent className="p-8 flex flex-col items-center text-center h-full">
                  <div className="space-y-1 mb-6">
                    <p className="font-display font-black text-sm uppercase tracking-widest text-muted-foreground">{plan.label}</p>
                    <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">{plan.days}</p>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-4xl font-black">{getPlanPrice(plan)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">{plan.perDay}</p>
                  </div>

                  <Button 
                    onClick={() => handleBuy(plan.duration, plan.paymentLink)} 
                    disabled={loading !== null} 
                    className={`w-full h-11 font-black uppercase tracking-widest text-[11px] mt-auto transition-all active:scale-95 ${
                      plan.popular 
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_20px_rgba(255,215,0,0.3)]' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {loading === plan.duration ? <Loader2 className="animate-spin" /> : "Get it now"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Restore Section (Native only) */}
        {Capacitor.isNativePlatform() && (
          <section className="text-center pt-8 border-t border-white/5">
            <p className="text-xs text-muted-foreground mb-4">Already have a subscription?</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRestore} 
              disabled={restoring}
              className="font-display uppercase tracking-widest text-[10px] h-9 border-white/10 hover:bg-white/5"
            >
              {restoring ? <Loader2 className="animate-spin w-3 h-3 mr-2" /> : <Smartphone className="w-3 h-3 mr-2" />}
              Restore Purchases
            </Button>
          </section>
        )}

        {/* Footer info */}
        <section className="text-center max-w-md mx-auto py-8 space-y-4">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Subscriptions are processed securely. Your premium access will be granted instantly across all your devices. 
            By subscribing, you agree to our <Link to="/terms" className="underline">Terms of Service</Link>.
          </p>
          <div className="flex flex-col items-center gap-1 opacity-30">
            <p className="text-[9px] font-black tracking-widest uppercase">App Version 12.0.0</p>
            <p className="text-[8px] font-bold">Build 1300</p>
          </div>
        </section>
      </main>
    </div>
    </PageTransition>
  );
}
