import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, Zap, Shield, TrendingUp, Star, Loader2, LogIn, LogOut } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

const plans = [
  {
    duration: 7,
    label: "7 Days",
    price: "$3.99",
    perDay: "$0.57/day",
    popular: false,
    paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03",
  },
  {
    duration: 15,
    label: "15 Days",
    price: "$6.99",
    perDay: "$0.47/day",
    popular: true,
    save: "Save 18%",
    paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04",
  },
  {
    duration: 30,
    label: "30 Days",
    price: "$9.99",
    perDay: "$0.33/day",
    popular: false,
    save: "Best Value",
    paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05",
  },
];

const features = [
  { text: "Access all Premium picks", icon: Crown },
  { text: "Highest confidence tips", icon: TrendingUp },
  { text: "Early access to picks", icon: Zap },
  { text: "Exclusive match analysis", icon: Star },
];

const Premium = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState<number | null>(null);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchRC = async () => {
      if (Capacitor.getPlatform() !== 'web') {
        const offerings = await getOfferings();
        if (offerings) setRcOfferings(offerings);
      }
    };
    fetchRC();
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");

    if (success !== "true" || !sessionId || handledSessionRef.current === sessionId) {
      return;
    }

    handledSessionRef.current = sessionId;

    const verifyAndActivate = async () => {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { sessionId },
      });

      if (error || data?.error) {
        toast({
          title: "Payment Error",
          description: data?.error || error?.message || "Could not verify payment",
          variant: "destructive",
        });
        return;
      }

      await refresh();

      toast({
        title: "Premium Activated! 🎉",
        description: "Payment confirmed and added to your account.",
      });

      navigate("/premium", { replace: true });
    };

    verifyAndActivate();
  }, [navigate, refresh, searchParams, toast]);

  const handleBuy = async (duration: number, paymentLink?: string) => {
    console.log('Kliknięto przycisk zakupu:', duration);
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase premium access.",
      });
      navigate("/auth?redirect=/premium");
      return;
    }

    setLoading(duration);
    
    try {
      // 1. Obsługa Płatności Natywnych (RevenueCat / Google Play)
      if (Capacitor.getPlatform() !== 'web') {
        console.log('Platforma mobilna wykryta, sprawdzam ofertę RC...');
        
        // POKAZUJEMY PAYWALL REVENUECAT - To najpewniejsza metoda na Androidzie
        console.log('Uruchamiam presentPaywall()...');
        toast({
          title: "Connecting...",
          description: "Opening secure payment window...",
        });

        try {
          const info = await presentPaywall();
          
          if (info) {
            console.log('Paywall zwrócił info - sukces!');
            toast({
              title: "Success! 🎉",
              description: "Premium access granted via Google Play.",
            });
            await refresh();
            return;
          } else {
            console.log('Paywall zamknięty bez zakupu lub wystąpił błąd');
            // Próba zakupu bezpośredniego jeśli paywall nie zadziałał
            if (rcOfferings?.current) {
              let rcPackage = null;
              if (duration === 7) rcPackage = rcOfferings.current.weekly;
              else if (duration === 30) rcPackage = rcOfferings.current.monthly;
              else if (duration === 15) {
                rcPackage = rcOfferings.current.availablePackages.find((p: any) => 
                  p.identifier.includes('15') || p.identifier.includes('half')
                );
              }

              if (rcPackage) {
                const directInfo = await purchasePackage(rcPackage);
                if (directInfo) {
                  toast({
                    title: "Success! 🎉",
                    description: `Premium access granted for ${duration} days.`,
                  });
                  await refresh();
                  return;
                }
              }
            }
          }
        } catch (e: any) {
          console.error('Błąd RevenueCat:', e);
          // WYŚWIETLAMY DOKŁADNY BŁĄD UŻYTKOWNIKOWI
          toast({
            title: "RevenueCat Error",
            description: e.message || "Unknown error from RevenueCat",
            variant: "destructive",
          });
          // Dodatkowy alert dla pewności, że błąd zostanie zauważony
          alert("Błąd RevenueCat: " + (e.message || JSON.stringify(e)));
        }
        return;
      }

      // 2. Obsługa Płatności Webowych (Stripe)
      console.log('Platforma webowa, przekierowanie do Stripe:', paymentLink);
      if (paymentLink) {
        window.location.href = `${paymentLink}?client_reference_id=${user.id}&customer_email=${encodeURIComponent(user.email || "")}`;
      }
    } catch (error: any) {
      console.error('Błąd podczas procesowania zakupu:', error);
      toast({
        title: "Store Error",
        description: error.message || "Could not open payment window. Check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }

    setLoading(0); // 0 to indicate restore loading
    try {
      const info = await restorePurchases();
      if (info && Object.keys(info.entitlements.active).length > 0) {
        toast({
          title: "Purchases Restored! 🎉",
          description: "Your premium access has been successfully restored.",
        });
        await refresh();
      } else {
        toast({
          title: "No active purchases found",
          description: "We couldn't find any active premium subscriptions for your account.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error restoring purchases:', error);
      toast({
        title: "Error",
        description: "Failed to restore purchases. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const getPlanDetails = (plan: any) => {
    // Jeśli jesteśmy na urządzeniu mobilnym i mamy dane z RevenueCat, użyj ich cen i etykiet
    if (Capacitor.getPlatform() !== 'web' && rcOfferings?.current) {
      let rcPackage = null;
      if (plan.duration === 7) rcPackage = rcOfferings.current.weekly;
      else if (plan.duration === 30) rcPackage = rcOfferings.current.monthly;
      else if (plan.duration === 15) {
        rcPackage = rcOfferings.current.availablePackages.find((p: any) => 
          p.identifier.includes('15') || p.identifier.includes('half')
        );
      }

      if (rcPackage) {
        return {
          ...plan,
          price: rcPackage.product.priceString,
          // Jeśli RevenueCat ma cenę za dzień w obiekcie produktu, moglibyśmy ją tu wyliczyć
        };
      }
    }
    return plan;
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth?redirect=/premium">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
            )}
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-16 space-y-16">
        {active && (
          <div className="flex items-center justify-center gap-3 bg-gradient-to-r from-accent/15 to-primary/15 border border-accent/30 rounded-2xl p-5 text-center">
            <Crown className="w-6 h-6 text-accent" />
            <div>
              <p className="font-display font-bold text-foreground text-lg">Premium Active</p>
              <p className="text-sm text-muted-foreground">
                <span className="text-accent font-bold">{daysLeft}</span> days remaining
              </p>
            </div>
          </div>
        )}

        <div className="text-center space-y-6 relative">
          <div className="absolute inset-0 -z-10">
            <div className="w-96 h-96 bg-accent/8 rounded-full blur-[120px] mx-auto -translate-y-1/3" />
          </div>
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center gradient-border">
              <Crown className="w-10 h-10 text-accent" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-3">
              <span className="text-gradient">Go Premium</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
              Unlock exclusive picks from our top analysts and maximize your winning potential
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map(({ text, icon: Icon }) => (
            <div key={text} className="flex flex-col items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-5 card-glow text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm text-foreground font-medium leading-snug">{text}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const plan = getPlanDetails(p);
            return (
              <Card
                key={plan.duration}
                className={`bg-card border-border/50 card-glow relative overflow-hidden ${
                  plan.popular ? "gradient-border ring-1 ring-accent/20 scale-[1.02] md:scale-105" : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-center py-1.5 text-xs font-display font-bold uppercase tracking-[0.15em] flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    Most Popular
                  </div>
                )}
                <CardContent className={`p-8 text-center space-y-6 ${plan.popular ? "pt-12" : ""}`}>
                  <div className="space-y-1">
                    <p className="font-display text-lg font-bold text-foreground">{plan.label}</p>
                    <p className="text-xs text-muted-foreground">{plan.perDay}</p>
                  </div>

                  <div className="space-y-0">
                    <p className="font-display text-5xl font-bold text-foreground tracking-tight">{plan.price}</p>
                    {plan.save && (
                      <span className="inline-block mt-2 text-[10px] font-display font-bold uppercase tracking-wider bg-primary/15 text-primary px-2.5 py-0.5 rounded-full">
                        {plan.save}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleBuy(plan.duration, plan.paymentLink)}
                    disabled={loading !== null}
                    className={`w-full gap-2 h-11 font-display uppercase tracking-wider text-xs ${
                      plan.popular
                        ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 shadow-lg shadow-accent/20"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {loading === plan.duration ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4" />
                    )}
                    {loading === plan.duration ? "Processing..." : "Get Premium"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span className="text-xs">
              {Capacitor.getPlatform() === 'web' 
                ? "Secure payments via Stripe" 
                : "Secure payments via App Store / Google Play"}
            </span>
          </div>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs">Cancel anytime</span>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs">Instant access</span>
        </div>

        {Capacitor.getPlatform() !== 'web' && (
          <div className="flex justify-center mt-4">
            <Button 
              variant="link" 
              onClick={handleRestore}
              className="text-xs text-muted-foreground hover:text-accent font-normal"
              disabled={loading !== null}
            >
              Restore Purchases
            </Button>
          </div>
        )}
      </main>
    </div>
    </PageTransition>
  );
};

export default Premium;
