// Pure normalisation helpers for the pewniaczki-proxy edge function.
//
// Unlike zawodtyper-proxy (which talks to a JSON API) pewniaczki.pl serves the
// tips server-side inside <div class="pw-hub__row"> blocks, so this parser works
// on HTML. Kept free of Deno-specific imports so the rules can be unit-tested
// from the app's vitest suite (src/lib/pewniaczkiParse.test.ts). index.ts owns
// the network calls; this file owns the parsing.

export const BASE = "https://pewniaczki.pl";

// One tip, normalised into the shape the import pipeline expects.
export interface PewniakMatch {
  id: string; // "pw:<fixtureId>" — namespaced for the shared imported_matches table
  sourceId: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string; // YYYY-MM-DD, Europe/Warsaw
  time: string; // HH:MM
  kickoff: string; // "YYYY-MM-DD HH:MM"
  predictionRaw: string; // Polish short tip label, straight from the source
  odds: number;
  bookmaker: string;
  // Original written analysis from the match's own page (Polish). Filled in by
  // index.ts (fetchAnalysis); empty only when that page had nothing to extract.
  analysisRaw: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  // True when the row already carries a score (match played). Upcoming pages
  // normally show none; a same-day page may have earlier finished games by the
  // time it is scraped.
  settled: boolean;
}

