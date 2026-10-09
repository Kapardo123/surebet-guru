import { describe, it, expect } from "vitest";
import {
  parseHubPage,
  parseRow,
  tsToWarsaw,
  mapSport,
  toNumber,
  extractAnalysis,
} from "../../supabase/functions/pewniaczki-proxy/parse";

// Real rows captured from https://pewniaczki.pl/typy-na-dzis/ (2026-10-09),
// whitespace-trimmed to one line each. Covers the "today" hub markup.
const ROW_1 =
  '<div class="pw-hub__row" data-fixture-id="1553190" data-ts="1791561600">' +
  '<span class="pw-hub__mid"><span class="pw-hub__league">Ekstraklasa <span class="pw-hub__sep">&middot;</span> <span class="pw-hub__godz mundial-time" data-kickoff="18:00">18:00</span></span>' +
  '<a class="pw-hub__teams" href="https://pewniaczki.pl/wieczysta-wisla-plock-typy-i-kursy/">' +
  '<span class="pw-hub__team"><img class="pw-hub__herb" src="data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3C/svg%3E" width="22" height="22" data-lazy-src="https://pewniaczki.pl/wp-content/themes/pewniaczki/img/teams/17115.png"><span>Wieczysta</span><b class="pw-hub__score pw-hub__score--brak" data-score="home">&ndash;</b></span>' +
  '<span class="pw-hub__team"><img class="pw-hub__herb" data-lazy-src="https://pewniaczki.pl/wp-content/themes/pewniaczki/img/teams/341.png" width="22" height="22"><span>Wisła Płock</span><b class="pw-hub__score pw-hub__score--brak" data-score="away">&ndash;</b></span>' +
  "</a>" +
  '<span class="pw-hub__typ" title="Wisła Płock lub remis"><b>Nasz typ:</b> Wisła Płock lub remis</span>' +
  "</span>" +
  '<span class="pw-hub__play"><a class="btn btn-danger btn-sm pw-hub__cta" href="/out/sts?src=hub-dzis">Zagraj</a>' +
  '<a class="pw-pill" href="/out/sts?src=hub-dzis-kurs"><span class="pw-pill__logow" style="background:#00239b"><img src="https://pewniaczki.pl/x/sts.png" alt="Logo STS"></span><span class="pw-pill__k"><b>1.72</b></span></a></span>' +
  '<span class="pw-hub__zacheta" title="Pakiet powitalny">Pakiet powitalny</span>' +
  "</div>";

const ROW_2 =
  '<div class="pw-hub__row" data-fixture-id="1570408" data-ts="1791572400">' +
  '<span class="pw-hub__mid"><span class="pw-hub__league">La Liga <span class="pw-hub__sep">&middot;</span> <span class="pw-hub__godz mundial-time" data-kickoff="21:00">21:00</span></span>' +
  '<a class="pw-hub__teams" href="/malaga-espanyol-typy-i-kursy/">' +
  '<span class="pw-hub__team"><img class="pw-hub__herb" data-lazy-src="https://pewniaczki.pl/x/1.png"><span>Malaga</span><b class="pw-hub__score pw-hub__score--brak" data-score="home">&ndash;</b></span>' +
  '<span class="pw-hub__team"><img class="pw-hub__herb" data-lazy-src="https://pewniaczki.pl/x/2.png"><span>Espanyol</span><b class="pw-hub__score pw-hub__score--brak" data-score="away">&ndash;</b></span>' +
  "</a>" +
  '<span class="pw-hub__typ" title="Poniżej 2,5 gola"><b>Nasz typ:</b> Poniżej 2,5 gola</span>' +
  "</span>" +
  '<span class="pw-hub__play"><a class="pw-pill" href="/out/etoto?src=hub-dzis-kurs"><span class="pw-pill__k"><b>1.71</b></span></a></span>' +
  "</div>";

describe("tsToWarsaw", () => {
  it("renders a Unix timestamp as Europe/Warsaw wall-clock time", () => {
    expect(tsToWarsaw("1791561600")).toEqual({ date: "2026-10-09", time: "18:00" });
    expect(tsToWarsaw("1791572400")).toEqual({ date: "2026-10-09", time: "21:00" });
  });
  it("returns null for junk", () => {
    expect(tsToWarsaw("")).toBeNull();
    expect(tsToWarsaw("abc")).toBeNull();
  });
});

describe("mapSport", () => {
  it("defaults to Football", () => {
    expect(mapSport("Ekstraklasa")).toBe("Football");
    expect(mapSport("La Liga")).toBe("Football");
  });
  it("detects other disciplines", () => {
    expect(mapSport("ATP Wiedeń")).toBe("Tennis");
    expect(mapSport("PlusLiga")).toBe("Volleyball");
    expect(mapSport("NBA")).toBe("Basketball");
    expect(mapSport("Żużel Ekstraliga")).toBe("Speedway");
  });
});

describe("toNumber", () => {
  it("parses Polish decimals and ignores junk", () => {
    expect(toNumber("1,72")).toBe(1.72);
    expect(toNumber("1.72")).toBe(1.72);
    expect(toNumber("x")).toBe(0);
  });
});

