import { describe, it, expect } from "vitest";
import { daysForProduct } from "./premiumPlans";

describe("daysForProduct — długość planu z identyfikatora produktu", () => {
  it("parsuje premium_XX_days", () => {
    expect(daysForProduct("premium_7_days")).toBe(7);
    expect(daysForProduct("premium_15_days")).toBe(15);
    expect(daysForProduct("premium_30_days")).toBe(30);
    expect(daysForProduct("premium_15days")).toBe(15);
  });

  it("mapuje warianty weekly / monthly", () => {
    expect(daysForProduct("premium_weekly")).toBe(7);
    expect(daysForProduct("premium_monthly")).toBe(30);
  });

  it("zwraca 0 dla nieznanych / pustych", () => {
    expect(daysForProduct("premium")).toBe(0);
    expect(daysForProduct("")).toBe(0);
    expect(daysForProduct(null)).toBe(0);
    expect(daysForProduct(undefined)).toBe(0);
  });
});
