import { describe, it, expect } from "vitest";
import {
  teamTokens,
  matchEventForTip,
  settleMarket,
  settleTipAgainstEvent,
  aggregateCoupon,
  pickScore,
  scoreSource,
  parseMarket,
  describeIncidents,
  yesterdayInWarsaw,
  Fixture,
  RawIncident,
} from "../../supabase/functions/settle-results/settle";

const ev = (over: Partial<Fixture> = {}): Fixture => ({
  home: "KKS Lech Poznan",
  away: "Lechia Gdansk",
  dateUtc: "2026-09-01T18:30:00Z",
  league: "Ekstraklasa",
  status: "settled",
  scores: { home: 2, away: 1 },
  ...over,
});

const tip = {
  homeTeam: "Lech Poznan",
  awayTeam: "Lechia Gdansk",
  kickoff: "2026-09-01 20:30", // Warsaw local == 18:30 UTC (CEST)
  sport: "Football",
};

describe("teamTokens", () => {
  it("transliterates Polish characters", () => {
    expect(teamTokens("Białystok").has("bialystok")).toBe(true);
  });

  it("strips club noise", () => {
    // Containment (nie równość zbiorów): "Lech" jest podzbiorem "KKS Lech Poznań".
    expect(teamTokens("KKS Lech Poznań").has("kks")).toBe(false);
    expect(teamTokens("KKS Lech Poznań").has("lech")).toBe(true);
  });
});

