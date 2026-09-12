import { describe, it, expect } from "vitest";
import { daysForProduct } from "./premiumPlans";

describe("daysForProduct — długość planu z identyfikatora produktu", () => {
  it("parsuje premium_XX_days", () => {
    expect(daysForProduct("premium_7_days")).toBe(7);
    expect(daysForProduct("premium_15_days")).toBe(15);
    expect(daysForProduct("premium_30_days")).toBe(30);
    expect(daysForProduct("premium_15days")).toBe(15);
    expect(daysForProduct("com.surebet.guru.premium_7_days")).toBe(7);
  });

  it("mapuje store id z podwójną cyfrą (premium_77_days → 7 dni)", () => {
    expect(daysForProduct("premium_77_days")).toBe(7);
    expect(daysForProduct("premium_1515_days")).toBe(15);
    expect(daysForProduct("premium_3030_days")).toBe(30);
  });

  it("mapuje warianty RevenueCat / weekly / monthly", () => {
    expect(daysForProduct("$rc_weekly")).toBe(7);
    expect(daysForProduct("premium_weekly")).toBe(7);
    expect(daysForProduct("$rc_monthly")).toBe(30);
    expect(daysForProduct("premium_monthly")).toBe(30);
    expect(daysForProduct("premium_annual")).toBe(365);
  });

  it("ignoruje przypadkowe liczby bez 'days'", () => {
    expect(daysForProduct("premium_product_77")).toBe(0);
    expect(daysForProduct("premium_7_days_sku77")).toBe(7);
    expect(daysForProduct("premium")).toBe(0);
    expect(daysForProduct("")).toBe(0);
    expect(daysForProduct(null)).toBe(0);
    expect(daysForProduct(undefined)).toBe(0);
  });
});
