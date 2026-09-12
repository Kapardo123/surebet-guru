// Mapping of store product identifiers to their length in days.
//
// RevenueCat reports non-renewing products (`premium_XX_days`) as non-expiring
// (entitlement `expirationDate = null`). Without this mapping the app would
// treat a 30-day purchase as lifetime, so we derive the real expiry from the
// product id and the purchase date.
export const daysForProduct = (productId?: string | null): number => {
  if (!productId) return 0;
  const byNumber = productId.match(/(\d+)\s*[-_]?\s*days?/i);
  if (byNumber) return Number(byNumber[1]);
  if (/week/i.test(productId)) return 7;
  if (/month/i.test(productId)) return 30;
  return 0;
};
