import { describe, it, expect } from "vitest";
import {
  teamTokens,
  scoreFixture,
  verifyKickoff,
  toWarsawLocal,
  attachKickoffChecks,
  normaliseFeed,
  Fixture,
  RawBet,
  NormalisedMatch,
} from "../../supabase/functions/zawodtyper-proxy/parse";
import fixturesJson from "./__fixtures__/odds-api-fixtures.json";
import feed from "./__fixtures__/zawodtyper-feed.json";

// Both fixtures are real captured payloads for 2026-07-25:
//   odds-api-fixtures.json — GET https://api.odds-api.io/v3/events (independent schedule)
//   zawodtyper-feed.json   — the tipster feed whose kickoffs we are checking

const fixtures = fixturesJson as Fixture[];

describe("teamTokens", () => {
  it("transliterates Polish ł, which NFKD does not decompose", () => {
    // Regression: ASCII-folding alone turned "Białystok" into "biaystok",
    // so identical fixtures scored 0.5 and were reported as unverified.
    expect(teamTokens("Jagiellonia Białystok")).toEqual(
      teamTokens("Jagiellonia Bialystok"),
    );
    expect(teamTokens("Śląsk Wrocław")).toEqual(teamTokens("Slask Wroclaw"));
    expect(teamTokens("ŁKS Łódź").has("lodz")).toBe(true);
  });

  it("folds Scandinavian spelling variants", () => {
    expect(teamTokens("Brondby")).toEqual(teamTokens("Broendby"));
    expect(teamTokens("Brøndby")).toEqual(teamTokens("Brondby"));
  });

  it("translates Polish exonyms to the English fixture names", () => {
    expect(teamTokens("RB Lipsk").has("leipzig")).toBe(true);
    expect(teamTokens("Sparta Praga").has("prague")).toBe(true);
    expect(teamTokens("Hiszpania").has("spain")).toBe(true);
  });

  it("drops club-type noise so it cannot inflate a match", () => {
    expect(teamTokens("KKS Lech Poznań")).toEqual(teamTokens("Lech Poznan"));
    expect(teamTokens("WKS Śląsk Wrocław")).toEqual(teamTokens("Slask Wroclaw"));
  });

  it("ignores emoji and punctuation the tipsters paste in", () => {
    expect(teamTokens("🟡 Jagiellonia Białystok 👑")).toEqual(
      teamTokens("Jagiellonia Bialystok"),
    );
  });
});

describe("scoreFixture", () => {
  const f: Fixture = {
    home: "KKS Lech Poznan",
    away: "KS Cracovia Krakow",
    dateUtc: "2026-07-25T18:15:00Z",
    league: "Poland - Ekstraklasa",
    status: "pending",
  };

  it("matches a short name against the full club name", () => {
    // "Lech" ⊂ "KKS Lech Poznan" — containment, not Jaccard.
    expect(scoreFixture(teamTokens("Lech"), teamTokens("Cracovia"), f)).toBe(1);
  });

  it("requires both sides to agree", () => {
    expect(
      scoreFixture(teamTokens("Lech"), teamTokens("Legia Warszawa"), f),
    ).toBe(0);
  });
});

describe("toWarsawLocal", () => {
  it("converts UTC to Warsaw wall-clock in summer (CEST)", () => {
    expect(toWarsawLocal("2026-07-25T18:30:00Z")).toBe("2026-07-25 20:30");
  });

  it("converts UTC to Warsaw wall-clock in winter (CET)", () => {
    expect(toWarsawLocal("2026-12-25T18:30:00Z")).toBe("2026-12-25 19:30");
  });

  it("returns null for junk", () => {
    expect(toWarsawLocal("not-a-date")).toBeNull();
  });
});

