import { describe, expect, it } from "vitest";
import { bareKey, isWomen, nameScore, sportAgrees, sportKind } from "@/lib/logoNames";
import { directoriesForLeague } from "@/lib/logoDirectories";
import { getCountryFlag } from "@/lib/logoCountries";
import { getCuratedLogo, parseEspnSearch } from "@/lib/logoFetcher";

describe("women's football", () => {
  it("spots women's teams and competitions", () => {
    expect(isWomen("Arsenal Women")).toBe(true);
    expect(isWomen("Chelsea W")).toBe(true);
    expect(isWomen("Barcelona Femení", "Liga F")).toBe(true);
    expect(isWomen("VfL Wolfsburg", "Frauen-Bundesliga")).toBe(true);
    expect(isWomen("Polska kobiety")).toBe(true);
    expect(isWomen("Arsenal", "Premier League")).toBe(false);
    expect(isWomen("Wolves")).toBe(false);
  });

  it("matches a women's side to its club", () => {
    expect(bareKey("Arsenal Women")).toBe("arsenal");
    expect(bareKey("Chelsea W")).toBe("chelsea");
    expect(bareKey("Real Madrid Femenino")).toBe("real madrid");
    expect(nameScore("Arsenal", "Arsenal WFC")).toBe(100);
    expect(getCuratedLogo("Arsenal Women", "Football")?.url).toContain("Arsenal");
  });

  it("opens women's directories for women's tips only", () => {
    const ids = (league: string, women: boolean) => directoriesForLeague(league, "football", women).map((d) => d.id);
    expect(ids("Women's Super League", true)[0]).toBe("espn:eng.w.1");
    expect(ids("NWSL", true)[0]).toBe("espn:usa.nwsl");
    expect(ids("UEFA Women's Champions League", true)[0]).toBe("espn:uefa.wchampions");
    // No women's directory for Liga F: the club's men's league, same crests.
    expect(ids("Liga F", true)[0]).toBe("espn:esp.1");
    expect(ids("Frauen-Bundesliga", true)[0]).toBe("espn:ger.1");
    // Men's tips never get a women's directory.
    expect(ids("UEFA Champions League", false)[0]).toBe("espn:uefa.champions");
    expect(ids("Premier League", false)[0]).toBe("espn:eng.1");
  });
});

describe("more sports", () => {
  it("reads sport names in English and Polish", () => {
    expect(sportKind("Volleyball")).toBe("volleyball");
    expect(sportKind("Siatkówka")).toBe("volleyball");
    expect(sportKind("Handball")).toBe("handball");
    expect(sportKind("Piłka ręczna")).toBe("handball");
    expect(sportKind("American Football")).toBe("american-football");
    expect(sportKind("NFL")).toBe("american-football");
    expect(sportKind("Baseball")).toBe("baseball");
    expect(sportKind("Football")).toBe("football");
  });

  it("keeps soccer and American football apart", () => {
    expect(sportAgrees("football", "American Football")).toBe(false);
    expect(sportAgrees("american-football", "American Football")).toBe(true);
    expect(sportAgrees("american-football", "american-football")).toBe(true);
    expect(sportAgrees("football", "Soccer")).toBe(true);
    expect(sportAgrees("hockey", "Field Hockey")).toBe(false);
  });

  it("has directories for other leagues", () => {
    const first = (league: string, kind: Parameters<typeof directoriesForLeague>[1]) => directoriesForLeague(league, kind)[0]?.id;
    expect(first("NFL", "american-football")).toBe("espn:nfl");
    expect(first("MLB", "baseball")).toBe("espn:mlb");
    expect(first("PlusLiga", "volleyball")).toBe("tsdb:Polish PlusLiga");
    expect(first("EHF Champions League", "handball")).toBe("tsdb:EHF Champions League");
    expect(first("KHL", "hockey")).toBe("tsdb:Russian KHL");
    expect(first("FIFA World Cup", "football")).toBe("espn:fifa.world");
    expect(first("UEFA Nations League", "football")).toBe("espn:uefa.nations");
    expect(first("FA Cup", "football")).toBe("espn:eng.fa");
    expect(first("Copa Libertadores", "football")).toBe("espn:conmebol.libertadores");
  });

  it("doesn't hand football crests to NFL or MLB teams", () => {
    expect(getCuratedLogo("Arsenal", "American Football")).toBeNull();
    expect(getCuratedLogo("FC Barcelona", "Handball")?.url).toContain("Barcelona");
  });
});

describe("national teams get their flag", () => {
  it("by English or Polish name, men's, women's and age groups", () => {
    expect(getCountryFlag("Poland")?.url).toBe("https://flagcdn.com/w160/pl.png");
    expect(getCountryFlag("Polska")?.url).toBe("https://flagcdn.com/w160/pl.png");
    expect(getCountryFlag("Poland U21")?.url).toBe("https://flagcdn.com/w160/pl.png");
    expect(getCountryFlag("Polska kobiety")?.url).toBe("https://flagcdn.com/w160/pl.png");
    expect(getCountryFlag("England Women")?.url).toBe("https://flagcdn.com/w160/gb-eng.png");
    expect(getCountryFlag("Niemcy")?.url).toBe("https://flagcdn.com/w160/de.png");
  });

  it("not for clubs, nor US college teams named after states", () => {
    expect(getCountryFlag("Legia Warszawa")).toBeNull();
    expect(getCountryFlag("Georgia", "American Football")).toBeNull();
    expect(getCountryFlag("Georgia", "Basketball", "NCAA")).toBeNull();
    expect(getCountryFlag("Georgia", "Football", "UEFA Nations League")?.url).toContain("/ge.png");
  });
});

describe("name variants", () => {
  it("unifies common spellings", () => {
    expect(nameScore("Manchester United", "Man Utd")).toBe(100);
    expect(nameScore("Bayern Munich", "FC Bayern München")).toBe(100);
    expect(nameScore("Legia Warsaw", "Legia Warszawa")).toBe(100);
    expect(nameScore("Paris Saint-Germain", "PSG")).toBe(100);
    expect(nameScore("St. Pauli", "FC Saint Pauli")).toBe(100);
  });
});

describe("ESPN search", () => {
  it("keeps teams of the right sport with an image", () => {
    const data = {
      results: [
        {
          type: "team",
          contents: [
            { type: "team", displayName: "Arsenal", sport: "soccer", image: { default: "https://a.espncdn.com/i/teamlogos/soccer/500/359.png" } },
            { type: "team", displayName: "Arizona Cardinals", sport: "football", image: { default: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png" } },
          ],
        },
      ],
    };
    expect(parseEspnSearch(data, "Arsenal", "football").map((c) => c.url)).toEqual(["https://a.espncdn.com/i/teamlogos/soccer/500/359.png"]);
    expect(parseEspnSearch(data, "Arizona Cardinals", "american-football")[0]?.url).toContain("/nfl/");
  });
});
