import { describe, it, expect, beforeEach } from "vitest";
import {
  toggleTipWatch,
  isTipWatched,
  unwatchTip,
  getWatchedTips,
  toggleCouponWatch,
  isCouponWatched,
} from "./watchStorage";
import type { Tip } from "@/components/TipCard";
import type { Coupon } from "@/lib/couponStorage";

const makeTip = (id: number): Tip => ({
  id,
  sport: "Football",
  league: "Test League",
  homeTeam: "Home",
  awayTeam: "Away",
  prediction: "Home win",
  odds: 1.85,
  kickoff: "2026-11-08 18:00",
  status: "upcoming",
  isPremium: false,
});

const makeCoupon = (id: number): Coupon => ({
  id,
  name: "Combo",
  matches: [],
  totalOdds: 3.5,
  status: "active",
  createdAt: "2026-11-08T10:00:00Z",
  isPremium: false,
});

describe("watchStorage", () => {
  beforeEach(() => localStorage.clear());

  it("toggles a tip on and off with a persistent snapshot", () => {
    const tip = makeTip(1);
    expect(isTipWatched(1)).toBe(false);

    expect(toggleTipWatch(tip)).toBe(true);
    expect(isTipWatched(1)).toBe(true);
    expect(getWatchedTips()).toHaveLength(1);
    expect(getWatchedTips()[0].tip.homeTeam).toBe("Home");

    expect(toggleTipWatch(tip)).toBe(false);
    expect(isTipWatched(1)).toBe(false);
    expect(getWatchedTips()).toHaveLength(0);
  });

  it("supports undo via unwatchTip", () => {
    toggleTipWatch(makeTip(2));
    unwatchTip(2);
    expect(isTipWatched(2)).toBe(false);
  });

  it("toggles coupons independently from tips", () => {
    toggleCouponWatch(makeCoupon(10));
    expect(isCouponWatched(10)).toBe(true);
    expect(isTipWatched(10)).toBe(false);
  });
});
