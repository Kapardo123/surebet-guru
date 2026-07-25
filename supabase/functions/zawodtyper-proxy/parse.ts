// Pure normalisation helpers for the zawodtyper-proxy edge function.
//
// Kept free of Deno-specific imports so the rules can be unit-tested from the
// app's vitest suite (src/lib/zawodTyperParse.test.ts) against a real captured
// API payload. index.ts owns the network calls; this file owns the parsing.

export interface RawBet {
  comment_id?: string;
  comment_type?: string;
  author_name?: string;
  author_id?: string;
  author_rank_in_top200?: number | null;
  author_stats?: { bet_count?: string; ratio?: string } | null;
  content?: string;
  discipline?: string;
  rate?: string;
  match_date?: string;
  hour?: string;
  bookmaker?: string;
  match_name?: string;
  type?: string;
  settled?: string;
  result?: string | null;
  is_betbuilder?: string;
  like_count?: number;
}

export interface NormalisedMatch {
  id: string;
  sourceId: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  time: string;
  kickoff: string;
  predictionRaw: string;
  odds: number;
  bookmaker: string;
  analysisRaw: string;
  authorName: string;
  authorRatio: number;
  authorBets: number;
  authorRank: number | null;
  settled: boolean;
  result: string | null;
  isBetbuilder: boolean;
  likeCount: number;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  // Filled in by attachKickoffChecks; null when verification was not run.
  check: KickoffCheck | null;
}

export const BASE = "https://zawodtyper.pl";

export const decode = (s: string): string =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&hellip;/g, "…");

