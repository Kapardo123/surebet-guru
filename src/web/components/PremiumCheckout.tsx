import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Loader2, Ticket, Shield, Sparkles } from "@/components/icons/gsb";

const PLANS = [
  { duration: 7, label: "Weekly Pass", days: "7 Days", price: "$3.99", perDay: "$0.57/day", save: null },
  { duration: 15, label: "Pro Access", days: "15 Days", price: "$6.99", perDay: "$0.46/day", popular: true, save: "Save 15%" },
  { duration: 30, label: "Monthly VIP", days: "30 Days", price: "$9.99", perDay: "$0.33/day", save: "Save 40%" },
];

const PERKS = [
  "Every prediction & analysis unlocked",
  "Premium coupons & daily hero pick",
  "Full history of settled picks",
  "Synced across desktop and mobile",
];

interface PremiumCheckoutProps {
  /** Called when the visitor tries to pay without being signed in. */
  onNeedAuth: () => void;
}

/** Cart-style premium checkout that lives on the landing page (Stripe). */
const PremiumCheckout = ({ onNeedAuth }: PremiumCheckoutProps) => {
  const { user } = useAuth();
  const { active: isPremium, daysLeft, expiresAt } = usePremiumStatus();
  const { toast } = useToast();
  const [selected, setSelected] = useState(15);
  const [loading, setLoading] = useState(false);

  const plan = PLANS.find((p) => p.duration === selected) ?? PLANS[1];

  const pay = async () => {
    if (loading) return;
    if (!user) {
      onNeedAuth();
      toast({
        title: "Sign in to continue",
        description: "Premium is tied to your account — sign in or create a free one.",
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: { duration: plan.duration, origin: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.error || "Could not start checkout");
    } catch (e: any) {
      toast({
        title: "Could not start checkout",
        description: e?.message || "Please try again in a moment.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="relative z-10 border-t border-white/[0.05] bg-white/[0.01] scroll-mt-24">
      <div className="mx-auto max-w-7xl px-5 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 text-[11px] font-display font-bold uppercase tracking-[0.2em] text-pink-300">
            <Crown className="w-3.5 h-3.5" /> Premium checkout
          </span>
          <h2 className="mt-3 text-3xl md:text-4xl font-black uppercase tracking-tight">
            Simple, flexible pricing
          </h2>
          <p className="mt-3 text-white/55">
            Pick a plan, review your cart and pay securely with Stripe — access is granted instantly.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Plan picker */}
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((p) => {
              const active = selected === p.duration;
              return (
                <button
                  key={p.duration}
                  type="button"
                  onClick={() => setSelected(p.duration)}
                  aria-pressed={active}
                  className={`relative rounded-3xl border p-6 text-center transition-all ${
                    active
                      ? "border-pink-500/50 bg-gradient-to-b from-pink-500/[0.1] to-transparent shadow-xl shadow-pink-500/10 scale-[1.02]"
                      : "border-white/[0.07] bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-pink-500 to-pink-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-pink-500/30">
                      Most Popular
                    </span>
                  )}
                  {p.save && !p.popular && (
                    <span className="absolute left-3 top-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                      {p.save}
                    </span>
                  )}

                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">{p.label}</p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.3em] text-pink-400">{p.days}</p>
                  <div className="mt-4 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
                    {p.price}
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-widest text-white/45">{p.perDay}</p>

                  <span
                    className={`mt-4 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                      active ? "bg-pink-500 text-white" : "border border-white/[0.12] text-white/30"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cart */}
          <aside className="relative overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-b from-pink-500/[0.07] via-white/[0.02] to-transparent p-6 shadow-xl shadow-pink-500/10 lg:sticky lg:top-24">
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-cyan-500" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 ring-1 ring-pink-500/25">
                  <Ticket className="h-4 w-4 text-pink-400" />
                </span>
                <div className="leading-tight">
                  <p className="font-display text-sm font-black uppercase tracking-[0.16em] text-white">Your cart</p>
                  <p className="text-[11px] text-white/45">Premium plan</p>
                </div>
              </div>
            </div>

            {/* Remaining days — only for active premium users */}
            {isPremium && (
              <p className="mt-4 rounded-2xl border border-pink-500/25 bg-pink-500/[0.07] px-3.5 py-3 text-center">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-pink-300">
                  Premium active · {daysLeft} {daysLeft === 1 ? "day" : "days"} left
                </span>
                {expiresAt && (
                  <span className="mt-0.5 block text-[11px] text-white/50">
                    Expires {new Date(expiresAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                )}
              </p>
            )}

            {/* Line item */}
            <div className={`flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 ${isPremium ? "mt-3" : "mt-5"}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{plan.label}</p>
                <p className="text-[11px] text-white/45">
                  {plan.days} · {plan.perDay}
                </p>
              </div>
              <p className="text-lg font-black tabular-nums text-white">{plan.price}</p>
            </div>

            {/* Perks */}
            <ul className="mt-4 space-y-2.5">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-[13px] text-white/60">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink-400" />
                  {perk}
                </li>
              ))}
            </ul>

            {/* Total */}
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Total today</p>
                  <p className="text-[11px] text-white/35">One-time payment · cancel anytime</p>
                </div>
                <p className="text-4xl font-black leading-none text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400">
                  {plan.price}
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={pay}
              disabled={loading}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-pink-500/30 transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin brightness-0 invert" />
                  Redirecting to Stripe…
                </>
              ) : user ? (
                <>
                  {isPremium ? "Extend Premium" : "Continue to payment"}
                  <Sparkles className="h-3.5 w-3.5 brightness-0 invert" />
                </>
              ) : (
                <>
                  Sign in to continue
                  <Shield className="h-3.5 w-3.5 brightness-0 invert" />
                </>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/40">
              <Shield className="h-3.5 w-3.5" />
              Secure payment by Stripe · 18+
            </p>

            {!user && (
              <p className="mt-2 text-center text-[11px] text-white/45">
                Premium is tied to your account — signing in takes a second.
              </p>
            )}

            {isPremium && (
              <p className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2 text-center text-[11px] text-emerald-300">
                Premium is active — buying again stacks on top of your current days.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
};

export default PremiumCheckout;
