import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coveredByPass, currentWeekend, isWeekendTip, newlySettled, recordDailyOpen } from "./engagement";
import { weekendWindow } from "../../supabase/functions/_shared/weekend";
import type { Tip } from "@/components/TipCard";

const tip = (over: Partial<Tip>): Tip => ({
  id: 1, sport: "Football", league: "L", homeTeam: "A", awayTeam: "B", prediction: "A", odds: 2,
  kickoff: "2026-11-21T15:00:00Z", status: "upcoming", ...over,
});

describe("weekend window", () => {
  const cases: [string, string, string][] = [
    // now (UTC)                     window start               window end
    ["2026-11-18T10:00:00Z", "2026-11-20T00:00:00.000Z", "2026-11-23T06:00:00.000Z"], // Wednesday
    ["2026-11-20T23:00:00Z", "2026-11-20T00:00:00.000Z", "2026-11-23T06:00:00.000Z"], // Friday
    ["2026-11-21T12:00:00Z", "2026-11-20T00:00:00.000Z", "2026-11-23T06:00:00.000Z"], // Saturday
    ["2026-11-22T20:00:00Z", "2026-11-20T00:00:00.000Z", "2026-11-23T06:00:00.000Z"], // Sunday
    ["2026-11-23T09:00:00Z", "2026-11-27T00:00:00.000Z", "2026-11-30T06:00:00.000Z"], // Monday -> next
  ];
  it.each(cases)("at %s covers %s .. %s", (now, start, end) => {
    const w = currentWeekend(new Date(now));
    expect(new Date(w.start).toISOString()).toBe(start);
    expect(new Date(w.end).toISOString()).toBe(end);
  });
  it.each(cases)("server window agrees with the client at %s", (now) => {
    const c = currentWeekend(new Date(now));
    const s = weekendWindow(new Date(now));
    expect(s.start.getTime()).toBe(c.start);
    expect(s.end.getTime()).toBe(c.end);
  });

  it("knows which tips a pass covers", () => {
    const pass = [{ start: Date.parse("2026-11-20T00:00:00Z"), end: Date.parse("2026-11-23T06:00:00Z") }];
    expect(coveredByPass(tip({ kickoff: "2026-11-21T15:00:00Z" }), pass)).toBe(true);
    expect(coveredByPass(tip({ kickoff: "2026-11-23T07:00:00Z" }), pass)).toBe(false);
    expect(coveredByPass(tip({ kickoff: "not a date" }), pass)).toBe(false);
  });

  it("flags weekend tips relative to now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
    expect(isWeekendTip(tip({ kickoff: "2026-11-22T18:00:00Z" }))).toBe(true);
    expect(isWeekendTip(tip({ kickoff: "2026-11-19T18:00:00Z" }))).toBe(false);
    vi.useRealTimers();
  });
});

describe("results since last visit", () => {
  beforeEach(() => localStorage.clear());

  it("reports tips that went from upcoming to settled, once", () => {
    expect(newlySettled([tip({ id: 1 }), tip({ id: 2 })])).toEqual([]);
    const fresh = newlySettled([tip({ id: 1, status: "won" }), tip({ id: 2 })]);
    expect(fresh.map((t) => t.id)).toEqual([1]);
    expect(newlySettled([tip({ id: 1, status: "won" }), tip({ id: 2 })])).toEqual([]);
  });
});

describe("device streak (signed out)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("counts consecutive days and resets after a gap", async () => {
    vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
    expect((await recordDailyOpen(false)).streak).toBe(1);
    expect((await recordDailyOpen(false)).streak).toBe(1); // same day
    vi.setSystemTime(new Date("2026-11-17T12:00:00Z"));
    expect((await recordDailyOpen(false)).streak).toBe(2);
    vi.setSystemTime(new Date("2026-11-19T12:00:00Z"));
    const st = await recordDailyOpen(false);
    expect(st.streak).toBe(1);
    expect(st.local).toBe(true);
  });
});
