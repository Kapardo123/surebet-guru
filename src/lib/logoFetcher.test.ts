import { describe, expect, it } from "vitest";
import { bareKey, getCuratedLogo, nameScore, parseSofa, parseSportsDB, sportKind, teamKey } from "@/lib/logoFetcher";

describe("team names", () => {
  it("normalises accents, punctuation and spacing", () => {
    expect(teamKey("  Lech Poznań ")).toBe("lech poznan");
    expect(teamKey("Brighton & Hove Albion")).toBe("brighton and hove albion");
    expect(teamKey("Paris Saint-Germain")).toBe("paris saint germain");
    expect(teamKey("Łódzki KS")).toBe("lodzki ks");
  });

  it("drops legal forms and sport words", () => {
    expect(bareKey("FC Barcelona")).toBe("barcelona");
    expect(bareKey("SSC Napoli")).toBe("napoli");
    expect(bareKey("Real Madrid Baloncesto")).toBe("real madrid");
  });

  it("scores whole words, not substrings", () => {
    expect(nameScore("Barcelona", "FC Barcelona")).toBe(100);
    expect(nameScore("Boston Celtics", "Celtics")).toBeGreaterThanOrEqual(80);
    expect(nameScore("Celtic", "Boston Celtics")).toBe(0);
    expect(nameScore("Romania", "Roma")).toBe(0);
    expect(nameScore("FC Winterthur", "Inter")).toBe(0);
  });

  it("reads the sport", () => {
    expect(sportKind("Basketball")).toBe("basketball");
    expect(sportKind("NBA")).toBe("basketball");
    expect(sportKind("Football")).toBe("football");
    expect(sportKind("Ice Hockey")).toBe("hockey");
    expect(sportKind("Tennis")).toBe("other");
    expect(sportKind(undefined)).toBe("other");
  });
});

describe("curated logos", () => {
  it("has every NBA team, by full name and nickname", () => {
    expect(getCuratedLogo("Boston Celtics", "Basketball")?.url).toContain("/nba/500/bos.png");
    expect(getCuratedLogo("Celtics", "Basketball")?.url).toContain("/nba/500/bos.png");
    expect(getCuratedLogo("LA Lakers", "Basketball")?.url).toContain("/nba/500/lal.png");
    expect(getCuratedLogo("Philadelphia 76ers", "Basketball")?.url).toContain("/nba/500/phi.png");
    expect(getCuratedLogo("Sixers", "Basketball")?.url).toContain("/nba/500/phi.png");
    expect(getCuratedLogo("Spurs", "Basketball")?.url).toContain("/nba/500/sa.png");
  });

  it("never gives a football crest to a basketball team", () => {
    // The old substring match turned "Boston Celtics" into Celtic FC.
    expect(getCuratedLogo("Boston Celtics", "Football")).toBeNull();
    expect(getCuratedLogo("Boston Celtics")?.url).toContain("/nba/500/bos.png");
    expect(getCuratedLogo("Real Madrid", "Basketball")).toBeNull();
    expect(getCuratedLogo("Spurs", "Football")?.url).toContain("Tottenham");
  });

  it("matches multi-word clubs exactly, ignoring FC and accents", () => {
    expect(getCuratedLogo("Real Madrid", "Football")?.url).toContain("Real_Madrid");
    expect(getCuratedLogo("FC Bayern", "Football")?.url).toContain("Bayern");
    expect(getCuratedLogo("Lech Poznań", "Football")?.url).toContain("Lech_Poznan");
    expect(getCuratedLogo("Celtic", "Football")?.url).toContain("Celtic_FC");
  });

  it("doesn't match on part of a name", () => {
    expect(getCuratedLogo("FC Winterthur", "Football")).toBeNull();
    expect(getCuratedLogo("Romania", "Football")).toBeNull();
    expect(getCuratedLogo("Heat", "Football")).toBeNull();
  });
});

describe("online sources keep to the tip's sport", () => {
  const sportsDb = {
    teams: [
      { strTeam: "Real Madrid", strSport: "Soccer", strBadge: "https://r2.thesportsdb.com/rm-football.png" },
      { strTeam: "Real Madrid Baloncesto", strSport: "Basketball", strBadge: "https://r2.thesportsdb.com/rm-basket.png" },
    ],
  };

  it("TheSportsDB", () => {
    const basket = parseSportsDB(sportsDb, "Real Madrid", "basketball").map((c) => c.url);
    expect(basket).toEqual(["https://r2.thesportsdb.com/rm-basket.png"]);
    const football = parseSportsDB(sportsDb, "Real Madrid", "football").map((c) => c.url);
    expect(football).toEqual(["https://r2.thesportsdb.com/rm-football.png"]);
  });

  it("SofaScore", () => {
    const sofa = {
      results: [
        { entity: { id: 1, name: "Celtic", sport: { slug: "football" } } },
        { entity: { id: 2, name: "Boston Celtics", sport: { slug: "basketball" } } },
      ],
    };
    const urls = parseSofa(sofa, "Boston Celtics", "basketball").map((c) => c.url);
    expect(urls[0]).toBe("https://img.sofascore.com/api/v1/team/2/image");
    expect(urls.some((u) => u.includes("/team/1/"))).toBe(false);
  });
});
