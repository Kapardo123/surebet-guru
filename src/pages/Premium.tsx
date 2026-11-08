import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { getOfferings, purchasePackage, restorePurchases } from "@/integrations/revenuecat";
import { Switch } from "@/components/ui/switch";
import { Gem, Check, Shield, Smartphone, Loader2, Bell, LogIn } from "@/components/icons/gsb";

interface Plan {
  duration: number;
  label: string;
  webPrice: string;
  paymentLink: string;
}

// Prices mirror the Stripe price map in create-payment (one-time, non-renewing).
const PLANS: Plan[] = [
  { duration: 7, label: "7 days", webPrice: "$3.99", paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03" },
  { duration: 15, label: "15 days", webPrice: "$6.99", paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04" },
  { duration: 30, label: "30 days", webPrice: "$9.99", paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05" },
];

const BENEFITS = [
  "All premium tips unlocked",
  "Premium accumulators",
  "Expert match analyses",
  "Push alerts for new tips",
];

/** Extract amount + currency token from a store price string (e.g. "$3.99", "3,99 €"). */
const parsePrice = (value?: string | null): { amount: number; symbol: string } | null => {
  if (!value) return null;
  const raw = String(value).trim();
  const m = raw.match(/([^\d]*?)(\d[\d.,\s]*)([^\d]*)$/);
  if (!m) return null;
  const prefix = m[1].trim();
  const suffix = m[3].trim();
  const numeric = m[2].replace(/\s/g, "");
  // Treat a trailing ,dd or .dd as decimals, strip thousands separators.
  const normalized = /[.,]\d{1,2}$/.test(numeric)
    ? numeric.replace(/,/g, ".")
    : numeric.replace(/[.,]/g, "");
  const amount = Number(normalized.replace(/(\.\d{2}).*$/, "$1"));
  if (!isFinite(amount) || amount <= 0) return null;
  return { amount, symbol: prefix || suffix };
};

const formatMoney = (amount: number, symbol: string): string => {
  const fixed = amount.toFixed(2);
  if (!symbol) return fixed;
  if (/^[$€£¥₹]$/.test(symbol)) return `${symbol}${fixed}`;
  return `${fixed} ${symbol}`;
};

export default function Premium() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [selected, setSelected] = useState(7);
  const [searchParams] = useSearchParams();

  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  useEffect(() => {
    refresh().catch(() => {});
    if (Capacitor.getPlatform() !== "web") {
      getOfferings()
        .then((offerings) => offerings && setRcOfferings(offerings))
        .catch(() => {});
    }
  }, [refresh]);

  // Web checkout return: verify the Stripe session, then unlock premium.
  useEffect(() => {
    if (Capacitor.getPlatform() !== "web") return;
    if (searchParams.get("success") !== "true") return;
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", { body: { sessionId } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        await refresh();
        if (!cancelled) toast({ title: "Payment successful — Premium unlocked" });
      } catch (e: any) {
        if (!cancelled) toast({ title: "Could not verify payment", description: e?.message, variant: "destructive" });
      } finally {
        window.history.replaceState({}, "", `${window.location.pathname}#/premium`);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, refresh, toast]);

  const rcPackageFor = (duration: number) => {
    const current = rcOfferings?.current;
    if (!current) return null;
    if (duration === 7) return current.weekly;
    if (duration === 30) return current.monthly;
    return current.availablePackages?.find((p: any) => String(p.identifier).includes("15")) ?? null;
  };

  const displayPrice = (plan: Plan): string => {
    if (Capacitor.getPlatform() !== "web") {
      const pkg = rcPackageFor(plan.duration);
      if (pkg?.product?.priceString) return pkg.product.priceString;
    }
    return plan.webPrice;
  };

  // Real per-day price only when the amount is parseable, so currency never mismatches.
  const planPerDay = (plan: Plan): string | null => {
    const parsed = parsePrice(displayPrice(plan));
    if (!parsed) return null;
    return formatMoney(parsed.amount / plan.duration, parsed.symbol);
  };

  const perDayValues = useMemo(
    () =>
      PLANS.map((p) => {
        const parsed = parsePrice(displayPrice(p));
        return parsed ? parsed.amount / p.duration : null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rcOfferings],
  );
  const bestIndex = useMemo(() => {
    const valid = perDayValues.filter((v): v is number => v != null);
    if (valid.length < PLANS.length) return -1;
    const min = Math.min(...valid);
    return perDayValues.findIndex((v) => v === min);
  }, [perDayValues]);

  const selectedPlan = PLANS.find((p) => p.duration === selected) || PLANS[0];

  const handleBuy = async () => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }
    setLoading(true);
    try {
      if (Capacitor.getPlatform() !== "web") {
        const offerings = rcOfferings?.current ? rcOfferings : await getOfferings();
        const pkg = rcPackageFor(selectedPlan.duration);
        if (pkg) {
          const info = await purchasePackage(pkg);
          if (info) await refresh(info, selectedPlan.duration);
        } else {
          toast({ title: "Plan unavailable", description: "Please try again in a moment.", variant: "destructive" });
        }
      } else {
        const { data, error } = await supabase.functions.invoke("create-payment", {
          body: { duration: selectedPlan.duration, origin: window.location.origin },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        else if (selectedPlan.paymentLink) window.location.href = selectedPlan.paymentLink;
        else throw new Error(data?.error || "Could not start checkout");
      }
    } catch (e) {
      console.error("Purchase error", e);
      toast({ title: "Purchase failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (info) {
        await refresh(info);
        toast({ title: "Purchases restored" });
      } else {
        toast({ title: "No active purchases found", variant: "destructive" });
      }
    } finally {
      setRestoring(false);
    }
  };

  if (authLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-pink-400" />
      </div>
    );
  }

  return (
    <div className="app-shell pb-24 md:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 pt-4 space-y-5">
        {/* Value proposition */}
        <section className="space-y-2">
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-[10px] font-bold uppercase tracking-[0.14em]">
            <Gem className="w-3 h-3" /> GSB Premium
          </span>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight leading-tight">
            Every pick. Every analysis.
          </h1>
          <p className="text-[13px] text-white/55 leading-relaxed max-w-md">
            Unlock the full tip board, premium accumulators and expert analyses — hand-picked, no filler.
          </p>
        </section>

        {/* Active status */}
        {active && (
          <div className="surface-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-pink-500/12 border border-pink-500/25 flex items-center justify-center">
                <Gem className="w-4 h-4 text-pink-400" />
              </span>
              <div>
                <p className="font-display font-semibold text-sm">Premium active</p>
                <p className="text-[11px] text-white/45">{daysLeft} days left</p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">
              Active
            </span>
          </div>
        )}

        {active && (
          <div className="surface-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Bell className="w-4 h-4 text-white/60" />
              </span>
              <div>
                <p className="font-display font-semibold text-sm">Push notifications</p>
                <p className="text-[11px] text-white/45">New tips straight to your phone</p>
              </div>
            </div>
            <Switch
              checked={push.enabled}
              disabled={push.loading}
              onCheckedChange={async (val) => {
                try {
                  await push.setPushEnabled(val);
                  toast({ title: val ? "Notifications enabled" : "Notifications disabled" });
                } catch (e: any) {
                  toast({ title: "Could not update", description: e?.message, variant: "destructive" });
                }
              }}
            />
          </div>
        )}

        {/* Benefits — single, accurate list */}
        <section className="surface-card p-4">
          <ul className="space-y-2.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-[13px] text-white/80">
                <span className="w-5 h-5 rounded-full bg-pink-500/12 border border-pink-500/25 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-pink-400" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        {/* Plans — stacked, one main CTA */}
        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">Choose access</p>
          {PLANS.map((plan, i) => {
            const isSelected = selected === plan.duration;
            const perDay = planPerDay(plan);
            return (
              <button
                key={plan.duration}
                onClick={() => setSelected(plan.duration)}
                aria-pressed={isSelected}
                className={`w-full text-left rounded-2xl border p-3.5 flex items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? "border-pink-500/50 bg-pink-500/[0.08]"
                    : "border-white/[0.09] bg-[#17141f] active:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-pink-500 bg-pink-500" : "border-white/25"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 brightness-0 invert" />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-[15px] text-white">{plan.label}</p>
                    <p className="text-[11px] text-white/45">
                      {perDay ? `${perDay} / day` : "One-time access"}
                      {i === bestIndex && <span className="ml-2 text-emerald-300">Best daily value</span>}
                    </p>
                  </div>
                </div>
                <span className="font-display font-extrabold text-[17px] text-white tabular-nums shrink-0">
                  {displayPrice(plan)}
                </span>
              </button>
            );
          })}
        </section>

        <button
          onClick={handleBuy}
          disabled={loading}
          className="w-full h-12 rounded-2xl bg-pink-500 text-white font-display font-bold text-sm inline-flex items-center justify-center gap-2 active:scale-[0.99] transition-transform disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {user ? `Get ${selectedPlan.label} · ${displayPrice(selectedPlan)}` : "Sign in to continue"}
              {!user && <LogIn className="w-4 h-4" />}
            </>
          )}
        </button>

        <p className="text-[11px] text-white/40 text-center leading-relaxed">
          One-time purchase for the selected period. Access does not auto-renew.
        </p>

        {Capacitor.isNativePlatform() && (
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full h-10 rounded-xl border border-white/[0.1] text-[12px] font-semibold text-white/70 inline-flex items-center justify-center gap-2 active:bg-white/[0.05]"
          >
            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
            Restore purchases
          </button>
        )}

        <div className="flex items-center justify-center gap-4 text-[10px] text-white/30 pt-1">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" /> Secure payment</span>
          <span className="inline-flex items-center gap-1"><Gem className="w-3 h-3" /> Instant access</span>
        </div>

        <p className="text-[10px] text-white/30 text-center leading-relaxed pb-2">
          By purchasing you agree to our{" "}
          <Link to="/terms" className="underline hover:text-white/50">Terms of Service</Link>.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
