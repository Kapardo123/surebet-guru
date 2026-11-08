import { describe, it, expect } from "vitest";
import { isCouponExpired, Coupon } from "./couponStorage";

const HOUR = 60 * 60 * 1000;

const makeCoupon = (over: Partial<Coupon>): Coupon => ({
  id: 1,
  name: "Combo",
  matches: [
    { homeTeam: "A", awayTeam: "B", prediction: "1", odds: 2, league: "L", sport: "Football", kickoff: "2026-11-08 18:00" },
  ],
  totalOdds: 2,
  status: "active",
  createdAt: "2026-11-08T10:00:00Z",
  ...over,
});

describe("isCouponExpired (48h retention)", () => {
  const now = new Date("2026-11-08T20:00:00Z").getTime();

  it("keeps a recent active coupon", () => {
    const c = makeCoupon({ status: "active", createdAt: "2026-11-08T10:00:00Z", matches: [
      { homeTeam: "A", awayTeam: "B", prediction: "1", odds: 2, league: "L", sport: "Football", kickoff: "2026-11-08 18:00" },
    ]});
    expect(isCouponExpired(c, now)).toBe(false);
  });

  it("purges an active coupon whose legs are older than 48h", () => {
    const c = makeCoupon({ status: "active", createdAt: "2026-11-05T10:00:00Z", matches: [
      { homeTeam: "A", awayTeam: "B", prediction: "1", odds: 2, league: "L", sport: "Football", kickoff: "2026-11-05 18:00" },
    ]});
    expect(isCouponExpired(c, now)).toBe(true);
  });

  it("purges a settled coupon 48h after won_at", () => {
    const old = makeCoupon({ status: "won", wonAt: new Date(now - 49 * HOUR).toISOString() });
    const fresh = makeCoupon({ status: "won", wonAt: new Date(now - 1 * HOUR).toISOString() });
    expect(isCouponExpired(old, now)).toBe(true);
    expect(isCouponExpired(fresh, now)).toBe(false);
  });

  it("never purges queued coupons", () => {
    const c = makeCoupon({ queued: true, status: "lost", wonAt: "2026-10-01T00:00:00Z" });
    expect(isCouponExpired(c, now)).toBe(false);
  });

  it("has a 7-day deep cutoff", () => {
    const c = makeCoupon({ status: "active", createdAt: "2026-10-30T00:00:00Z", matches: [
      { homeTeam: "A", awayTeam: "B", prediction: "1", odds: 2, league: "L", sport: "Football", kickoff: "2026-11-08 18:00" },
    ]});
    expect(isCouponExpired(c, now)).toBe(true);
  });
});
