import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { getOfferings, purchasePackage, restorePurchases, loginRevenueCat } from "@/integrations/revenuecat";
import { Switch } from "@/components/ui/switch";
import { Gem, Check, Shield, Smartphone, Loader2, Bell, LogIn } from "@/components/icons/gsb";

type RcKey = "weekly" | "monthly" | "threeMonth";

interface UiPlan {
  id: string;
  labelKey: string;
  days: number;
  rcKey?: RcKey;
  webPrice?: string;
  paymentLink?: string;
}

// Android: store subscriptions (Google Play via RevenueCat).
const SUB_PLANS: UiPlan[] = [
  { id: "weekly", labelKey: "premium.planWeekly", days: 7, rcKey: "weekly" },
  { id: "monthly", labelKey: "premium.planMonthly", days: 30, rcKey: "monthly" },
  { id: "quarterly", labelKey: "premium.planQuarterly", days: 90, rcKey: "threeMonth" },
];

// Web: unchanged one-time passes (Stripe, mode=payment).
const WEB_PLANS: UiPlan[] = [
  { id: "w7", labelKey: "premium.plan7", days: 7, webPrice: "$3.99", paymentLink: "https://buy.stripe.com/aFafZg6dW6kP3Ga5TX6EU03" },
  { id: "w15", labelKey: "premium.plan15", days: 15, webPrice: "$6.99", paymentLink: "https://buy.stripe.com/4gM3cu59SdNh4Ke0zD6EU04" },
  { id: "w30", labelKey: "premium.plan30", days: 30, webPrice: "$9.99", paymentLink: "https://buy.stripe.com/aFa28q59S10v0tYgyB6EU05" },
];

const BENEFITS = [
  "premium.benefitTips",
  "premium.benefitAccas",
  "premium.benefitAnalysis",
  "premium.benefitPush",
];