export const decode = (s: string): string =>
  String(s || "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&middot;|&#183;/g, "·")
    .replace(/&ndash;|&#8211;|&mdash;|&#8212;/g, "–")
    .replace(/&hellip;|&#8230;/g, "…")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&quot;|&bdquo;|&rdquo;/g, '"');

const stripTags = (s: string): string =>
  decode(String(s || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export const toNumber = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

// data-ts is a Unix timestamp in seconds; the page's wall-clock time is
// Europe/Warsaw. "sv-SE" formats as YYYY-MM-DD HH:MM.
export const tsToWarsaw = (ts: string): { date: string; time: string } | null => {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  const d = new Date(n * 1000);
  if (isNaN(d.getTime())) return null;
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  const [date, time] = formatted.split(" ");
  return date && time ? { date, time } : null;
};

// The hub pages mix disciplines; most rows are football. Infer from the league
// label so a tennis/volleyball tip does not get imported as football.
const SPORT_HINTS: [RegExp, string][] = [
  [/\btenis|\batp\b|\bwta\b|challenger|\bitf\b/i, "Tennis"],
  [/siatk|plusliga|\bcev\b/i, "Volleyball"],
  [/koszyk|\bnba\b|euroleague|euroliga/i, "Basketball"],
  [/hokej|\bnhl\b|\bkhl\b/i, "Hockey"],
  [/żużel|zuzel|speedway/i, "Speedway"],
  [/dart/i, "Darts"],
  [/\bmma\b|\bufc\b|ksi|boks|boksersk|\bboxing\b/i, "MMA"],
  [/esport|e-?sport|\bcs2\b|league of legends|counter-?strike|\bdota\b/i, "Esports"],
  [/piłka ręczna|pilka reczna|handball/i, "Handball"],
];

export const mapSport = (league: string): string => {
  const s = String(league || "");
  for (const [re, sport] of SPORT_HINTS) if (re.test(s)) return sport;
  return "Football";
};

// Bookmaker slugs used in the /out/<buk> affiliate links.
const BUK: Record<string, string> = {
  sts: "STS",
  fortuna: "Fortuna",
  superbet: "Superbet",
  etoto: "ETOTO",
  lvbet: "LV BET",
  "lv-bet": "LV BET",
  betclic: "Betclic",
  totalbet: "TOTALbet",
  betfan: "Betfan",
  pzbuk: "PZBuk",
  comon: "ComeOn",
  comeon: "ComeOn",
  betters: "Betters",
  admiralbet: "AdmiralBet",
  forbet: "forBET",
};

const bookmakerName = (slug: string): string => {
  const key = String(slug || "").toLowerCase();
  if (!key) return "";
  return BUK[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

// Clean a scraped league label: drop a trailing separator left over from the
// nested "Ekstraklasa · 18:00" markup.
const cleanLeague = (raw: string): string =>
  stripTags(raw)
    .replace(/[·•|–-]\s*$/, "")
    .trim();

const firstMatch = (html: string, re: RegExp): string | null => {
  const m = html.match(re);
  return m ? m[1] : null;
};

interface TeamInfo {
  name: string;
  logo: string | null;
}

const parseTeamBlock = (block: string): TeamInfo => {
  const name = firstMatch(block, /<span>([^<]+)<\/span>/) || firstMatch(block, /<span[^>]*>([^<]+)<\/span>/);
  // WP Rocket rewrites the crest <img> to src="data:image/svg+xml,..." and puts
  // the real URL in data-lazy-src, so that must be tried before src. Native
  // lazy images (the eager fallback) use a plain https src.
  const logo =
    firstMatch(block, /data-lazy-src="([^"]+)"/) ||
    firstMatch(block, /data-src="([^"]+)"/) ||
    firstMatch(block, /src="([^"]+)"/);
  return {
    name: stripTags(name || ""),
    logo: logo && /^https?:/.test(logo) ? decode(logo) : null,
  };
};

// Split the <a class="pw-hub__teams"> inner HTML into its two team blocks.
const parseTeams = (segment: string): { home: TeamInfo; away: TeamInfo } | null => {
  const anchor = firstMatch(segment, /<a class="pw-hub__teams"[^>]*>([\s\S]*?)<\/a>/);
  if (!anchor) return null;
  const chunks = anchor.split('<span class="pw-hub__team">').slice(1);
  if (chunks.length < 1) return null;
  const home = parseTeamBlock(chunks[0]);
  const away = chunks.length > 1 ? parseTeamBlock(chunks[1]) : { name: "", logo: null };
  if (!home.name) return null;
  return { home, away };
};

export const parseRow = (segment: string, attrs: string, fallbackDate: string): PewniakMatch | null => {
  const teams = parseTeams(segment);
  if (!teams) return null;

  const odds = toNumber(
    firstMatch(segment, /<span class="pw-pill__k"><b>([\d.,]+)<\/b>/) ||
      firstMatch(segment, /class="pw-pill__k"[^>]*><b>([\d.,]+)<\/b>/),
  );
  // Rows without odds are the accumulator banner ("AKO · 4 zdarzenia") or a
  // promotional block, not an importable single tip.
  if (odds <= 1) return null;

  const fixtureId = firstMatch(attrs, /data-fixture-id="([^"]+)"/);
  const ts = firstMatch(attrs, /data-ts="(\d+)"/);
  const fromTs = ts ? tsToWarsaw(ts) : null;
  const timeAttr = firstMatch(segment, /data-kickoff="(\d{1,2}:\d{2})"/);

  const date = fromTs?.date || fallbackDate;
  const time = fromTs?.time || (timeAttr ? timeAttr.padStart(5, "0") : "");
  if (!date) return null;

  const league = cleanLeague(
    firstMatch(segment, /<span class="pw-hub__league">([\s\S]*?)<span class="pw-hub__sep"/) ||
      firstMatch(segment, /<span class="pw-hub__league">([\s\S]*?)<\/span>/) ||
      "",
  );

  const predictionRaw = stripTags(
    firstMatch(segment, /<span class="pw-hub__typ"[^>]*?title="([^"]*)"/) ||
      firstMatch(segment, /<span class="pw-hub__typ"[^>]*>[\s\S]*?<\/b>\s*([^<]*)<\/span>/) ||
      "",
  );

  const urlRaw = firstMatch(segment, /<a class="pw-hub__teams" href="([^"]+)"/);
  const url = urlRaw ? (urlRaw.startsWith("http") ? urlRaw : `${BASE}${urlRaw}`) : BASE;

  const bukSlug =
    firstMatch(segment, /<a class="pw-pill"[^>]*href="\/out\/([^"?]+)/) ||
    firstMatch(segment, /pw-hub__cta[^>]*href="\/out\/([^"?]+)/) ||
    "";

  const settled =
    /pw-hub__score/.test(segment) && !/pw-hub__score--brak/.test(segment);

  const id = fixtureId
    ? `pw:${fixtureId}`
    : `pw:${teams.home.name}-${teams.away.name}-${ts || time}`.toLowerCase().replace(/\s+/g, "-");

  return {
    id,
    sourceId: String(fixtureId || id),
    url,
    homeTeam: teams.home.name,
    awayTeam: teams.away.name,
    sport: mapSport(league),
    league,
    date,
    time,
    kickoff: `${date}${time ? ` ${time}` : " 00:00"}`,
    predictionRaw,
    odds,
    bookmaker: bookmakerName(bukSlug),
    analysisRaw: "",
    homeTeamLogo: teams.home.logo,
    awayTeamLogo: teams.away.logo,
    settled,
  };
};

