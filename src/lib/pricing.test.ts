import { describe, expect, it } from "vitest";
import { PLANS, SINGLE_TIP_CENTS, WEEKEND_PACK_CENTS, perDay, saving, usd } from "./pricing";
import { readFileSync } from "fs";
import path from "path";

describe("pricing", () => {
  it("formats cents as dollars", () => {
    expect(usd(799)).toBe("$7.99");
    expect(usd(99)).toBe("$0.99");
    expect(usd(2000)).toBe("$20.00");
  });

  it("has the agreed prices", () => {
    expect(PLANS.map((p) => p.cents)).toEqual([799, 1299, 1999]);
    expect(SINGLE_TIP_CENTS).toBe(99);
    expect(WEEKEND_PACK_CENTS).toBe(299);
  });

  it("computes per-day price and savings against the weekly rate", () => {
    expect(perDay(PLANS[0])).toBe("$1.14/day");
    expect(perDay(PLANS[2])).toBe("$0.67/day");
    expect(saving(PLANS[0])).toBeUndefined();
    expect(saving(PLANS[1])).toBe("24% off");
    expect(saving(PLANS[2])).toBe("42% off");
  });

  it("matches what the create-payment function charges", () => {
    const fn = readFileSync(path.resolve(__dirname, "../../supabase/functions/create-payment/index.ts"), "utf8");
    for (const p of PLANS) expect(fn).toMatch(new RegExp(`${p.duration}: \\{ cents: ${p.cents},`));
    expect(fn).toContain(`SINGLE_TIP_CENTS = ${SINGLE_TIP_CENTS}`);
    expect(fn).toContain(`WEEKEND_PACK_CENTS = ${WEEKEND_PACK_CENTS}`);
  });
});
