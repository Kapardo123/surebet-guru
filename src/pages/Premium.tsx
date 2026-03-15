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

const plans = [
  {
    duration: 7,
    label: "7 Days",
    price: "$7.99",
    perDay: "$1.14/day",
    popular: false,
    paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03",
  },
  {
    duration: 15,
    label: "15 Days",
    price: "$13.59",
    perDay: "$0.91/day",
    popular: true,
    save: "Save 20%",
    paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04",
  },
  {
    duration: 30,
    label: "30 Days",
    price: "$19.99",
    perDay: "$0.67/day",
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
  const [searchParams] = useSearchParams();
  const handledSessionRef = useRef<string | null>(null);

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

  const handleBuy = async (duration: number) => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }
    setLoading(duration);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { duration, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Payment Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
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

      <main className="container max-w-5xl mx-auto px-4 py-16 space-y-16">
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
          {plans.map((plan) => (
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
                  onClick={() => {
                    if (plan.paymentLink) {
                      window.open(plan.paymentLink, "_blank");
                    } else {
                      handleBuy(plan.duration);
                    }
                  }}
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
          ))}
        </div>

        <div className="flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" />
            <span className="text-xs">Secure payments via Stripe</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs">Cancel anytime</span>
          <div className="w-px h-4 bg-border" />
          <span className="text-xs">Instant access</span>
        </div>
      </main>
    </div>
    </PageTransition>
  );
};

export default Premium;