// Whole-page parse: locate every pw-hub__row and normalise it.
export const parseHubPage = (html: string, fallbackDate: string): PewniakMatch[] => {
  const source = String(html || "");
  const starts: { idx: number; attrs: string }[] = [];
  const re = /<div class="pw-hub__row"([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    starts.push({ idx: m.index, attrs: m[1] });
  }

  const out: PewniakMatch[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1].idx : source.length;
    const segment = source.slice(starts[i].idx, end);
    const parsed = parseRow(segment, starts[i].attrs, fallbackDate);
    if (!parsed) continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    out.push(parsed);
  }
  return out.sort((a, b) => a.kickoff.localeCompare(b.kickoff));
};

// ---------------------------------------------------------------------------
// Match detail page → original analysis.
//
// The hub only shows the short pick. Each match page (e.g.
// /wieczysta-wisla-plock-typy-i-kursy/) carries the written analysis in <p>
// paragraphs under a heading that contains "analiza" (e.g. "...: analiza i
// kurs" or "...: analiza i typy bukmacherskie"). Everything after the promo
// paragraph ("Nie masz jeszcze konta w STS? ... kod promocyjny ...",
// disclaimers, "Szukasz więcej?") is dropped here; bookmaker/promo leftovers
// that survive are removed later by the AI step.
// ---------------------------------------------------------------------------

// Paragraphs that are promo/disclaimer, not analysis — stop or skip on these.
const PROMO_RE =
  /(kod(em|u)?\s+promocyj|pakiet powitalny|konta w |zarejestruj|rejestruj|za[łl][oó][żz] konto|ranking bukmacher|legalni bukmacher|graj odpowiedzialnie|hazard|uzale[żz]ni|fot\.|fotografia|szukasz wi[ęe]cej|bonus|freebet|free bet|promocj)/i;

const MAX_ANALYSIS_CHARS = 4000;

export const extractAnalysis = (html: string): string => {
  const source = String(html || "");

  // The match page opens its analysis with the match-title heading. Its wording
  // varies — "...: analiza i kurs", "...: analiza i typy bukmacherskie",
  // "...: na co postawić? Typy bukmacherskie i kursy" — so anchor on the first
  // <h3>, and only fall back to an <h1>/<h2> that literally says "analiza".
  let startIdx = -1;
  const h3 = source.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/i);
  if (h3) startIdx = (h3.index ?? 0) + h3[0].length;
  if (startIdx < 0) {
    for (const m of source.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) {
      if (stripTags(m[1]).toLowerCase().includes("analiz")) {
        startIdx = (m.index ?? 0) + m[0].length;
        break;
      }
    }
  }
  if (startIdx < 0) return "";

  // The analysis runs until the next structural block (the H2H table, another
  // section heading). Cutting there keeps table rows and later sections out.
  let region = source.slice(startIdx);
  const cut = region.search(/<(?:h2|h4|table|div\s+class=["']?pw-tbl)/i);
  if (cut > 0) region = region.slice(0, cut);

  const blocks: string[] = [];
  const re = /<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region)) !== null) {
    const inner = m[2];
    // Skip embedded media/scripts outright.
    if (/<(style|picture|img|iframe|script|figure)\b/i.test(inner)) continue;
    const text = stripTags(inner);
    if (text.length < 25) continue;
    // The analysis is the run of paragraphs right after the heading; the first
    // promo/disclaimer paragraph ends it.
    if (PROMO_RE.test(text)) break;
    blocks.push(text);
    if (blocks.join(" ").length >= MAX_ANALYSIS_CHARS) break;
  }
  return blocks.join("\n\n").trim();
};