describe("matchEventForTip", () => {
  it("matches by contained tokens inside the time window", () => {
    const match = matchEventForTip(tip, [
      ev({ home: "KKS Lech Poznan", away: "Lechia Gdansk" }),
    ]);
    expect(match).not.toBeNull();
    expect(match!.swapped).toBe(false);
    expect(match!.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("flags swapped fixtures so the score can be flipped", () => {
    const match = matchEventForTip(tip, [
      ev({ home: "Lechia Gdansk", away: "KKS Lech Poznan" }),
    ]);
    expect(match).not.toBeNull();
    expect(match!.swapped).toBe(true);
  });

  it("rejects matches outside the tolerance window", () => {
    expect(
      matchEventForTip(tip, [
        ev({ home: "KKS Lech Poznan", away: "Lechia Gdansk", dateUtc: "2026-09-02T06:30:00Z" }),
      ]),
    ).toBeNull();
  });

  it("rejects a different match between the same clubs", () => {
    expect(
      matchEventForTip(tip, [
        ev({ home: "Lech Poznan", away: "Rakow Czestochowa" }),
      ]),
    ).toBeNull();
  });
});

describe("parseMarket + settleMarket", () => {
  const s = (home: number, away: number) => ({ home, away });

  it("settles over/under with half lines", () => {
    expect(settleMarket("Over 2.5", "Football", "A", "B", s(2, 1))).toBe("won");
    expect(settleMarket("Over 2.5 goals", "Football", "A", "B", s(1, 0))).toBe("lost");
    expect(settleMarket("Under 2.5", "Football", "A", "B", s(1, 1))).toBe("won");
    expect(settleMarket("Powyzej 2.5", "Football", "A", "B", s(0, 3))).toBe("won");
  });

  it("pushes whole-number totals to void", () => {
    expect(settleMarket("Over 2.0", "Football", "A", "B", s(1, 1))).toBe("void");
    expect(settleMarket("Under 3", "Football", "A", "B", s(2, 1))).toBe("void");
  });

  it("settles BTTS both ways", () => {
    expect(settleMarket("Both Teams to Score - Yes", "Football", "A", "B", s(1, 1))).toBe("won");
    expect(settleMarket("Both Teams to Score - Yes", "Football", "A", "B", s(2, 0))).toBe("lost");
    expect(settleMarket("BTTS No", "Football", "A", "B", s(0, 0))).toBe("won");
    expect(settleMarket("Obie druzyny strzela", "Football", "A", "B", s(1, 2))).toBe("won");
  });

  it("settles 1X2 via team mention", () => {
    expect(settleMarket("Lech Poznan to Win", "Football", "Lech Poznan", "Lechia Gdansk", s(2, 1))).toBe("won");
    expect(settleMarket("Lech Poznan to Win", "Football", "Lech Poznan", "Lechia Gdansk", s(0, 3))).toBe("lost");
    expect(settleMarket("Lechia Gdansk to Win", "Football", "Lech Poznan", "Lechia Gdansk", s(0, 0))).toBe("lost");
  });

  it("settles draw picks", () => {
    expect(settleMarket("Draw", "Football", "A", "B", s(1, 1))).toBe("won");
    expect(settleMarket("Remis", "Football", "A", "B", s(2, 1))).toBe("lost");
  });

  it("settles double chance", () => {
    expect(settleMarket("X2", "Football", "A", "B", s(0, 1))).toBe("won");
    expect(settleMarket("X2", "Football", "A", "B", s(2, 1))).toBe("lost");
    expect(settleMarket("Home or Draw", "Football", "A", "B", s(1, 1))).toBe("won");
    expect(settleMarket("12", "Football", "A", "B", s(1, 1))).toBe("lost");
  });

  it("voids Draw No Bet on a draw", () => {
    expect(settleMarket("Lech DNB", "Football", "Lech Poznan", "Lechia", s(1, 1))).toBe("void");
    expect(settleMarket("Lech Draw No Bet", "Football", "Lech Poznan", "Lechia", s(2, 1))).toBe("won");
  });

  it("leaves exotic markets unresolved for the AI fallback", () => {
    expect(settleMarket("Asian Handicap -1.5 Lech", "Football", "Lech Poznan", "Lechia", s(2, 0))).toBe("unresolved");
    expect(settleMarket("Correct score 2:1", "Football", "A", "B", s(2, 1))).toBe("unresolved");
    expect(settleMarket("First half over 1.5", "Football", "A", "B", s(2, 1))).toBe("unresolved");
  });

  it("parses short-form totals", () => {
    expect(parseMarket("O2.5", "A", "B")).toEqual({ kind: "total", side: "over", line: 2.5 });
    expect(parseMarket("U 3", "A", "B")).toEqual({ kind: "total", side: "under", line: 3 });
    expect(settleMarket("U3.5", "Football", "A", "B", s(1, 2))).toBe("won");
    expect(settleMarket("O3.5", "Football", "A", "B", s(1, 2))).toBe("lost");
  });
});

describe("pickScore / scoreSource", () => {
  const hockeyScores = {
    home: 4,
    away: 3,
    periods: { ft: { home: 3, away: 3 }, ot: { home: 4, away: 3 } },
  };

  it("hockey 1X2 settles on the OT-inclusive result", () => {
    expect(scoreSource("Hockey", "winner")).toBe("top");
    expect(pickScore(hockeyScores, "Hockey", "winner")).toEqual({ home: 4, away: 3 });
  });

  it("hockey totals settle on regulation", () => {
    expect(pickScore(hockeyScores, "Hockey", "total")).toEqual({ home: 3, away: 3 });
  });

  it("football 1X2 settles on 90 minutes", () => {
    const cupScores = {
      home: 3,
      away: 1,
      periods: { ft: { home: 1, away: 1 }, ot: { home: 3, away: 1 } },
    };
    expect(pickScore(cupScores, "Football", "winner")).toEqual({ home: 1, away: 1 });
  });
});

describe("settleTipAgainstEvent", () => {
  it("settles a won home tip", () => {
    const match = matchEventForTip(tip, [ev({})])!;
    const res = settleTipAgainstEvent(tip, "Lech Poznan to Win", match);
    expect(res.status).toBe("won");
    expect(res.method).toBe("auto");
    expect(res.finalScore).toBe("2:1");
  });

  it("voids cancelled matches without a score", () => {
    const match = matchEventForTip(tip, [ev({ status: "cancelled", scores: null })])!;
    const res = settleTipAgainstEvent(tip, "Over 2.5", match);
    expect(res.status).toBe("void");
    expect(res.finalScore).toBeNull();
  });

  it("stays unresolved while the match is still pending", () => {
    const match = matchEventForTip(tip, [ev({ status: "pending" })])!;
    const res = settleTipAgainstEvent(tip, "Over 2.5", match);
    expect(res.status).toBe("unresolved");
  });

  it("flips the score for swapped fixtures", () => {
    const match = matchEventForTip(tip, [
      ev({ home: "Lechia Gdansk", away: "KKS Lech Poznan", scores: { home: 0, away: 2 } }),
    ])!;
    const res = settleTipAgainstEvent(tip, "Lech Poznan to Win", match);
    expect(res.status).toBe("won");
    expect(res.finalScore).toBe("0:2"); // official orientation is displayed
  });
});

describe("aggregateCoupon", () => {
  it("requires the full set for a win", () => {
    expect(aggregateCoupon(["won", "won"])).toBe("won");
    expect(aggregateCoupon(["won", "lost"])).toBe("lost");
  });

  it("loses on any lost leg", () => {
    expect(aggregateCoupon(["won", "void", "lost"])).toBe("lost");
  });

  it("voids when only voids spoil a winning set", () => {
    expect(aggregateCoupon(["won", "void"])).toBe("void");
  });

  it("waits while any leg is unresolved", () => {
    expect(aggregateCoupon(["won", null])).toBeNull();
  });
});

describe("describeIncidents", () => {
  it("renders goals with scorer, penalty tag, assist and running score", () => {
    const text = describeIncidents([
      { incidentType: "goal", time: 34, isHome: true, incidentClass: "penalty", player: { name: "Robert Lewandowski" }, homeScore: 1, awayScore: 0 },
      { incidentType: "goal", time: 71, isHome: false, player: { name: "V. Mousset" }, assist1: { name: "J. Bedia" }, homeScore: 1, awayScore: 1 },
    ] as RawIncident[]);
    expect(text).toBe(
      "GOAL 34' Robert Lewandowski (pen) [1:0]\nGOAL 71' V. Mousset (assist: J. Bedia) [1:1]",
    );
  });

  it("renders cards and skips non-scorable incidents", () => {
    const text = describeIncidents([
      { incidentType: "card", time: 45, isHome: true, incidentClass: "yellow", player: { name: "A. Tiny" } },
      { incidentType: "card", time: 80, isHome: false, incidentClass: "red", player: { name: "B. Huge" } },
      { incidentType: "substitution", time: 60, player: { name: "C. Bench" } },
      { incidentType: "period", time: 45 },
    ] as RawIncident[]);
    expect(text).toBe("YELLOW 45' A. Tiny\nRED 80' B. Huge");
  });

  it("returns null for empty or incident-less matches", () => {
    expect(describeIncidents([])).toBeNull();
    expect(describeIncidents([{ incidentType: "period", time: 45 }] as RawIncident[])).toBeNull();
  });
});

describe("yesterdayInWarsaw", () => {
  it("returns the previous Warsaw calendar day", () => {
    // 2026-09-02T00:30Z is already 01 Sep 26:30? No: 02:30 Warsaw on Sep 2.
    const now = new Date("2026-09-02T00:30:00Z"); // 02:30 Warsaw, Sep 2
    expect(yesterdayInWarsaw(now)).toBe("2026-09-01");
  });

  it("handles month boundaries", () => {
    const now = new Date("2026-09-01T10:00:00Z"); // 12:00 Warsaw, Sep 1
    expect(yesterdayInWarsaw(now)).toBe("2026-08-31");
  });
});