const parsePrice = (value?: string | null): { amount: number; symbol: string } | null => {
  if (!value) return null;
  const raw = String(value).trim();
  const m = raw.match(/([^\d]*?)(\d[\d.,\s]*)([^\d]*)$/);
  if (!m) return null;
  const prefix = m[1].trim();
  const suffix = m[3].trim();
  const numeric = m[2].replace(/\s/g, "");
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
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { active, daysLeft, refresh } = usePremiumStatus();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [rcOfferings, setRcOfferings] = useState<any>(null);
  const [searchParams] = useSearchParams();

  const isNative = Capacitor.getPlatform() !== "web";
  const plans = isNative ? SUB_PLANS : WEB_PLANS;
  const [selected, setSelected] = useState<string>(() => (isNative ? "weekly" : "w7"));

  const push = usePushNotifications({ userId: user?.id, premiumActive: active });

  useEffect(() => {
    refresh().catch(() => {});
    if (isNative) {
      getOfferings()
        .then((offerings) => offerings && setRcOfferings(offerings))
        .catch(() => {});
    }
  }, [refresh, isNative]);

  // Web checkout return: verify the Stripe session, then unlock premium.
  useEffect(() => {
    if (isNative) return;
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
        if (!cancelled) toast({ title: t("premium.paymentSuccess") });
      } catch (e: any) {
        if (!cancelled) toast({ title: t("premium.paymentError"), description: e?.message, variant: "destructive" });
      } finally {
        window.history.replaceState({}, "", `${window.location.pathname}#/premium`);
      }
    })();
    return () => { cancelled = true; };
  }, [searchParams, refresh, toast, isNative, t]);

  const rcPackageFor = (rcKey?: RcKey, offeringsOverride?: any) => {
    if (!rcKey) return null;
    const current = (offeringsOverride ?? rcOfferings)?.current;
    if (!current) return null;
    return (
      current[rcKey] ??
      current.availablePackages?.find((p: any) => String(p.identifier).toLowerCase().includes(rcKey)) ??
      null
    );
  };

  const displayPrice = (plan: UiPlan): string => {
    if (isNative) {
      const pkg = rcPackageFor(plan.rcKey);
      return pkg?.product?.priceString ?? "";
    }
    return plan.webPrice ?? "";
  };

  const planPerDay = (plan: UiPlan): string | null => {
    const parsed = parsePrice(displayPrice(plan));
    if (!parsed) return null;
    return formatMoney(parsed.amount / plan.days, parsed.symbol);
  };

  const perDayValues = useMemo(
    () =>
      plans.map((p) => {
        const parsed = parsePrice(displayPrice(p));
        return parsed ? parsed.amount / p.days : null;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rcOfferings, isNative],
  );
  const bestIndex = useMemo(() => {
    const valid = perDayValues.filter((v): v is number => v != null);
    if (valid.length < plans.length) return -1;
    const min = Math.min(...valid);
    return perDayValues.findIndex((v) => v === min);
  }, [perDayValues, plans.length]);

  const selectedPlan = plans.find((p) => p.id === selected) || plans[0];

  const handleBuy = async () => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }
    setLoading(true);
    try {
      if (isNative) {
        // Never purchase while RevenueCat is still bound to a different/old
        // Supabase account: the receipt would be attached to the wrong customer.
        const rcCustomer = await loginRevenueCat(user.id);
        if (!rcCustomer) {
          toast({
            title: t("premium.purchaseFailed"),
            description: t("premium.purchaseFailedText"),
            variant: "destructive",
          });
          return;
        }

        const offerings = rcOfferings?.current ? rcOfferings : await getOfferings();
        const pkg = rcPackageFor(selectedPlan.rcKey, offerings);
        if (pkg) {
          const info = await purchasePackage(pkg);
          if (info) await refresh(info);
        } else {
          toast({
            title: t("premium.planUnavailable"),
            description: t("premium.planUnavailableText"),
            variant: "destructive",
          });
        }
      } else {
        const { data, error } = await supabase.functions.invoke("create-payment", {
          body: { duration: selectedPlan.days, origin: window.location.origin },
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
        else if (selectedPlan.paymentLink) window.location.href = selectedPlan.paymentLink;
        else throw new Error(data?.error || "Could not start checkout");
      }
    } catch (e) {
      console.error("Purchase error", e);
      toast({ title: t("premium.purchaseFailed"), description: t("premium.purchaseFailedText"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!user) {
      navigate("/auth?redirect=/premium");
      return;
    }
    setRestoring(true);
    try {
      await loginRevenueCat(user.id);
      const info = await restorePurchases();
      if (info) {
        await refresh(info);
        toast({ title: t("premium.restored") });
      } else {
        toast({ title: t("premium.noPurchases"), variant: "destructive" });
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

  const price = displayPrice(selectedPlan);

  return (
    <div className="app-shell pb-24 md:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-xl px-4 pt-4 space-y-5">
        <section className="space-y-2">
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-[10px] font-bold uppercase tracking-[0.14em]">
            <Gem className="w-3 h-3" /> {t("premium.badge")}
          </span>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight leading-tight">
            {t("premium.title")}
          </h1>
          <p className="text-[13px] text-white/55 leading-relaxed max-w-md">
            {t("premium.subtitle")}
          </p>
        </section>

        {active && (
          <div className="surface-card p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-pink-500/12 border border-pink-500/25 flex items-center justify-center">
                <Gem className="w-4 h-4 text-pink-400" />
              </span>
              <div>
                <p className="font-display font-semibold text-sm">{t("premium.active")}</p>
                <p className="text-[11px] text-white/45">{t("account.daysLeft", { count: daysLeft })}</p>
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-full px-2 py-0.5">
              {t("premium.activeBadge")}
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
                <p className="font-display font-semibold text-sm">{t("account.push")}</p>
                <p className="text-[11px] text-white/45">{t("account.pushText")}</p>
              </div>
            </div>
            <Switch
              checked={push.enabled}
              disabled={push.loading}
              onCheckedChange={async (val) => {
                try {
                  await push.setPushEnabled(val);
                  toast({ title: val ? t("account.notificationsEnabled") : t("account.notificationsDisabled") });
                } catch (e: any) {
                  toast({ title: t("account.updateError"), description: e?.message, variant: "destructive" });
                }
              }}
            />
          </div>
        )}

        <section className="surface-card p-4">
          <ul className="space-y-2.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 text-[13px] text-white/80">
                <span className="w-5 h-5 rounded-full bg-pink-500/12 border border-pink-500/25 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-pink-400" />
                </span>
                {t(benefit)}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">
            {isNative ? t("premium.chooseSubscription") : t("premium.chooseAccess")}
          </p>
          {plans.map((plan, i) => {
            const isSelected = selected === plan.id;
            const perDay = planPerDay(plan);
            const planPrice = displayPrice(plan);
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
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
                    <p className="font-display font-bold text-[15px] text-white">{t(plan.labelKey)}</p>
                    <p className="text-[11px] text-white/45">
                      {perDay
                        ? t("premium.perDay", { price: perDay })
                        : isNative
                          ? t("premium.subscription")
                          : t("premium.oneTime")}
                      {i === bestIndex && <span className="ml-2 text-emerald-300">{t("premium.bestValue")}</span>}
                    </p>
                  </div>
                </div>
                <span className="font-display font-extrabold text-[17px] text-white tabular-nums shrink-0">
                  {planPrice || "—"}
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
          ) : !user ? (
            <>
              {t("premium.signInContinue")} <LogIn className="w-4 h-4" />
            </>
          ) : isNative ? (
            price ? t("premium.subscribeWithPrice", { price }) : t("premium.subscribe")
          ) : (
            t("premium.getPlanWithPrice", { plan: t(selectedPlan.labelKey), price })
          )}
        </button>

        <p className="text-[11px] text-white/40 text-center leading-relaxed">
          {isNative ? t("premium.autoRenewNote") : t("premium.oneTimeNote")}
        </p>

        {isNative && (
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full h-10 rounded-xl border border-white/[0.1] text-[12px] font-semibold text-white/70 inline-flex items-center justify-center gap-2 active:bg-white/[0.05]"
          >
            {restoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Smartphone className="w-3.5 h-3.5" />}
            {t("premium.restore")}
          </button>
        )}

        <div className="flex items-center justify-center gap-4 text-[10px] text-white/30 pt-1">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" /> {t("premium.securePayment")}</span>
          <span className="inline-flex items-center gap-1"><Gem className="w-3 h-3" /> {t("premium.instantAccess")}</span>
        </div>

        <p className="text-[10px] text-white/30 text-center leading-relaxed pb-2">
          {t("premium.termsAgree")}{" "}
          <Link to="/terms" className="underline hover:text-white/50">{t("premium.termsLink")}</Link>.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
