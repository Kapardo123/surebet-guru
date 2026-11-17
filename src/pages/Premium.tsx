import { useState, useEffect } from "react";
import { Loader2, LogIn, LogOut, ArrowLeft } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppHeader, { headerLink } from "@/components/AppHeader";
import SectionHead from "@/components/SectionHead";
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

  const roman = ["I", "II", "III", "IV"];

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-12">
      <AppHeader
        right={
          <>
            {user ? (
              <button onClick={signOut} className={headerLink}>
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            ) : (
              <Link to="/auth?redirect=/premium" className={headerLink}>
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </Link>
            )}
            <button onClick={handleBack} className={headerLink}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Tips
            </button>
          </>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-7 space-y-10">
        <section>
          <SectionHead tone="red">Membership</SectionHead>
          <h1 className="font-display font-black uppercase text-[clamp(52px,16vw,88px)] leading-[0.84] tracking-[-0.01em] mt-4 text-foreground">
            Get the<br />full card.
          </h1>
          <p className="font-serif text-[18px] leading-[1.5] text-secondary-foreground mt-4">
            Members read every selection we publish, with the reasoning behind it, and hear about each new pick the moment it goes up.
          </p>
        </section>

        {active && (
          <section className="bg-foreground text-background p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] opacity-70">Membership card</p>
                <p className="font-display font-black uppercase text-[30px] leading-none mt-2">Active</p>
              </div>
              <div className="text-right">
                <p className="num font-black text-[56px] leading-[0.8]">{daysLeft}</p>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] opacity-70 mt-1">days left</p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-background/25 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.1em]">Push notifications</p>
                <p className="font-serif italic text-[14px] opacity-70 mt-0.5">A ping for each new members' pick</p>
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
                className="data-[state=unchecked]:bg-background/30 data-[state=checked]:bg-red"
              />
            </div>
          </section>
        )}

        <section>
          <SectionHead>What you get</SectionHead>
          <ol className="mt-3 divide-y divide-foreground/20">
            {features.map((f, i) => (
              <li key={f} className="grid grid-cols-[36px_1fr] py-2.5">
                <span className="font-serif italic text-[17px] text-red">{roman[i]}.</span>
                <span className="font-serif text-[17px] leading-snug text-foreground">{f}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionHead>{active ? "Extend" : "Rates"}</SectionHead>
          <div className="mt-2">
            {plans.map((plan) => (
              <button
                key={plan.duration}
                onClick={() => handleBuy(plan.duration, plan.paymentLink)}
                disabled={loading !== null}
                className={`w-full text-left px-3 -mx-3 py-4 border-b border-foreground/25 transition-colors disabled:opacity-60 ${
                  plan.popular ? "bg-foreground text-background" : "hover:bg-secondary/60"
                }`}
                style={{ width: "calc(100% + 1.5rem)" }}
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-black uppercase text-[28px] leading-none shrink-0">{plan.days}</span>
                  <span className={`leader ${plan.popular ? "!border-background/50" : ""}`} />
                  {loading === plan.duration ? (
                    <Loader2 className="w-5 h-5 animate-spin self-center" />
                  ) : (
                    <span className="num font-black text-[32px] leading-none shrink-0">{getPlanPrice(plan)}</span>
                  )}
                </div>
                <div className={`mt-1.5 flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.1em] ${plan.popular ? "text-background/70" : "text-muted-foreground"}`}>
                  <span>{plan.label} · {plan.perDay}</span>
                  {plan.popular ? (
                    <span className="text-background font-semibold">Readers' choice</span>
                  ) : plan.save ? (
                    <span className="text-red font-semibold">{plan.save}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
          {!user && (
            <p className="mt-3 font-serif italic text-[15px] text-muted-foreground">You'll be asked to sign in before paying.</p>
          )}
        </section>

        {Capacitor.isNativePlatform() && (
          <section className="flex items-center justify-between gap-4 border-t border-foreground pt-4">
            <p className="font-serif italic text-[16px] text-secondary-foreground">Already a member?</p>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center gap-2 h-9 px-3 border-[1.5px] border-foreground font-mono text-[11px] font-semibold uppercase tracking-[0.1em] disabled:opacity-60"
            >
              {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Restore purchases
            </button>
          </section>
        )}

        <footer className="border-t-[3px] border-foreground pt-3 space-y-2">
          <p className="font-serif text-[14px] leading-relaxed text-secondary-foreground">
            Payments are processed securely. Access is granted straight away on every device you sign in on.
            By subscribing you agree to our <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link>.
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">App version 21.0.0 · Build 2100</p>
        </footer>
      </main>
    </div>
    </PageTransition>
  );
}
