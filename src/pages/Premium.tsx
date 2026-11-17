import { useState, useEffect } from "react";
import { Check, Loader2, LogIn, LogOut, ArrowLeft } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

export default function Premium() {
  // v1.9.5
  const { user, signOut, loading: authLoading } = useAuth();
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

  const features = [
    "Every premium tip and coupon, the moment it is posted",
    "Pick of the day without watching an ad",
    "Push notification for each new premium pick",
    "Full written analysis behind every selection",
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const linkBtn = "inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-secondary-foreground hover:text-foreground hover:bg-secondary";

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-12">
      <AppHeader
        right={
          <>
            {user ? (
              <button onClick={signOut} className={linkBtn}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <Link to="/auth?redirect=/premium" className={linkBtn}>
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
            )}
            <button onClick={handleBack} className={linkBtn}>
              <ArrowLeft className="w-4 h-4" />
              Tips
            </button>
          </>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-8 space-y-10">
        <section>
          <p className="eyebrow text-gold">GSB Premium</p>
          <h1 className="font-display font-semibold uppercase text-[44px] leading-[0.95] tracking-[0.005em] mt-3 text-foreground">
            Every pick.<br />No ads.
          </h1>
          <p className="text-[15px] leading-relaxed text-secondary-foreground mt-4">
            Unlock the premium tips and accumulators, read the reasoning behind each one and get a ping as soon as a new pick goes up.
          </p>
        </section>

        {active && (
          <section className="rounded-xl border border-gold/30 bg-card divide-y divide-border">
            <div className="flex items-end justify-between px-4 py-4">
              <div>
                <p className="eyebrow text-gold">Active</p>
                <p className="text-sm text-secondary-foreground mt-2">Your membership runs for</p>
              </div>
              <p className="num text-[40px] font-semibold leading-none text-foreground">
                {daysLeft}<span className="text-lg text-muted-foreground ml-1">days</span>
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">Push notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get new premium picks instantly</p>
              </div>
              <Switch
                checked={push.enabled}
                onCheckedChange={async (val) => {
                  try {
                    await push.setPushEnabled(val);
                    toast({ title: val ? "Notifications on" : "Notifications off" });
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  }
                }}
                disabled={push.loading}
              />
            </div>
          </section>
        )}

        <section>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex gap-3 text-[15px] text-foreground">
                <Check className="w-5 h-5 text-primary shrink-0 mt-px" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display font-semibold uppercase text-2xl tracking-[0.01em]">
            {active ? "Extend your access" : "Choose a pass"}
          </h2>
          {plans.map((plan) => (
            <button
              key={plan.duration}
              onClick={() => handleBuy(plan.duration, plan.paymentLink)}
              disabled={loading !== null}
              className={`w-full text-left rounded-xl border bg-card px-4 py-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60 ${
                plan.popular ? "border-gold/60" : "border-border hover:border-muted-foreground/40"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-foreground">{plan.days}</span>
                  {plan.popular && (
                    <span className="h-5 px-1.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] bg-gold text-accent-foreground inline-flex items-center">
                      Most popular
                    </span>
                  )}
                  {plan.save && !plan.popular && (
                    <span className="h-5 px-1.5 rounded text-[11px] font-semibold uppercase tracking-[0.06em] text-success bg-success/10 inline-flex items-center">
                      {plan.save}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{plan.label} · {plan.perDay}</p>
              </div>
              <span className="flex items-center gap-3 shrink-0">
                {loading === plan.duration ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <span className="num text-[28px] font-semibold leading-none text-foreground">{getPlanPrice(plan)}</span>
                )}
              </span>
            </button>
          ))}
          {!user && (
            <p className="text-xs text-muted-foreground">You will be asked to sign in before paying.</p>
          )}
        </section>

        {Capacitor.isNativePlatform() && (
          <section className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <p className="text-sm text-secondary-foreground">Already subscribed?</p>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border text-sm font-medium text-foreground disabled:opacity-60"
            >
              {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
              Restore purchases
            </button>
          </section>
        )}

        <footer className="text-xs leading-relaxed text-muted-foreground border-t border-border pt-5 space-y-2">
          <p>
            Payments are processed securely. Access is granted straight away on every device you sign in on.
            By subscribing you agree to our <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link>.
          </p>
          <p className="text-muted-foreground/60">App version 21.0.0 · Build 2100</p>
        </footer>
      </main>
    </div>
    </PageTransition>
  );
}
