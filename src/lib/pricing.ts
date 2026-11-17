/**
 * Prices shown on the web. Keep in sync with PLAN_CENTS / SINGLE_TIP_CENTS in
 * supabase/functions/create-payment — that is what Stripe actually charges.
 * In the Android app the price string comes from Google Play via RevenueCat.
 */
export interface Plan {
  duration: 7 | 15 | 30;
  label: string;
  days: string;
  cents: number;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  { duration: 7, label: "Weekly pass", days: "7 Days", cents: 799 },
  { duration: 15, label: "Pro access", days: "15 Days", cents: 1299, popular: true },
  { duration: 30, label: "Monthly VIP", days: "30 Days", cents: 1999 },
];

export const SINGLE_TIP_CENTS = 99;
/** Google Play / RevenueCat product id of the $0.99 consumable. */
export const SINGLE_TIP_PRODUCT = "gsb_single_tip";

export const usd = (cents: number) => "$" + (cents / 100).toFixed(2);

export const perDay = (p: Plan) => usd(Math.round(p.cents / p.duration)) + "/day";

/** Saving vs paying the weekly rate for the same number of days. */
export const saving = (p: Plan) => {
  const weekly = PLANS[0];
  const base = (weekly.cents / weekly.duration) * p.duration;
  const pct = Math.round((1 - p.cents / base) * 100);
  return pct >= 5 ? `${pct}% off` : undefined;
};
