import { useState, useEffect } from "react";
import { Loader2, LogIn, ArrowLeft, User, Check } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AppHeader, { headerLink } from "@/components/AppHeader";
import TipCard, { Tip } from "@/components/TipCard";
import BoosterPack from "@/components/BoosterPack";
import MemberCard from "@/components/MemberCard";
import { numberFromId } from "@/components/Barcode";
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

  const handle = user?.email?.split("@")[0] ?? null;
  const memberNo = user ? numberFromId(user.id) : null;
  const tiers = ["bronze", "silver", "gold"] as const;
  const sample: Tip = {
    id: -1, sport: "Football", league: "La Liga", homeTeam: "Real Betis", awayTeam: "Sevilla",
    prediction: "Betis to win", odds: 2.4, kickoff: new Date(Date.now() + 3 * 3600e3).toISOString(),
    status: "upcoming", isPremium: true,
  };

  return (
    <PageTransition>
    <div className="min-h-screen pb-16">
      <AppHeader
        right={
          <>
            {user ? (
              <Link to="/account" className={headerLink}>
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
              </Link>
            ) : (
              <Link to="/auth?redirect=/premium" className={headerLink}>
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
            )}
            <button onClick={handleBack} className={headerLink}>
              <ArrowLeft className="w-4 h-4" />
              Cards
            </button>
          </>
        }
      />

      <main className="max-w-xl mx-auto px-4 pt-7 space-y-12">
        <section className="text-center">
          <p className="label foil-gold-text">GSB Gold</p>
          <h1 className="font-display font-black uppercase text-[36px] leading-[1] tracking-[-0.03em] mt-2">
            {active ? <>Your deck is<br /><span className="foil-gold-text">all gold.</span></> : <>Turn every card<br /><span className="foil-gold-text">face up.</span></>}
          </h1>
          <p className="text-[16.5px] leading-relaxed text-muted-foreground mt-3 max-w-sm mx-auto">
            {active
              ? "Every Gold card and sealed set is open to you, analysis included."
              : "Gold members see every premium pick and sealed set the moment it lands, with the full analysis on the back."}
          </p>
        </section>

        <section>
          <MemberCard issued={active} name={handle} memberNo={memberNo} validUntil={expiresAt} daysLeft={daysLeft} />
        </section>

        {active && (
          <section className="rounded-[20px] bg-white/[0.05] border border-white/[0.07] px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold">New card alerts</p>
              <p className="text-[13.5px] text-muted-foreground mt-0.5">A push notification for every Gold pick</p>
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
          </section>
        )}

        <section>
          <h2 className="font-display font-black uppercase text-[20px] tracking-[-0.02em] text-center">
            {active ? "Top up your pass" : "Pick a pack"}
          </h2>
          <div className="mt-8 grid grid-cols-3 gap-2.5 items-end">
            {[plans[0], plans[1], plans[2]].map((plan, i) => (
              <BoosterPack
                key={plan.duration}
                tier={tiers[i]}
                days={plan.days}
                price={getPlanPrice(plan)}
                perDay={plan.perDay}
                badge={plan.popular ? "Best value" : plan.save}
                featured={plan.popular}
                loading={loading === plan.duration}
                disabled={loading !== null}
                onClick={() => handleBuy(plan.duration, plan.paymentLink)}
              />
            ))}
          </div>
          {!user && (
            <p className="mt-4 text-[14px] text-muted-foreground text-center">You'll be asked to sign in before paying.</p>
          )}
        </section>

        {!active && (
          <section>
            <h2 className="font-display font-black uppercase text-[20px] tracking-[-0.02em] text-center">Same card, two sides</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[false, true].map((member) => (
                <div key={String(member)} className="pointer-events-none">
                  <p className="text-center label mb-2">{member ? "Gold member" : "Free reader"}</p>
                  <TipCard tip={member ? { ...sample, description: undefined } : sample} userIsPremium={member} />
                </div>
              ))}
            </div>
            <p className="text-center text-[12.5px] text-muted-foreground mt-3">Illustration only, not a live pick.</p>
          </section>
        )}

        <section className="rounded-[20px] bg-white/[0.04] border border-white/[0.07] p-5">
          <h2 className="font-display font-black uppercase text-[16px] tracking-[-0.01em]">In every pack</h2>
          <ul className="mt-3 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex gap-3 text-[15.5px] leading-snug">
                <span className="shrink-0 w-6 h-6 rounded-full foil-gold grid place-items-center">
                  <Check className="w-3.5 h-3.5 text-stock-ink" strokeWidth={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        {Capacitor.isNativePlatform() && (
          <section className="flex items-center justify-between gap-4">
            <p className="text-[15px] text-muted-foreground">Already a member?</p>
            <button
              onClick={handleRestore}
              disabled={restoring}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/[0.08] text-[14px] font-semibold disabled:opacity-60"
            >
              {restoring && <Loader2 className="w-4 h-4 animate-spin" />}
              Restore purchases
            </button>
          </section>
        )}

        <footer className="space-y-2 text-center">
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Payments are processed securely. Access is granted straight away on every device you sign in on.
            By subscribing you agree to our <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link>.
          </p>
          <p className="text-[12px] text-muted-foreground/60">App version 21.0.0 · Build 2100</p>
        </footer>
      </main>
    </div>
    </PageTransition>
  );
}
