import { describe, it, expect } from "vitest";
import {
  splitTeams,
  splitDateTime,
  mapSport,
  cleanContent,
  toNumber,
  normaliseFeed,
  RawBet,
} from "../../supabase/functions/zawodtyper-proxy/parse";
import feed from "./__fixtures__/zawodtyper-feed.json";

// The fixture is a real (trimmed) response from
// POST https://zawodtyper.pl/wp-content/NP_ajax.php { endpoint: "api_get_bets_by_post_id" }
// captured on 2026-07-25, covering every match_name shape the feed actually uses.

describe("splitTeams", () => {
  it("splits the common word separators", () => {
    expect(splitTeams("Hiszpania - Argentyna")).toEqual({
      homeTeam: "Hiszpania",
      awayTeam: "Argentyna",
    });
    expect(splitTeams("Lech Poznań vs Cracovia")).toEqual({
      homeTeam: "Lech Poznań",
      awayTeam: "Cracovia",
    });
    expect(splitTeams("Lech Poznań vs. Cracovia")).toEqual({
      homeTeam: "Lech Poznań",
      awayTeam: "Cracovia",
    });
    expect(splitTeams("Lechia v Pogoń Grodzisk Mazowiecki")).toEqual({
      homeTeam: "Lechia",
      awayTeam: "Pogoń Grodzisk Mazowiecki",
    });
  });

  it("keeps hyphenated club names intact when a real separator is present", () => {
    expect(splitTeams("Saint-Étienne - Lyon")).toEqual({
      homeTeam: "Saint-Étienne",
      awayTeam: "Lyon",
    });
  });

  it("splits a bare hyphen when there is no spaced separator", () => {
    expect(splitTeams("KuPS-VPS")).toEqual({ homeTeam: "KuPS", awayTeam: "VPS" });
    expect(splitTeams("Lokomotiv Sofia-Levski")).toEqual({
      homeTeam: "Lokomotiv Sofia",
      awayTeam: "Levski",
    });
    expect(splitTeams("Valentova T.-Snigur D.")).toEqual({
      homeTeam: "Valentova T.",
      awayTeam: "Snigur D.",
    });
    expect(splitTeams("Pareja J.- Jacenko P.")).toEqual({
      homeTeam: "Pareja J.",
      awayTeam: "Jacenko P.",
    });
  });

  it("treats a pasted kickoff time as a separator, not a colon split", () => {
    expect(splitTeams("Zhetysu 15:00 Kyzylzhar")).toEqual({
      homeTeam: "Zhetysu",
      awayTeam: "Kyzylzhar",
    });
    expect(splitTeams("Duna Aszfalt TVSE 19:00 Szeged 2011")).toEqual({
      homeTeam: "Duna Aszfalt TVSE",
      awayTeam: "Szeged 2011",
    });
  });

  it("splits on a spaced colon", () => {
    expect(splitTeams("LECH : CRACOVIA")).toEqual({
      homeTeam: "LECH",
      awayTeam: "CRACOVIA",
    });
    expect(splitTeams("NYR II : CROWN LEGACY")).toEqual({
      homeTeam: "NYR II",
      awayTeam: "CROWN LEGACY",
    });
  });

  it("strips the fixture-list metadata prefix", () => {
    const r = splitTeams(
      "Piłka nożna Ekstraklasa • Kolejka 1 Jagiellonia Białystok  14:45   Korona Kielce",
    );
    expect(r.awayTeam).toBe("Korona Kielce");
    expect(r.homeTeam).toContain("Jagiellonia Białystok");
    expect(r.homeTeam).not.toContain("Piłka nożna");
  });

  it("strips a short competition prefix so it does not land in the team name", () => {
    expect(splitTeams("MLB, Philadelphia Philles - New York Yankees")).toEqual({
      homeTeam: "Philadelphia Philles",
      awayTeam: "New York Yankees",
    });
  });

  it("does not eat a club name that merely contains a comma", () => {
    expect(splitTeams("Borussia Moenchengladbach, e.V. - Bayern")).toEqual({
      homeTeam: "Borussia Moenchengladbach, e.V.",
      awayTeam: "Bayern",
    });
  });

  it("leaves events and outrights as a single entity", () => {
    expect(splitTeams("MIMP BYDGOSZCZ")).toEqual({
      homeTeam: "MIMP BYDGOSZCZ",
      awayTeam: "",
    });
    expect(splitTeams("GP Challenge")).toEqual({
      homeTeam: "GP Challenge",
      awayTeam: "",
    });
  });

  it("survives empty and whitespace-only input", () => {
    expect(splitTeams("")).toEqual({ homeTeam: "", awayTeam: "" });
    expect(splitTeams("   ")).toEqual({ homeTeam: "", awayTeam: "" });
  });
});

