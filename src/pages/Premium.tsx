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
import { PLANS, usd, perDay, saving, SINGLE_TIP_CENTS } from "@/lib/pricing";
import { startPlanCheckout, verifyCheckout } from "@/lib/tipUnlocks";

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

  // Back from Stripe Checkout: confirm the session and grant the pass.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId || searchParams.get("success") !== "true" || !user) return;
    setConfirming(true);
    verifyCheckout(sessionId)
      .then(async () => {
        await refresh();
        toast({ title: "Welcome to Gold", description: "Every card is face up now." });
      })
      .catch((e) => toast({ title: "Payment not confirmed yet", description: e.message, variant: "destructive" }))
      .finally(() => {
        setConfirming(false);
        navigate("/premium", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

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

  const handleBuy = async (duration: number) => {
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
      } else {
        // Web: Stripe Checkout created server-side, so the charged amount
        // always matches PLAN_CENTS in the create-payment function.
        await startPlanCheckout(duration);
      }
    } catch (e: any) {
      console.error("Purchase error", e);
      toast({ title: "Checkout unavailable", description: e?.message, variant: "destructive" });
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

  const plans = PLANS.map((p) => ({ ...p, price: usd(p.cents), perDay: perDay(p), save: saving(p) }));

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

      {confirming && (
        <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4">
          <div className="flex items-center gap-2 h-11 px-4 rounded-full bg-card border border-white/10 shadow-xl text-[14px] font-semibold">
            <Loader2 className="w-4 h-4 animate-spin" /> Confirming your payment…
          </div>
        </div>
      )}

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
                badge={plan.popular ? "Most popular" : plan.save}
                featured={plan.popular}
                loading={loading === plan.duration}
                disabled={loading !== null}
                onClick={() => handleBuy(plan.duration)}
              />
            ))}
          </div>
          {!user && (
            <p className="mt-4 text-[14px] text-muted-foreground text-center">You'll be asked to sign in before paying.</p>
          )}

          {/* Single-card option */}
          <Link
            to="/"
            className="mt-6 flex items-center gap-4 rounded-[20px] border border-dashed border-white/15 bg-white/[0.03] p-4 active:scale-[0.99] transition-transform"
          >
            <span className="relative shrink-0 w-12 h-16 rounded-[8px] p-[3px] foil-gold -rotate-6 shadow-[0_8px_16px_-6px_rgba(0,0,0,.7)]">
              <span className="block h-full rounded-[5px] card-back" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold">Just one card?</span>
              <span className="block text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                Tap any locked Gold card to unlock it on its own.
              </span>
            </span>
            <span className="shrink-0 h-9 px-3 rounded-full bg-primary text-primary-foreground grid place-items-center num font-black text-[14px]">
              {usd(SINGLE_TIP_CENTS)}
            </span>
          </Link>
        </section>

        {!active && (
          <section>
            <h2 className="font-display font-black uppercase text-[20px] tracking-[-0.02em] text-center">Same card, two sides</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[false, true].map((member) => (
                <div key={String(member)} className="pointer-events-none min-w-0">
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