describe("parseRow", () => {
  it("normalises a full hub row", () => {
    const attrs = ' data-fixture-id="1553190" data-ts="1791561600"';
    const m = parseRow(ROW_1, attrs, "2026-10-09");
    expect(m).not.toBeNull();
    expect(m).toMatchObject({
      id: "pw:1553190",
      homeTeam: "Wieczysta",
      awayTeam: "Wisła Płock",
      sport: "Football",
      league: "Ekstraklasa",
      date: "2026-10-09",
      time: "18:00",
      kickoff: "2026-10-09 18:00",
      predictionRaw: "Wisła Płock lub remis",
      odds: 1.72,
      bookmaker: "STS",
      settled: false,
    });
    expect(m?.homeTeamLogo).toContain("17115.png");
    expect(m?.url).toBe(
      "https://pewniaczki.pl/wieczysta-wisla-plock-typy-i-kursy/",
    );
  });

  it("resolves a relative match url and ETOTO bookmaker", () => {
    const attrs = ' data-fixture-id="1570408" data-ts="1791572400"';
    const m = parseRow(ROW_2, attrs, "2026-10-09");
    expect(m).toMatchObject({
      homeTeam: "Malaga",
      awayTeam: "Espanyol",
      league: "La Liga",
      predictionRaw: "Poniżej 2,5 gola",
      odds: 1.71,
      bookmaker: "ETOTO",
    });
    expect(m?.url).toBe("https://pewniaczki.pl/malaga-espanyol-typy-i-kursy/");
  });
});

describe("parseHubPage", () => {
  it("parses every row, skips odds-less blocks and sorts by kickoff", () => {
    const aka =
      '<div class="pw-hub__row" data-fixture-id="ako1" data-ts="1791550000">' +
      '<span class="pw-hub__mid"><span class="pw-hub__league">AKO<span class="pw-hub__sep">&middot;</span></span>' +
      "<span>4 zdarzenia</span></span></div>";
    const html = `<div class="pw-hub pw-hub--full"><h3 class="pw-hub__day">Piątek</h3>${ROW_1}${aka}${ROW_2}</div>`;
    const rows = parseHubPage(html, "2026-10-09");
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe("pw:1553190");
    expect(rows[1].id).toBe("pw:1570408");
  });
});

describe("extractAnalysis", () => {
  const PAGE =
    '<h1 class="fs-3">Ekstraklasa: typy bukmacherskie na Wieczysta Kraków - Wisła Płock | 09.10.2026</h1>' +
    '<div class="post-content">' +
    '<h3>Typy bukmacherskie na mecz Wieczysta Kraków - Wisła Płock: analiza i kurs</h3>' +
    "<p>Wieczysta jest w strefie spadkowej: 0:2 przy Reymonta, 1:1 z Zagłębiem i 2:2 w Łodzi przed przerwą. Tobias Christensen ma trzy gole, ale drużyna wygrywa rzadko.</p>" +
    "<p>Wisła Płock jest w środku tabeli i w dobrej formie: 3:1 z Cracovią i 2:0 w Lubinie przed przerwą. Said Hamulić ma dwa trafienia.</p>" +
    "<p>Kurs na wygraną gości to ponad 3.00. <strong>Naszym typem jest Wisła Płock lub remis.</strong></p>" +
    "<p><strong>Nie masz jeszcze konta w STS?</strong> Rejestrując się z kodem promocyjnym PEWNIACZKI, odbierasz pakiet powitalny.</p>" +
    '<style>.pw-baner{display:block}</style>' +
    '<p style="font-size:13px">Graj odpowiedzialnie. Zakłady bukmacherskie to legalna rozrywka.</p>' +
    "</div>";

  it("pulls the analysis paragraphs and stops at the promo paragraph", () => {
    const analysis = extractAnalysis(PAGE);
    expect(analysis).toContain("Wieczysta jest w strefie spadkowej");
    expect(analysis).toContain("Naszym typem jest Wisła Płock lub remis.");
    expect(analysis).toContain("Said Hamulić ma dwa trafienia");
    // Promo / disclaimer paragraphs must not leak in.
    expect(analysis).not.toMatch(/kod promocyjny/i);
    expect(analysis).not.toMatch(/konta w STS/i);
    expect(analysis).not.toMatch(/Graj odpowiedzialnie/i);
    // Paragraphs are separated by a blank line.
    expect(analysis).toContain("\n\n");
  });

  it("returns empty when no heading mentions 'analiza'", () => {
    expect(extractAnalysis("<h1>Tabela</h1><p>Jakiś tekst bez nagłówka analizy.</p>")).toBe("");
  });

  it("works when the match heading does not contain 'analiza'", () => {
    const page =
      '<h1 class="fs-3">Ligue 1: typy bukmacherskie na Lens - Lyon | 09.10.2026</h1>' +
      "<h3>Lens - Lyon: na co postawić? Typy bukmacherskie i kursy</h3>" +
      "<p>Lyon jest drugi i ma najszczelniejszą obronę w lidze: dwa stracone gole w pięciu kolejkach.</p>" +
      "<p>Lens gra skrzydłami i dużo dośrodkowuje, notując siedem rzutów rożnych na mecz.</p>" +
      "<p>Kursy na zwycięzcę są wyrównane. <strong>Naszym typem jest powyżej 9,5 rzutu rożnego.</strong></p>" +
      "<h4>Co mówi historia meczów H2H</h4>" +
      '<h3 class="pw-hub__day">Piątek</h3><p>tekst zupełnie innej sekcji strony.</p>';
    const analysis = extractAnalysis(page);
    expect(analysis).toContain("Lyon jest drugi");
    expect(analysis).toContain("Naszym typem jest powyżej 9,5 rzutu rożnego.");
    expect(analysis).not.toMatch(/historia meczów/i);
    expect(analysis).not.toMatch(/innej sekcji/i);
  });
});
