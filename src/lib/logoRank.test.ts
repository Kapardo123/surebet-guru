import { describe, expect, it } from "vitest";
import { LogoCandidate } from "@/lib/logoNames";
import { finalScore, isReserve, leagueCountry, rankCandidates } from "@/lib/logoRank";

const c = (teamName: string, source: string, extra: Partial<LogoCandidate> = {}): LogoCandidate => ({
  url: `https://x/${source}/${teamName}`,
  source,
  teamName,
  score: 100,
  ...extra,
});

describe("reserve and youth sides", () => {
  it("are recognised", () => {
    expect(isReserve("Barcelona B")).toBe(true);
    expect(isReserve("Bayern München II")).toBe(true);
    expect(isReserve("Jong Ajax")).toBe(true);
    expect(isReserve("Real Madrid Castilla")).toBe(true);
    expect(isReserve("Juventus U23")).toBe(true);
    expect(isReserve("Bayer 04 Leverkusen")).toBe(false);
    expect(isReserve("Barcelona")).toBe(false);
  });

  it("lose to the first team when the tip is about the first team", () => {
    const ranked = rankCandidates([c("Barcelona B", "TheSportsDB"), c("Barcelona", "SofaScore")], { teamName: "Barcelona", kind: "football" });
    expect(ranked[0].teamName).toBe("Barcelona");
  });
});

describe("club prefixes", () => {
  it("KKS Lech is Lech", async () => {
    const { nameScore } = await import("@/lib/logoNames");
    expect(nameScore("Lech Poznan", "KKS Lech Poznań")).toBe(100);
    expect(nameScore("Lech Poznan", "KKS Lech")).toBeGreaterThanOrEqual(80);
  });
});

describe("namesakes", () => {
  it("the tip's country wins", () => {
    const ranked = rankCandidates(
      [
        c("Valencia", "TheSportsDB", { meta: { country: "Venezuela" } }),
        c("Valencia", "SofaScore", { meta: { country: "Spain" }, url: "https://x/spain" }),
      ],
      { teamName: "Valencia", kind: "football", league: "LaLiga" },
    );
    expect(ranked[0].url).toBe("https://x/spain");
  });

  it("maps leagues to countries", () => {
    expect(leagueCountry("Premier League")).toBe("england");
    expect(leagueCountry("Ukrainian Premier League")).toBe("ukraine");
    expect(leagueCountry("Ekstraklasa")).toBe("poland");
    expect(leagueCountry("LaLiga")).toBe("spain");
    expect(leagueCountry("Something else")).toBeNull();
  });
});

describe("source and picture type", () => {
  it("crests beat text logos and page pictures", () => {
    const ranked = rankCandidates(
      [
        c("Arsenal", "TheSportsDB", { meta: { type: "wordmark" }, url: "https://x/word" }),
        c("Arsenal", "Wikipedia (en)", { meta: { type: "thumb" }, url: "https://x/thumb" }),
        c("Arsenal", "TheSportsDB", { meta: { type: "badge" }, url: "https://x/badge" }),
      ],
      { teamName: "Arsenal", kind: "football" },
    );
    expect(ranked.map((r) => r.url)).toEqual(["https://x/badge", "https://x/word", "https://x/thumb"]);
  });

  it("the league directory beats a search hit, and agreement adds trust", () => {
    const dir = c("Arsenal", "ESPN");
    const lone = c("Arsenal", "FotMob");
    expect(finalScore(dir, { teamName: "Arsenal", kind: "football" })).toBeGreaterThan(
      finalScore(lone, { teamName: "Arsenal", kind: "football" }),
    );
    const agreed = c("Arsenal", "SofaScore");
    const all = [agreed, c("Arsenal", "TheSportsDB"), c("Arsenal", "FotMob")];
    expect(finalScore(agreed, { teamName: "Arsenal", kind: "football" }, all)).toBeGreaterThan(
      finalScore(agreed, { teamName: "Arsenal", kind: "football" }),
    );
  });

  it("a women's side doesn't win a men's tip", () => {
    const ranked = rankCandidates([c("Arsenal Women", "TheSportsDB"), c("Arsenal", "FotMob")], { teamName: "Arsenal", kind: "football" });
    expect(ranked[0].teamName).toBe("Arsenal");
  });

  it("on a tie, the shorter (closer) name wins", () => {
    const ranked = rankCandidates([c("Arsenal Tula", "SofaScore", { score: 90 }), c("Arsenal", "SofaScore", { score: 90 })], {
      teamName: "Arsenal",
      kind: "football",
    });
    expect(ranked[0].teamName).toBe("Arsenal");
  });
});