describe("splitDateTime", () => {
  it("reads date and time from match_date", () => {
    expect(splitDateTime("2026-07-25 20:30:00", "")).toEqual({
      date: "2026-07-25",
      time: "20:30",
    });
  });

  it("falls back to the hour field when match_date has no time", () => {
    expect(splitDateTime("2026-07-25", "9:05")).toEqual({
      date: "2026-07-25",
      time: "09:05",
    });
  });

  it("returns empty strings for junk", () => {
    expect(splitDateTime("", "")).toEqual({ date: "", time: "" });
    expect(splitDateTime("not a date", "nope")).toEqual({ date: "", time: "" });
  });
});

describe("mapSport", () => {
  it("maps Polish disciplines to the app's sport labels", () => {
    expect(mapSport("Piłka nożna")).toBe("Football");
    expect(mapSport("Tenis")).toBe("Tennis");
    expect(mapSport("Sporty walki")).toBe("MMA");
    expect(mapSport("Żużel")).toBe("Speedway");
    expect(mapSport("E-sport")).toBe("Esports");
  });

  it("title-cases unknown disciplines instead of dropping them", () => {
    expect(mapSport("krykiet")).toBe("Krykiet");
  });

  it("defaults to Football when absent", () => {
    expect(mapSport("")).toBe("Football");
  });
});

describe("cleanContent", () => {
  it("turns <br /> into newlines and strips the remaining markup", () => {
    expect(cleanContent("1X <br />Po tym jak<br /><br />drugi akapit")).toBe(
      "1X\nPo tym jak\n\ndrugi akapit",
    );
  });

  it("decodes entities", () => {
    expect(cleanContent("Real &amp; Barca &quot;el clasico&quot;")).toBe(
      'Real & Barca "el clasico"',
    );
  });

  it("returns an empty string for missing content", () => {
    expect(cleanContent("")).toBe("");
  });
});

describe("toNumber", () => {
  it("parses odds with either decimal mark", () => {
    expect(toNumber("1.60")).toBe(1.6);
    expect(toNumber("1,85")).toBe(1.85);
  });

  it("returns 0 for junk so the feed filter can drop the row", () => {
    expect(toNumber("")).toBe(0);
    expect(toNumber(null)).toBe(0);
    expect(toNumber("abc")).toBe(0);
  });
});

describe("normaliseFeed on the real captured payload", () => {
  const rows = feed as RawBet[];
  const out = normaliseFeed(rows, "2026-07-25", "297118");

  it("drops discussion comments and keeps only bets", () => {
    expect(rows.some((r) => r.comment_type === "comment")).toBe(true);
    expect(out.length).toBe(rows.filter((r) => r.comment_type === "bet").length);
  });

  it("namespaces ids so they cannot collide with SportyTrader ids", () => {
    expect(out.every((m) => m.id.startsWith("zt:"))).toBe(true);
  });

  it("gives every row usable odds and a kickoff", () => {
    expect(out.every((m) => m.odds > 0)).toBe(true);
    expect(out.every((m) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(m.kickoff))).toBe(true);
  });

  it("resolves a home team for every row", () => {
    expect(out.every((m) => m.homeTeam.length > 0)).toBe(true);
  });

  it("finds both teams for the large majority of rows", () => {
    const withBoth = out.filter((m) => m.awayTeam.length > 0).length;
    expect(withBoth / out.length).toBeGreaterThan(0.8);
  });

  it("maps every discipline to a non-empty sport label", () => {
    expect(out.every((m) => m.sport.length > 0)).toBe(true);
  });

  it("exposes the author quality signals the admin filters rely on", () => {
    expect(out.every((m) => m.authorRatio >= 0 && m.authorRatio <= 1)).toBe(true);
    expect(out.every((m) => Number.isInteger(m.authorBets))).toBe(true);
  });

  it("leaves league empty — it is the AI step's job to infer it", () => {
    expect(out.every((m) => m.league === "")).toBe(true);
  });

  it("keeps the Polish source text untouched for the AI step", () => {
    expect(out.some((m) => m.analysisRaw.length > 40)).toBe(true);
    expect(out.every((m) => !m.analysisRaw.includes("<br"))).toBe(true);
  });

  it("sorts by kickoff", () => {
    const kickoffs = out.map((m) => m.kickoff);
    expect([...kickoffs].sort()).toEqual(kickoffs);
  });
});
