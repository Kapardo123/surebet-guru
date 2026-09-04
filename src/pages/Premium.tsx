import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Crown, Loader2, LogIn, LogOut, Bell, Smartphone, Home, Crosshair, Layers } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

export default function Premium() {
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

  // Features: eksperci i wyselekcjonowane typy
  const features = [
    {
      icon: <Crown className="w-5 h-5 text-pink-400" />,
      title: "Hand-Picked by Experts",
      desc: "Every premium tip is selected and reviewed by our team of experienced betting analysts. No noise — only picks they truly believe in.",
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      title: "High-Value Selections",
      desc: "Quality over quantity. You get a small number of carefully researched picks instead of dozens of random bets.",
    },
    {
      icon: <Bell className="w-5 h-5 text-cyan-400" />,
      title: "Instant Push Alerts",
      desc: "Be first to know when a new premium tip or coupon drops — straight to your phone the moment it goes live.",
    },
    {
      icon: <Layers className="w-5 h-5 text-blue-400" />,
      title: "Exclusive Coupons & Hero Pick",
      desc: "Premium accumulators and the daily hero pick are reserved for members — higher odds, bigger combined value.",
    },
  ];

  const plans = [
    { duration: 7, label: "Weekly Pass", days: "7 Days", price: "$3.99", paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03", perDay: "$0.57/day" },
    { duration: 15, label: "Pro Access", days: "15 Days", price: "$6.99", popular: true, paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04", perDay: "$0.46/day", save: "Save 15%" },
    { duration: 30, label: "Monthly VIP", days: "30 Days", price: "$9.99", paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05", perDay: "$0.33/day", save: "Save 40%" },
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

      {/* Glass Header */}
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

        {/* Hero */}
        <section className="text-center space-y-6 py-6 md:py-10">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-600/20 border border-pink-500/30 shadow-lg shadow-pink-500/20 flex items-center justify-center rotate-3">
              <Crown className="w-8 h-8 text-pink-400" />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase">
              GSB <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">Premium</span>
            </h1>
            <p className="text-purple-300/70 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Hand-picked tips from our team of betting experts.
              <span className="text-white/70 font-semibold"> No noise, no filler</span> — only selections they truly stand behind.
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
            <div className="relative overflow-hidden rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/[0.08] via-purple-500/[0.06] to-transparent backdrop-blur-xl shadow-lg shadow-pink-500/10">
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />
              <div className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-600/20 ring-1 ring-pink-500/30 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-pink-400" />
                  </div>
                  <div>
                    <p className="font-display text-xs font-black uppercase tracking-[0.2em] text-pink-400">Premium Active</p>
                    <p className="text-[10px] text-white/40 mt-1">Full access unlocked on all devices</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-pink-300">{daysLeft}</div>
                  <div className="text-[9px] text-white/40 uppercase tracking-[0.25em] font-bold">days left</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/30 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm">Push Notifications</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">New tips straight to your phone</p>
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
            </div>
          </div>
        )}

        {/* Features */}
        <section className="grid gap-4 md:gap-5 md:grid-cols-2 max-w-3xl mx-auto">
          {features.map((f, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-pink-500/25 hover:bg-white/[0.05] transition-all duration-300 group">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="flex gap-4">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/[0.08] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  {f.icon}
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-sm text-white">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Pricing */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Choose Your Plan</h2>
            <p className="text-xs text-muted-foreground">Instant access · cancel anytime · works on all devices</p>
            <div className="h-[2px] w-16 mx-auto rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500" />
          </div>

          <div className="grid gap-5 md:gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.duration}
                className={`relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular
                    ? "border border-pink-500/40 bg-gradient-to-b from-pink-500/[0.08] to-transparent shadow-xl shadow-pink-500/10"
                    : "border border-white/[0.07] bg-white/[0.03] hover:border-white/15"
                } backdrop-blur-xl`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-lg shadow-pink-500/30">
                    Most Popular
                  </div>
                )}
                {plan.save && (
                  <div className={`absolute top-3 left-3 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    plan.popular ? "bg-pink-500/15 text-pink-300 border-pink-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  }`}>
                    {plan.save}
                  </div>
                )}
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500/60 to-transparent" />
                <div className="p-7 flex flex-col items-center text-center h-full space-y-5">
                  <div className="space-y-1">
                    <p className="font-display font-black text-xs uppercase tracking-[0.25em] text-white/50">{plan.label}</p>
                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-[0.3em]">{plan.days}</p>
                    <div className="flex items-baseline justify-center gap-1 mt-3">
                      <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">{getPlanPrice(plan)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">{plan.perDay}</p>
                  </div>

                  <ul className="space-y-2 w-full text-left">
                    {["All premium tips", "Premium coupons & hero pick", "Push notifications"].map(( perk ) => (
                      <li key={perk} className="flex items-center gap-2 text-[11px] text-white/60">
                        <CheckIcon />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleBuy(plan.duration, plan.paymentLink)}
                    disabled={loading !== null}
                    className={`w-full h-11 font-black uppercase tracking-widest text-[11px] mt-auto transition-all active:scale-95 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 shadow-[0_0_24px_rgba(236,72,153,0.35)]'
                        : 'bg-white/[0.07] text-white border border-white/10 hover:bg-white/[0.12]'
                    }`}
                  >
                    {loading === plan.duration ? <Loader2 className="animate-spin" /> : "Get it now"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Restore (Native only) */}
        {Capacitor.isNativePlatform() && (
          <section className="text-center pt-6 border-t border-white/5">
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
        <section className="text-center max-w-md mx-auto pb-8 space-y-4">
          <div className="flex items-center justify-center gap-6 text-[9px] uppercase tracking-widest text-white/25 font-bold">
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Secure payment</span>
            <span className="flex items-center gap-1.5"><Crosshair className="w-3 h-3" /> Expert picks</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Payments are processed securely by Stripe. Premium access is granted instantly across all your devices.
            By subscribing you agree to our <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>.
          </p>
        </section>
      </main>
    </div>
    </PageTransition>
  );
}

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-pink-400 flex-shrink-0"><path d="M20 6 9 17l-5-5" /></svg>
);