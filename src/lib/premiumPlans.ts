// Mapping of store product identifiers to their length in days.
//
// RevenueCat reports non-renewing products as non-expiring (`expirationDate =
// null`), so we derive the real length from the product id.
//
// IMPORTANT: store ids are inconsistent — the 7-day plan's id is
// `premium_77_days`, and similar ids may double the digits. Only exact known
// ids, a trusted plan length, or a "doubled digits" id (77 → 7, 1515 → 15) are
// accepted, so an unrelated number can never grant a wrong length.
export const KNOWN_PRODUCT_DAYS: Record<string, number> = {
  premium_7_days: 7,
  premium_15_days: 15,
  premium_30_days: 30,
  premium_77_days: 7, // store id for the 7-day plan (extra "7")
};

const TRUSTED_DAYS = [1, 3, 7, 10, 14, 15, 30, 60, 90, 120, 180, 365];

/** "77" → 7, "1515" → 15, "3030" → 30 — only when the result is trusted. */
const collapseDoubled = (n: number): number | null => {
  const s = String(n);
  if (s.length < 2 || s.length % 2 !== 0) return null;
  const half = s.slice(0, s.length / 2);
  if (half !== s.slice(s.length / 2)) return null;
  const value = Number(half);
  return TRUSTED_DAYS.includes(value) ? value : null;
};

export const daysForProduct = (productId?: string | null): number => {
  if (!productId) return 0;
  const id = String(productId).trim().toLowerCase();

  const exact = KNOWN_PRODUCT_DAYS[id];
  if (exact) return exact;

  const numbers = [...id.matchAll(/(\d+)\s*[-_]?\s*days?/g)].map((m) => Number(m[1]));

  const trusted = numbers.find((n) => TRUSTED_DAYS.includes(n));
  if (trusted) return trusted;

  for (const n of numbers) {
    const collapsed = collapseDoubled(n);
    if (collapsed) return collapsed;
  }

  if (/week/.test(id)) return 7;
  if (/month/.test(id)) return 30;
  if (/year|annual/.test(id)) return 365;
  return 0;
};