// content is user-written HTML: <br /> line breaks plus the odd <b>/<a>.
export const cleanContent = (raw: string): string =>
  decode(
    String(raw || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

// Polish discipline names -> the sport labels the app already uses elsewhere.
const SPORT_MAP: Record<string, string> = {
  "piłka nożna": "Football",
  "pilka nozna": "Football",
  "tenis": "Tennis",
  "tenis stołowy": "Table Tennis",
  "koszykówka": "Basketball",
  "siatkówka": "Volleyball",
  "hokej": "Hockey",
  "sporty walki": "MMA",
  "e-sport": "Esports",
  "esport": "Esports",
  "żużel": "Speedway",
  "zuzel": "Speedway",
  "dart": "Darts",
  "darts": "Darts",
  "baseball": "Baseball",
  "rugby": "Rugby",
  "golf": "Golf",
  "boks": "Boxing",
  "piłka ręczna": "Handball",
  "futbol amerykański": "American Football",
  "skoki narciarskie": "Ski Jumping",
  "kolarstwo": "Cycling",
  "snooker": "Snooker",
};

export const mapSport = (raw: string): string => {
  const key = String(raw || "").trim().toLowerCase();
  if (!key) return "Football";
  return SPORT_MAP[key] || key.charAt(0).toUpperCase() + key.slice(1);
};

// match_name is free text typed by tipsters, so it arrives in many shapes.
// Real examples from one day's feed:
//   "Hiszpania - Argentyna"      "Lech Poznań vs Cracovia"
//   "Lech Poznań vs. Cracovia"   "Lechia v Pogoń Grodzisk Mazowiecki"
//   "LECH : CRACOVIA"            "Zhetysu 15:00 Kyzylzhar"
//   "KuPS-VPS"                   "Valentova T.-Snigur D."
//   "MIMP BYDGOSZCZ"             (an event, not a head-to-head)
//
// Tried in order of how unambiguous each rule is. Whitespace-delimited word
// separators win first; the bare hyphen is last because it also occurs inside
// club names ("Saint-Étienne - Lyon" must split on " - ", not on the first "-").
const WORD_SEPARATORS = [" vs. ", " vs ", " v ", " - ", " – ", " — "];

// "Zhetysu 15:00 Kyzylzhar" — kickoff time pasted between the teams.
const TIME_SEPARATOR = /\s+\d{1,2}:\d{2}\s+/;
// "LECH : CRACOVIA" — colon used as the separator (no digits around it).
const COLON_SEPARATOR = /\s+:\s+/;
// "KuPS-VPS", "Pareja J.- Jacenko P." — hyphen with optional surrounding space.
const HYPHEN_SEPARATOR = /\s*-\s*/;

const splitOnRegex = (
  name: string,
  re: RegExp,
): { homeTeam: string; awayTeam: string } | null => {
  const m = name.match(re);
  if (!m || m.index === undefined || m.index <= 0) return null;
  const home = name.slice(0, m.index).trim();
  const away = name.slice(m.index + m[0].length).trim();
  if (home.length < 2 || away.length < 2) return null;
  return { homeTeam: home, awayTeam: away };
};

export const splitTeams = (
  matchName: string,
): { homeTeam: string; awayTeam: string } => {
  let name = decode(String(matchName || "")).replace(/\s+/g, " ").trim();

  // Some rows are pasted straight out of the site's fixture list and keep a
  // "Piłka nożna Ekstraklasa • Kolejka 1 ..." metadata prefix.
  const bullet = name.lastIndexOf("•");
  if (bullet !== -1 && name.length - bullet > 6) {
    name = name.slice(bullet + 1).trim();
  }

  // Others are prefixed with a short competition tag: "MLB, Miami Marlins - ...".
  // Left in place it would end up inside the home team name on the published
  // tip. Capped at 6 characters so real club names are never eaten.
  name = name.replace(/^[A-Z0-9][A-Za-z0-9.\s]{0,5},\s+/, "");

  // 1. explicit word separators — earliest position wins so that a hyphenated
  //    club name before the real separator cannot hijack the split.
  let bestIdx = -1;
  let bestSep = "";
  for (const sep of WORD_SEPARATORS) {
    const i = name.toLowerCase().indexOf(sep.toLowerCase());
    if (i > 0 && (bestIdx === -1 || i < bestIdx)) {
      bestIdx = i;
      bestSep = sep;
    }
  }
  if (bestIdx > 0) {
    const home = name.slice(0, bestIdx).trim();
    const away = name.slice(bestIdx + bestSep.length).trim();
    if (home.length >= 2 && away.length >= 2) {
      return { homeTeam: home, awayTeam: away };
    }
  }

  // 2. a kickoff time between the teams (must run before the colon rule,
  //    otherwise "15:00" would itself be treated as the separator).
  const byTime = splitOnRegex(name, TIME_SEPARATOR);
  if (byTime) return byTime;

  // 3. colon separator.
  const byColon = splitOnRegex(name, COLON_SEPARATOR);
  if (byColon) return byColon;

  // 4. bare hyphen.
  const byHyphen = splitOnRegex(name, HYPHEN_SEPARATOR);
  if (byHyphen) return byHyphen;

  // Events and outrights ("MIMP BYDGOSZCZ", "GP Challenge") have no opponent,
  // and two space-separated club names ("Lech Cracovia") cannot be split
  // reliably without a club dictionary — both fall through here for the admin
  // to judge during selection.
  return { homeTeam: name, awayTeam: "" };
};

// "2026-07-25 20:30:00" -> { date: "2026-07-25", time: "20:30" }
export const splitDateTime = (
  matchDate: string,
  hour: string,
): { date: string; time: string } => {
  const s = String(matchDate || "").trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (m) return { date: m[1], time: m[2] };
  const dOnly = s.match(/^(\d{4}-\d{2}-\d{2})/);
  const rawHour = String(hour || "").trim();
  const time = /^\d{1,2}:\d{2}$/.test(rawHour)
    ? rawHour.padStart(5, "0")
    : "";
  return { date: dOnly ? dOnly[1] : "", time };
};

export const toNumber = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

export const normalise = (
  b: RawBet,
  sourceDate: string,
  postId: string,
): NormalisedMatch => {
  const { homeTeam, awayTeam } = splitTeams(b.match_name || "");
  const { date, time } = splitDateTime(b.match_date || "", b.hour || "");
  const stats = b.author_stats || {};
  const kickoffDate = date || sourceDate;

  return {
    // Prefixed so it cannot collide with SportyTrader ids in imported_matches.
    id: `zt:${b.comment_id}`,
    sourceId: String(b.comment_id || ""),
    url: `${BASE}/?p=${postId}#bet-${b.comment_id}`,
    homeTeam,
    awayTeam,
    sport: mapSport(b.discipline || ""),
    // zawodtyper has no league field — ai-analyze infers it from the teams.
    league: "",
    date: kickoffDate,
    time,
    kickoff: `${kickoffDate}${time ? ` ${time}` : " 00:00"}`,
    // Polish, straight from the source. Translated by ai-analyze on selection.
    predictionRaw: decode(String(b.type || "")).replace(/\s+/g, " ").trim(),
    odds: toNumber(b.rate),
    bookmaker: decode(String(b.bookmaker || "")).trim(),
    analysisRaw: cleanContent(b.content || ""),
    // Quality signals used by the admin filters.
    authorName: decode(String(b.author_name || "")).trim(),
    authorRatio: toNumber(stats.ratio),
    authorBets: parseInt(String(stats.bet_count ?? "0"), 10) || 0,
    authorRank: b.author_rank_in_top200 ?? null,
    settled: String(b.settled ?? "0") === "1",
    result:
      b.result === null || b.result === undefined ? null : String(b.result),
    isBetbuilder: String(b.is_betbuilder ?? "0") === "1",
    likeCount: Number(b.like_count ?? 0) || 0,
    homeTeamLogo: null,
    awayTeamLogo: null,
    check: null,
  };
};

// Second pass: verify each match against the fixture list for its sport.
// Separate from normalise() so the scrape works even if the fixture API is down.
export const attachKickoffChecks = (
  matches: NormalisedMatch[],
  fixturesBySport: Record<string, Fixture[]>,
): NormalisedMatch[] =>
  matches.map((m) => {
    const fixtures = fixturesBySport[m.sport];
    // No fixture list for this sport (e.g. Speedway) -> leave unverified
    // rather than claiming the match could not be found.
    if (!fixtures) return m;
    return { ...m, check: verifyKickoff(m, fixtures) };
  });

// ---------------------------------------------------------------------------
// Kickoff verification against an independent fixture list (odds-api.io).
//
// zawodtyper's match_date is typed by hand by the tipster, so it can be wrong,
// and the match may have been cancelled since. Every tip is matched against the
// day's real fixtures by team name; the result rides along on the match so the
// admin sees it before selecting anything.
// ---------------------------------------------------------------------------

export interface Fixture {
  home: string;
  away: string;
  dateUtc: string; // ISO 8601, e.g. "2026-07-25T18:30:00Z"
  league: string;
  status: string; // pending | live | settled | cancelled
}

export interface KickoffCheck {
  status: "confirmed" | "time_mismatch" | "cancelled" | "not_found";
  officialKickoff: string | null; // "YYYY-MM-DD HH:MM" in Europe/Warsaw
  officialLeague: string | null;
  matchedName: string | null; // what the fixture list calls this game
  confidence: number; // 0..1 name-match score
}

// Characters that NFKD does NOT decompose, so ASCII-folding would silently drop
// them. Polish "ł" is the important one: without this, "Białystok" folds to
// "biaystok" and never matches "Bialystok".
const TRANSLITERATE: Record<string, string> = {
  "ł": "l", "Ł": "l",
  "ø": "o", "Ø": "o",
  "đ": "d", "Đ": "d",
  "ħ": "h", "ı": "i",
  "ß": "s", "æ": "a", "Æ": "a",
  "œ": "o", "Œ": "o",
  "þ": "t", "Þ": "t",
};

// Polish exonyms for cities and countries — the fixture list is English.
const EXONYMS: Record<string, string> = {
  lipsk: "leipzig", praga: "prague", monachium: "munich", kolonia: "cologne",
  mediolan: "milan", rzym: "rome", turyn: "turin", neapol: "naples",
  wieden: "vienna", moskwa: "moscow", kijow: "kyiv", londyn: "london",
  parys: "paris", madryt: "madrid", lizbona: "lisbon", bruksela: "brussels",
  kopenhaga: "copenhagen", sztokholm: "stockholm", genua: "genoa",
  florencja: "florence", sewilla: "seville", bukareszt: "bucharest",
  belgrad: "belgrade", zagrzeb: "zagreb", ateny: "athens", stambul: "istanbul",
  hiszpania: "spain", argentyna: "argentina", niemcy: "germany",
  francja: "france", wlochy: "italy", anglia: "england", polska: "poland",
  portugalia: "portugal", holandia: "netherlands", belgia: "belgium",
  chorwacja: "croatia", szwecja: "sweden", norwegia: "norway",
  dania: "denmark", szwajcaria: "switzerland", czechy: "czechia",
  wegry: "hungary", turcja: "turkey", grecja: "greece", japonia: "japan",
  brazylia: "brazil", meksyk: "mexico", szkocja: "scotland",
  irlandia: "ireland", ukraina: "ukraine", rumunia: "romania",
  serbia: "serbia", bulgaria: "bulgaria", finlandia: "finland",
};

// Club-type noise that appears on one side of a name but not the other.
const NOISE_TOKENS = new Set([
  "fc", "sc", "ks", "cf", "ac", "if", "bk", "sk", "fk", "cd", "ca", "ss",
  "as", "afc", "cfc", "sv", "mks", "gks", "rks", "kks", "pfc", "sd", "ud",
  "cs", "wks", "club", "ii",
]);

export const teamTokens = (name: string): Set<string> => {
  let s = String(name || "").toLowerCase();
  for (const [from, to] of Object.entries(TRANSLITERATE)) {
    s = s.split(from).join(to);
  }
  s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  // Scandinavian/German digraphs are written both ways across sources.
  s = s.replace(/oe/g, "o").replace(/ae/g, "a");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  const out = new Set<string>();
  for (const t of s.split(/\s+/)) {
    if (!t || t.length < 2 || NOISE_TOKENS.has(t)) continue;
    out.add(EXONYMS[t] || t);
  }
  return out;
};

// Containment, not Jaccard: the tipster writes "Lech" where the fixture list
// says "KKS Lech Poznan". Penalising the extra tokens would reject a good match.
const containment = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
};

// Both sides must agree, so the weaker side decides the score.
export const scoreFixture = (
  homeTokens: Set<string>,
  awayTokens: Set<string>,
  f: Fixture,
): number =>
  Math.min(
    containment(homeTokens, teamTokens(f.home)),
    containment(awayTokens, teamTokens(f.away)),
  );

export const MATCH_THRESHOLD = 0.75;

// How far the two sources may disagree before it counts as a wrong kickoff.
//
// Team sports start at a scheduled time, so anything past a few minutes is a
// genuine error. Tennis, fight cards, darts and esports are played in sequence
// — "not before" times that drift with the previous match — so the tipster
// writing the session start rather than the exact bout time is normal, not a
// mistake. Measured against a live day, a flat 15-minute rule flagged ten tips
// as wrong when nine were just this sequential-schedule drift.
const TIME_TOLERANCE_MIN = 15;
const SEQUENTIAL_TOLERANCE_MIN = 120;
const SEQUENTIAL_SPORTS = new Set([
  "Tennis", "MMA", "Boxing", "Darts", "Snooker", "Esports", "Table Tennis",
]);

export const toleranceForSport = (sport: string): number =>
  SEQUENTIAL_SPORTS.has(sport) ? SEQUENTIAL_TOLERANCE_MIN : TIME_TOLERANCE_MIN;

// Render a UTC instant as Europe/Warsaw wall-clock time, which is what
// zawodtyper's match_date is expressed in. Handles CET/CEST automatically.
export const toWarsawLocal = (iso: string): string | null => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  // "sv-SE" formats as YYYY-MM-DD HH:MM.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace("T", " ");
};