describe("verifyKickoff", () => {
  const fixture: Fixture[] = [
    {
      home: "KKS Lech Poznan",
      away: "KS Cracovia Krakow",
      dateUtc: "2026-07-25T18:15:00Z", // 20:15 Warsaw
      league: "Poland - Ekstraklasa",
      status: "pending",
    },
  ];

  it("confirms a kickoff the tipster got right", () => {
    const r = verifyKickoff(
      { homeTeam: "Lech Poznań", awayTeam: "Cracovia", kickoff: "2026-07-25 20:15", sport: "Football" },
      fixture,
    );
    expect(r.status).toBe("confirmed");
    expect(r.officialKickoff).toBe("2026-07-25 20:15");
    expect(r.officialLeague).toBe("Poland - Ekstraklasa");
  });

  it("flags a kickoff the tipster typed wrong and supplies the real one", () => {
    const r = verifyKickoff(
      { homeTeam: "Lech Poznań", awayTeam: "Cracovia", kickoff: "2026-07-25 17:00", sport: "Football" },
      fixture,
    );
    expect(r.status).toBe("time_mismatch");
    expect(r.officialKickoff).toBe("2026-07-25 20:15");
  });

  it("tolerates a few minutes of rounding between sources", () => {
    const r = verifyKickoff(
      { homeTeam: "Lech Poznań", awayTeam: "Cracovia", kickoff: "2026-07-25 20:20", sport: "Football" },
      fixture,
    );
    expect(r.status).toBe("confirmed");
  });

  it("holds team sports to a tight kickoff", () => {
    const r = verifyKickoff(
      {
        homeTeam: "Lech Poznań",
        awayTeam: "Cracovia",
        kickoff: "2026-07-25 20:55",
        sport: "Football",
      },
      fixture,
    );
    expect(r.status).toBe("time_mismatch");
  });

  it("allows sequential sports to drift from their scheduled slot", () => {
    // Tennis and fight cards start when the previous match ends, so a tipster
    // writing the session time is normal. A flat 15-minute rule flagged nine
    // such tips as wrong on a single live day.
    const tennis: Fixture[] = [
      {
        home: "Blockx, Alexander",
        away: "Darderi, Luciano",
        dateUtc: "2026-07-25T18:45:00Z", // 20:45 Warsaw
        league: "ATP - Umag",
        status: "pending",
      },
    ];
    const r = verifyKickoff(
      {
        homeTeam: "Alexander Blockx",
        awayTeam: "Luciano Darderi",
        kickoff: "2026-07-25 20:00",
        sport: "Tennis",
      },
      tennis,
    );
    expect(r.status).toBe("confirmed");
    // The real time is still reported, and import uses it.
    expect(r.officialKickoff).toBe("2026-07-25 20:45");
  });

  it("still flags a sequential sport when the gap is hours", () => {
    const mma: Fixture[] = [
      {
        home: "Zaynukov, Magomed",
        away: "Rzepecki, Damian",
        dateUtc: "2026-07-25T17:18:00Z", // 19:18 Warsaw
        league: "UFC",
        status: "pending",
      },
    ];
    const r = verifyKickoff(
      {
        homeTeam: "Magomed Zaynukov",
        awayTeam: "Damian Rzepecki",
        kickoff: "2026-07-25 17:00",
        sport: "MMA",
      },
      mma,
    );
    expect(r.status).toBe("time_mismatch");
  });

  it("reports a cancelled fixture instead of confirming it", () => {
    const r = verifyKickoff(
      { homeTeam: "Lech", awayTeam: "Cracovia", kickoff: "2026-07-25 20:15", sport: "Football" },
      [{ ...fixture[0], status: "cancelled" }],
    );
    expect(r.status).toBe("cancelled");
  });

  it("says not_found rather than guessing when nothing matches", () => {
    const r = verifyKickoff(
      { homeTeam: "Real Madrid", awayTeam: "Barcelona", kickoff: "2026-07-25 20:15", sport: "Football" },
      fixture,
    );
    expect(r.status).toBe("not_found");
    expect(r.confidence).toBe(0);
  });

  it("does not try to verify single-entity rows", () => {
    const r = verifyKickoff(
      { homeTeam: "MIMP BYDGOSZCZ", awayTeam: "", kickoff: "2026-07-25 18:00", sport: "Speedway" },
      fixture,
    );
    expect(r.status).toBe("not_found");
  });
});

describe("attachKickoffChecks on the real feed and real fixture list", () => {
  const matches = normaliseFeed(feed as RawBet[], "2026-07-25", "297118");
  const football = matches.filter((m) => m.sport === "Football");
  const checked = attachKickoffChecks(football, { Football: fixtures });

  it("verifies rather than silently passing everything through", () => {
    expect(checked.some((m) => m.check !== null)).toBe(true);
  });

  it("never reports a mismatch without giving the official kickoff", () => {
    for (const m of checked) {
      if (m.check?.status === "time_mismatch") {
        expect(m.check.officialKickoff).toBeTruthy();
      }
    }
  });

  it("only claims a match above the confidence threshold", () => {
    for (const m of checked) {
      if (m.check && m.check.status !== "not_found") {
        expect(m.check.confidence).toBeGreaterThanOrEqual(0.75);
      }
    }
  });

  it("leaves sports with no fixture list unverified instead of not_found", () => {
    const nonFootball = matches.filter((m) => m.sport !== "Football");
    const out = attachKickoffChecks(nonFootball, { Football: fixtures });
    expect(out.every((m) => m.check === null)).toBe(true);
  });

  it("agrees with the tipster on the Ekstraklasa opener", () => {
    // Lech - Cracovia is written several ways in the feed ("LECH : CRACOVIA",
    // "Lech Poznań vs Cracovia", ...); every spelling must land on one kickoff.
    const lech = checked.filter((m: NormalisedMatch) =>
      /lech poznan/i.test(m.check?.matchedName || ""),
    );
    expect(lech.length).toBeGreaterThan(1);
    for (const m of lech) {
      expect(m.check?.status).toBe("confirmed");
      expect(m.check?.officialKickoff).toBe("2026-07-25 20:15");
    }
  });

  it("does not confuse Lech Poznań with Lechia Gdańsk", () => {
    // Both play on this date, three hours apart, and the names differ by two
    // letters — the classic way a fuzzy matcher silently verifies the wrong game.
    const lechia = checked.filter((m: NormalisedMatch) =>
      /lechia/i.test(m.check?.matchedName || ""),
    );
    expect(lechia.length).toBeGreaterThan(0);
    for (const m of lechia) {
      expect(m.check?.matchedName).toContain("Lechia Gdansk");
      expect(m.check?.officialKickoff).toBe("2026-07-25 15:30");
    }
  });
});
