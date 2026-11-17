import { useState, useEffect } from "react";
import { Loader2, LogIn, ArrowLeft, User } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppHeader, { headerLink } from "@/components/AppHeader";
import SectionHead from "@/components/SectionHead";
import PressPass from "@/components/PressPass";
import { numberFromId } from "@/components/Barcode";
import { PenNote } from "@/components/RedPen";
import PageTransition from "@/components/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { getOfferings, purchasePackage, presentPaywall, restorePurchases } from "@/integrations/revenuecat";

export default function Premium() {
  // v1.9.5
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh, expiresAt } = usePremiumStatus();
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
  const handle = user?.email?.split("@")[0] ?? null;
  const memberNo = user ? numberFromId(user.id) : null;

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-14">
      <AppHeader
        right={
          <>
            {user ? (
              <Link to="/account" className={headerLink}>
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Account</span>
              </Link>
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

      <main className="max-w-xl mx-auto px-4 pt-7 space-y-12">
        <section>
          <SectionHead tone="red">Membership</SectionHead>
          <h1 className="font-display font-black uppercase text-[clamp(56px,17vw,96px)] leading-[0.82] tracking-[-0.01em] mt-4 text-foreground">
            {active ? <>You're<br />on the<br />inside.</> : <>Get the<br />full card.</>}
          </h1>
          <p className="font-serif text-[19px] leading-[1.5] text-secondary-foreground mt-4">
            {active
              ? "Every selection we publish is open to you, reasoning and all. Here's your pass."
              : "Members read every selection we publish, with the reasoning behind it, and hear about each new pick the moment it goes up."}
          </p>
        </section>

        <section className="pt-6">
          <PressPass issued={active} name={handle} memberNo={memberNo} validUntil={expiresAt} daysLeft={daysLeft} />
          {!active && (
            <p className="text-center mt-1">
              <PenNote rotate={-3} delay={0.8} className="text-[28px]">yours from {getPlanPrice(plans[0])} ↓</PenNote>
            </p>
          )}
        </section>

        {active && (
          <section className="border-y-[3px] border-foreground py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.06em]">Push notifications</p>
              <p className="font-serif italic text-[16px] text-muted-foreground mt-0.5">A ping for each new members' pick</p>
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
              className="data-[state=checked]:bg-red"
            />
          </section>
        )}

        {!active && (
          <section>
            <SectionHead>Two copies of the same page</SectionHead>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[false, true].map((member) => (
                <div
                  key={String(member)}
                  className={`relative p-3 pt-4 ${member ? "bg-card shadow-[0_2px_0_hsl(var(--foreground))] border-[1.5px] border-foreground" : "border-[1.5px] border-dashed border-foreground/40"}`}
                >
                  <p className={`absolute -top-2.5 left-2 px-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] ${member ? "bg-foreground text-background" : "bg-background text-muted-foreground"}`}>
                    {member ? "Member's copy" : "Free copy"}
                  </p>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">La Liga · 21:00</p>
                  <p className="font-display font-extrabold uppercase text-[20px] leading-[1.02] mt-1">Real Betis<br />Sevilla</p>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-red mt-2">Our pick</p>
                  {member ? (
                    <>
                      <p className="font-serif font-semibold text-[16px] leading-tight">Betis to win</p>
                      <p className="num font-black text-[30px] leading-none mt-1">2.40</p>
                      <p className="font-serif text-[13px] leading-snug text-secondary-foreground mt-1.5">
                        Betis have taken points from four of the last five derbies at home…
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="redact w-[85%] h-[1.05em] mt-1" />
                      <p className="num font-black text-[30px] leading-none mt-1 text-foreground/20">?.??</p>
                      <span className="block redact w-full mt-2 opacity-15" />
                      <span className="block redact w-[80%] mt-1 opacity-15" />
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="label mt-2.5">Illustration. Not a live selection.</p>
          </section>
        )}

        <section>
          <SectionHead>What you get</SectionHead>
          <ol className="mt-3 divide-y divide-foreground/20">
            {features.map((f, i) => (
              <li key={f} className="grid grid-cols-[40px_1fr] py-3">
                <span className="font-display font-black text-[24px] leading-none text-red">{roman[i]}</span>
                <span className="font-serif text-[18px] leading-snug text-foreground">{f}</span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionHead>{active ? "Extend your pass" : "Rates"}</SectionHead>
          <div className="mt-4 space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.duration}
                onClick={() => handleBuy(plan.duration, plan.paymentLink)}
                disabled={loading !== null}
                className={`group relative w-full text-left px-4 py-4 transition-transform active:translate-y-px disabled:opacity-60 ${
                  plan.popular
                    ? "bg-foreground text-background shadow-[4px_4px_0_hsl(var(--red))]"
                    : "bg-card border-[1.5px] border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]"
                }`}
              >
                {plan.popular && (
                  <span
                    className="absolute -top-3.5 right-3 font-display font-black uppercase text-[17px] leading-none px-2 pt-1 pb-0.5 border-[2.5px] border-red text-red bg-background rotate-[6deg]"
                  >
                    Best value
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="font-display font-black uppercase text-[34px] leading-none shrink-0">{plan.days}</span>
                  <span className={`leader ${plan.popular ? "!border-background/50" : ""}`} />
                  {loading === plan.duration ? (
                    <Loader2 className="w-6 h-6 animate-spin self-center" />
                  ) : (
                    <span className="num font-black text-[38px] leading-none shrink-0">{getPlanPrice(plan)}</span>
                  )}
                </div>
                <div className={`mt-2 flex items-center justify-between gap-3 font-mono text-[12px] uppercase tracking-[0.05em] ${plan.popular ? "text-background/75" : "text-muted-foreground"}`}>
                  <span>{plan.label} · {plan.perDay}</span>
                  {plan.save && <span className={`font-semibold ${plan.popular ? "text-background" : "text-red"}`}>{plan.save}</span>}
                </div>
              </button>
            ))}
          </div>
          {!user && (
            <p className="mt-4 font-serif italic text-[16px] text-muted-foreground">You'll be asked to sign in before paying.</p>
          )}
        </section>

        {Capacitor.isNativePlatform() && (
          <section className="flex items-center justify-between gap-4 border-t border-foreground pt-4">
            <p className="font-serif italic text-[17px] text-secondary-foreground">Already a member?</p>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center gap-2 h-10 px-3 border-[1.5px] border-foreground font-mono text-[12px] font-semibold uppercase tracking-[0.06em] disabled:opacity-60"
            >
              {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Restore purchases
            </button>
          </section>
        )}

        <footer className="border-t-[3px] border-foreground pt-3 space-y-2">
          <p className="font-serif text-[15px] leading-relaxed text-secondary-foreground">
            Payments are processed securely. Access is granted straight away on every device you sign in on.
            By subscribing you agree to our <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link>.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">App version 21.0.0 · Build 2100</p>
        </footer>
      </main>
    </div>
    </PageTransition>
  );
}