const minutesApart = (a: string, b: string): number => {
  const pa = Date.parse(`${a.replace(" ", "T")}:00Z`);
  const pb = Date.parse(`${b.replace(" ", "T")}:00Z`);
  if (isNaN(pa) || isNaN(pb)) return Number.POSITIVE_INFINITY;
  return Math.abs(pa - pb) / 60000;
};

export const verifyKickoff = (
  m: Pick<NormalisedMatch, "homeTeam" | "awayTeam" | "kickoff" | "sport">,
  fixtures: Fixture[],
): KickoffCheck => {
  const miss: KickoffCheck = {
    status: "not_found",
    officialKickoff: null,
    officialLeague: null,
    matchedName: null,
    confidence: 0,
  };
  // Single-entity rows (speedway events, outrights) have nothing to match on.
  if (!m.homeTeam || !m.awayTeam || fixtures.length === 0) return miss;

  const qh = teamTokens(m.homeTeam);
  const qa = teamTokens(m.awayTeam);
  if (qh.size === 0 || qa.size === 0) return miss;

  let best: Fixture | null = null;
  let bestScore = 0;
  for (const f of fixtures) {
    const s = scoreFixture(qh, qa, f);
    if (s > bestScore) {
      bestScore = s;
      best = f;
    }
  }
  if (!best || bestScore < MATCH_THRESHOLD) return miss;

  const official = toWarsawLocal(best.dateUtc);
  const common = {
    officialKickoff: official,
    officialLeague: best.league || null,
    matchedName: `${best.home} - ${best.away}`,
    confidence: Math.round(bestScore * 100) / 100,
  };

  if (best.status === "cancelled") return { ...common, status: "cancelled" };
  if (!official) return { ...common, status: "not_found" };

  const drift = minutesApart(m.kickoff, official);
  return {
    ...common,
    status: drift <= toleranceForSport(m.sport) ? "confirmed" : "time_mismatch",
  };
};

// The feed mixes real bets with plain discussion comments, and a handful of
// bets carry no usable odds. Both are dropped here.
export const normaliseFeed = (
  rows: RawBet[],
  sourceDate: string,
  postId: string,
): NormalisedMatch[] =>
  (rows || [])
    .filter(
      (b) =>
        b?.comment_type === "bet" && !!b?.match_name && toNumber(b.rate) > 0,
    )
    .map((b) => normalise(b, sourceDate, postId))
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
