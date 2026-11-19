import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { directoriesForLeague, findInDirectories, parseEspnTeams, parseTsdbTeams, pickTeam } from "@/lib/logoDirectories";
import { parseFotmob } from "@/lib/logoFetcher";

const espnTeams = {
  sports: [
    {
      leagues: [
        {
          teams: [
            {
              team: {
                displayName: "Brighton & Hove Albion",
                shortDisplayName: "Brighton",
                name: "Brighton",
                location: "Brighton & Hove Albion",
                logos: [
                  { href: "https://a.espncdn.com/i/teamlogos/soccer/500-dark/331.png", rel: ["full", "dark"] },
                  { href: "https://a.espncdn.com/i/teamlogos/soccer/500/331.png", rel: ["full", "default"] },
                ],
              },
            },
            {
              team: {
                displayName: "Manchester United",
                shortDisplayName: "Man United",
                name: "Manchester United",
                logos: [{ href: "https://a.espncdn.com/i/teamlogos/soccer/500/360.png", rel: ["full", "default"] }],
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("directory parsers", () => {
  it("ESPN: names and the default (not dark) logo", () => {
    const teams = parseEspnTeams(espnTeams);
    expect(teams).toHaveLength(2);
    expect(teams[0].logo).toBe("https://a.espncdn.com/i/teamlogos/soccer/500/331.png");
    expect(teams[0].names).toContain("Brighton & Hove Albion");
    expect(teams[1].names).toContain("Man United");
  });

  it("TheSportsDB: name, short name and alternates", () => {
    const teams = parseTsdbTeams({
      teams: [{ strTeam: "Lech Poznań", strTeamShort: "LPO", strTeamAlternate: "KKS Lech, Lech", strBadge: "https://r2.thesportsdb.com/lech.png" }],
    });
    expect(teams[0].names).toEqual(["Lech Poznań", "LPO", "KKS Lech", "Lech"]);
  });

  it("finds a team by any of its names, ignoring FC and accents", () => {
    const teams = parseEspnTeams(espnTeams);
    expect(pickTeam(teams, "Man United")?.team.logo).toContain("/360.png");
    expect(pickTeam(teams, "Manchester United FC")?.team.logo).toContain("/360.png");
    expect(pickTeam(teams, "Brighton")?.team.logo).toContain("/331.png");
    expect(pickTeam(teams, "Manchester City")).toBeNull();
  });
});

describe("league names pick the right directory", () => {
  const ids = (league: string, sport: Parameters<typeof directoriesForLeague>[1] = "football") =>
    directoriesForLeague(league, sport).map((d) => d.id);

  it("big football leagues go to ESPN", () => {
    expect(ids("Premier League")[0]).toBe("espn:eng.1");
    expect(ids("LaLiga")[0]).toBe("espn:esp.1");
    expect(ids("Bundesliga")[0]).toBe("espn:ger.1");
    expect(ids("2. Bundesliga")[0]).toBe("espn:ger.2");
    expect(ids("Serie A")[0]).toBe("espn:ita.1");
    expect(ids("UEFA Champions League")[0]).toBe("espn:uefa.champions");
    expect(ids("Championship")[0]).toBe("espn:eng.2");
  });

  it("country-specific names don't fall into the generic ones", () => {
    expect(ids("Ukrainian Premier League")[0]).toBe("tsdb:Ukrainian Premier League");
    expect(ids("Saudi Pro League")[0]).toBe("espn:ksa.1");
    expect(ids("Austrian Bundesliga")[0]).toBe("tsdb:Austrian Bundesliga");
    expect(ids("Brasileirão Série A")[0]).toBe("espn:bra.1");
    expect(ids("Ekstraklasa")[0]).toBe("tsdb:Polish Ekstraklasa");
    expect(ids("Betclic 1 Liga")[0]).toBe("tsdb:Polish I Liga");
  });

  it("basketball and hockey leagues", () => {
    expect(ids("NBA", "basketball")[0]).toBe("espn:nba");
    expect(ids("WNBA", "basketball")[0]).toBe("espn:wnba");
    expect(ids("Euroleague", "basketball")[0]).toBe("tsdb:EuroLeague");
    expect(ids("Orlen Basket Liga", "basketball")[0]).toBe("tsdb:Polish Basketball League");
    expect(ids("NHL", "hockey")[0]).toBe("espn:nhl");
  });

  it("keeps to the tip's sport", () => {
    expect(ids("Basketball Champions League", "basketball")).not.toContain("espn:uefa.champions");
  });
});

describe("findInDirectories", () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => (store[k] = v),
      removeItem: (k: string) => delete store[k],
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of Object.keys(store)) delete store[k];
  });

  it("opens the tip's league first, then caches it", async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url.includes("/eng.1/") ? espnTeams : { sports: [] }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const hit = await findInDirectories("Man United", "football", "Premier League");
    expect(hit?.url).toContain("/360.png");
    expect(hit?.source).toBe("ESPN");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/soccer/eng.1/teams");

    // Second lookup in the same league: served from the cache.
    await findInDirectories("Brighton", "football", "Premier League");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("FotMob", () => {
  it("walks the grouped search response", () => {
    const data = [
      {
        title: { key: "teams" },
        suggestions: [
          { type: "team", id: "8456", name: "Manchester City" },
          { type: "team", id: "10260", name: "Manchester United" },
        ],
      },
      { title: { key: "players" }, suggestions: [{ type: "player", id: "1", name: "Manchester Someone" }] },
    ];
    const urls = parseFotmob(data, "Manchester United").map((c) => c.url);
    expect(urls[0]).toBe("https://images.fotmob.com/image_resources/logo/teamlogo/10260.png");
    expect(urls.some((u) => u.includes("/1.png"))).toBe(false);
  });
});
