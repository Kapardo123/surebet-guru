import { Capacitor } from "@capacitor/core";
import { FOOTBALL_LOGOS, NBA_FULL, NBA_SHORT } from "@/lib/logoMaps";

/*
 * Team logo lookup.
 *
 * 1. A logo the admin uploaded for this team.
 * 2. The curated maps (football clubs, all NBA teams): instant, no network.
 * 3. Online, sport-aware and in two stages so a team costs few requests:
 *    a) TheSportsDB + SofaScore, which say which sport a team plays;
 *    b) only if (a) found nothing convincing: Wikidata's logo property and
 *       the team's Wikipedia page.
 * Every candidate is scored by name similarity and dropped when its sport
 * doesn't match the tip's.
 */

// ---------------------------------------------------------------------------
// Names and sports
// ---------------------------------------------------------------------------

/** Lower case, no accents, "&" as "and", punctuation as spaces, single spaces. */
export const teamKey = (name: string): string =>
  (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/ß/g, "ss")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Legal-form and sport words that say nothing about which club it is.
const AFFIXES = new Set([
  "fc", "cf", "afc", "sc", "ac", "as", "ss", "ssc", "us", "bc", "kk", "bk", "sk", "fk", "nk", "cd", "ud", "rc", "rcd",
  "sl", "bsc", "tsg", "vfb", "vfl", "sv", "if", "ff", "ks", "mks", "club", "calcio", "futbol", "football", "soccer",
  "basket", "basketball", "baloncesto", "basquet", "pallacanestro", "team", "the",
]);

/** teamKey without legal forms and sport words: "FC Barcelona" -> "barcelona". */
export const bareKey = (name: string): string => {
  const words = teamKey(name).split(" ").filter((w) => w && !AFFIXES.has(w));
  return words.length ? words.join(" ") : teamKey(name);
};

export type SportKind = "football" | "basketball" | "hockey" | "other";

export const sportKind = (sport?: string | null): SportKind => {
  const s = (sport || "").toLowerCase();
  if (!s) return "other";
  if (s.includes("basket") || s.includes("nba") || s.includes("koszyk")) return "basketball";
  if (s.includes("hockey") || s.includes("hokej")) return "hockey";
  if (s.includes("football") || s.includes("soccer") || s.includes("piłka") || s.includes("pilka")) return "football";
  return "other";
};

// What each source calls the sport.
const SPORT_WORDS: Record<Exclude<SportKind, "other">, RegExp> = {
  football: /\b(soccer|association football|football club|footballclub|football)\b/i,
  basketball: /\bbasketball\b/i,
  hockey: /\b(ice hockey|hockey)\b/i,
};

/** Does a source's sport label agree with the tip's? Unknown on either side = yes. */
const sportAgrees = (kind: SportKind, label?: string | null): boolean => {
  if (kind === "other" || !label) return true;
  const l = label.toLowerCase();
  if (kind === "football") return /soccer|football/.test(l) && !/american|australian|basketball/.test(l);
  if (kind === "basketball") return /basket/.test(l);
  return /hockey/.test(l);
};

/**
 * Name similarity, 0..100. Exact (ignoring "FC" and the like) is 100; otherwise
 * it weighs how much of the searched name the candidate covers, then how
 * little else it adds: "Celtics" vs "Boston Celtics" ≈ 85, "Celtic" vs
 * "Boston Celtics" ≈ 0.
 */
export const nameScore = (candidate: string, query: string): number => {
  const c = bareKey(candidate);
  const q = bareKey(query);
  if (!c || !q) return 0;
  if (c === q) return 100;
  if (c.replace(/ /g, "") === q.replace(/ /g, "")) return 98;
  const ct = c.split(" ");
  const qt = q.split(" ");
  // Whole words only: "celtic" is not "celtics".
  const hit = qt.filter((t) => ct.includes(t)).length;
  if (!hit) return 0;
  const coverage = hit / qt.length;
  const precision = ct.filter((u) => qt.includes(u)).length / ct.length;
  return Math.round(100 * (0.7 * coverage + 0.3 * precision));
};

// ---------------------------------------------------------------------------
// Types and helpers
// ---------------------------------------------------------------------------

export interface LogoCandidate {
  url: string;
  source: string;
  teamName: string;
  score?: number;
}

// Broken/hotlink-protected junk must not enter the cache chain.
export const isValidLogoUrl = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u.trim());

// Hard cap per request so one slow or hung source never stalls rendering.
// With CapacitorHttp (native) the fetch goes through the Android bridge and
// aborting it can crash the app, so no AbortController there.
const IS_NATIVE = Capacitor.isNativePlatform();
const fetchJson = async (url: string, ms = 7000): Promise<any | null> => {
  try {
    if (IS_NATIVE) {
      const r = await fetch(url);
      return r.ok ? await r.json() : null;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      return r.ok ? await r.json() : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// 1. Logos uploaded by the admin
// ---------------------------------------------------------------------------

const CUSTOM_TEAM_LOGOS_KEY = "custom_team_logos_v1";

export const saveCustomTeamLogo = (teamName: string, dataUrl: string) => {
  const key = teamName.trim().toLowerCase();
  if (!key || key.length < 2) return;
  try {
    const raw = localStorage.getItem(CUSTOM_TEAM_LOGOS_KEY);
    const store: Record<string, string> = raw ? JSON.parse(raw) : {};
    store[key] = dataUrl;
    localStorage.setItem(CUSTOM_TEAM_LOGOS_KEY, JSON.stringify(store));
  } catch {
    return;
  }
};

export const getCustomTeamLogo = (teamName: string): LogoCandidate | null => {
  const key = teamName.trim().toLowerCase();
  if (!key || key.length < 2) return null;
  try {
    const raw = localStorage.getItem(CUSTOM_TEAM_LOGOS_KEY);
    if (!raw) return null;
    const store: Record<string, string> = JSON.parse(raw);
    const url = store[key] ?? Object.entries(store).find(([k]) => teamKey(k) === teamKey(teamName))?.[1];
    return url ? { url, source: "Custom (upload)", teamName: teamName.trim(), score: 300 } : null;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// 2. Curated maps
// ---------------------------------------------------------------------------

const index = (map: Record<string, string>) => {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(map)) {
    out.set(teamKey(k), v);
    out.set(bareKey(k), out.get(bareKey(k)) ?? v);
  }
  return out;
};
const FOOTBALL = index(FOOTBALL_LOGOS);
const NBA_FULL_IDX = index(NBA_FULL);
const NBA_SHORT_IDX = index(NBA_SHORT);

/** Exact lookup in the maps that fit the sport. Never a substring match. */
export const getCuratedLogo = (teamName: string, sport?: string | null): LogoCandidate | null => {
  const kind = sportKind(sport);
  const keys = [teamKey(teamName), bareKey(teamName)];
  const maps: [Map<string, string>, string][] =
    kind === "basketball"
      ? [[NBA_FULL_IDX, "NBA"], [NBA_SHORT_IDX, "NBA"]]
      : kind === "football"
        ? [[FOOTBALL, "Curated"]]
        : kind === "hockey"
          ? []
          : // Sport unknown: football clubs, and NBA teams only by full name.
            [[FOOTBALL, "Curated"], [NBA_FULL_IDX, "NBA"]];
  for (const [map, source] of maps) {
    for (const k of keys) {
      const url = map.get(k);
      if (url) return { url, source, teamName: teamName.trim(), score: 100 };
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// 3a. Structured sources that know the sport
// ---------------------------------------------------------------------------

/** TheSportsDB search response -> candidates (exported for tests). */
export const parseSportsDB = (data: any, teamName: string, kind: SportKind): LogoCandidate[] => {
  const out: LogoCandidate[] = [];
  for (const t of Array.isArray(data?.teams) ? data.teams : []) {
    if (!t || !sportAgrees(kind, t.strSport)) continue;
    const name = t.strTeam || "";
    const alt = String(t.strTeamAlternate || "").split(",");
    const score = Math.max(nameScore(name, teamName), ...alt.map((a: string) => nameScore(a, teamName)));
    if (score < 60) continue;
    for (const url of [t.strBadge, t.strTeamBadge, t.strLogo, t.strTeamLogo]) {
      if (isValidLogoUrl(url)) out.push({ url, source: "TheSportsDB", teamName: name, score });
    }
  }
  return out;
};

/** SofaScore search response -> candidates (exported for tests). */
export const parseSofa = (data: any, teamName: string, kind: SportKind): LogoCandidate[] => {
  const out: LogoCandidate[] = [];
  for (const item of Array.isArray(data?.results) ? data.results : []) {
    const t = item?.entity || item?.team || item;
    if (!t?.id) continue;
    if (!sportAgrees(kind, t.sport?.slug?.replace(/-/g, " ") || t.sport?.name)) continue;
    const score = Math.max(nameScore(t.name || "", teamName), nameScore(t.shortName || "", teamName));
    if (score < 60) continue;
    out.push({ url: `https://img.sofascore.com/api/v1/team/${t.id}/image`, source: "SofaScore", teamName: t.name, score });
    out.push({ url: `https://api.sofascore.com/api/v1/team/${t.id}/image`, source: "SofaScore", teamName: t.name, score: score - 1 });
  }
  return out;
};

const fromSportsDB = async (teamName: string, kind: SportKind) =>
  parseSportsDB(
    await fetchJson(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName.trim())}`),
    teamName,
    kind,
  );

const fromSofa = async (teamName: string, kind: SportKind) =>
  parseSofa(await fetchJson(`https://api.sofascore.com/api/v1/search/teams?q=${encodeURIComponent(teamName.trim())}`), teamName, kind);

// ---------------------------------------------------------------------------
// 3b. Encyclopaedic fallback
// ---------------------------------------------------------------------------

// A Commons file name as an image URL, without guessing the hashed path.
const commonsFile = (file: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/^File:/i, "").replace(/ /g, "_"))}?width=200`;

const fromWikidata = async (teamName: string, kind: SportKind): Promise<LogoCandidate[]> => {
  const found = await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(bareKey(teamName))}&format=json&language=en&type=item&limit=7&origin=*`,
  );
  const items: any[] = (found?.search || []).filter((i: any) => {
    const desc = String(i?.description || "");
    // Must look like a sports team, of the right sport when we know it.
    if (!/club|team|franchise|squad|klub|sports/i.test(desc)) return false;
    return kind === "other" || SPORT_WORDS[kind].test(desc);
  });
  if (!items.length) return [];
  const ents = await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${items.map((i) => i.id).join("|")}&props=claims&format=json&origin=*`,
  );
  const out: LogoCandidate[] = [];
  for (const i of items) {
    const score = nameScore(i.label || "", teamName);
    if (score < 60) continue;
    for (const claim of ents?.entities?.[i.id]?.claims?.P154 || []) {
      const file = claim?.mainsnak?.datavalue?.value;
      if (typeof file === "string") out.push({ url: commonsFile(file), source: "Wikidata", teamName: i.label, score: score - 2 });
    }
  }
  return out;
};

const WIKI_SUFFIX: Record<SportKind, string> = { football: " F.C.", basketball: " basketball", hockey: " hockey", other: "" };

const fromWikipedia = async (teamName: string, kind: SportKind): Promise<LogoCandidate[]> => {
  const out: LogoCandidate[] = [];
  for (const lang of ["en", "pl"]) {
    const q = `${teamName.trim()}${lang === "en" ? WIKI_SUFFIX[kind] : ""}`;
    const s = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json&origin=*`);
    for (const title of (s?.[1] || []) as string[]) {
      const score = nameScore(title, teamName);
      if (score < 60) continue;
      const page = await fetchJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`);
      const text = `${page?.description || ""} ${page?.extract || ""}`;
      if (kind !== "other" && !SPORT_WORDS[kind].test(text)) continue;
      const thumb = page?.thumbnail?.source;
      // Club pages lead with the crest; a wide photo is a stadium, not a logo.
      const w = page?.thumbnail?.width || 1;
      const h = page?.thumbnail?.height || 1;
      if (isValidLogoUrl(thumb) && w / h < 1.6) out.push({ url: thumb, source: `Wikipedia (${lang})`, teamName: title, score: score - 5 });
    }
    if (out.length) break;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

// One lookup per team at a time, and at most three teams searching at once,
// so a list of 100 matches doesn't fire hundreds of requests together.
const inflight = new Map<string, Promise<LogoCandidate[]>>();
let active = 0;
const waiting: (() => void)[] = [];
const slot = async <T,>(fn: () => Promise<T>): Promise<T> => {
  if (active >= 3) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
};

const rank = (list: LogoCandidate[]): LogoCandidate[] => {
  const seen = new Set<string>();
  return list
    .filter((c) => isValidLogoUrl(c.url) && !seen.has(c.url) && (seen.add(c.url), true))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
};

const searchOnline = (teamName: string, sport?: string | null): Promise<LogoCandidate[]> => {
  const kind = sportKind(sport);
  const key = `${kind}:${bareKey(teamName)}`;
  let p = inflight.get(key);
  if (!p) {
    p = slot(async () => {
      const [db, sofa] = await Promise.all([fromSportsDB(teamName, kind), fromSofa(teamName, kind)]);
      let all = rank([...db, ...sofa]);
      if ((all[0]?.score ?? 0) < 85) {
        const [wd, wp] = await Promise.all([fromWikidata(teamName, kind), fromWikipedia(teamName, kind)]);
        all = rank([...all, ...wd, ...wp]);
      }
      return all;
    }).finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
};

/**
 * Logo URLs for a team, best first, for the app to try in order.
 * Curated hits skip the network unless `online` asks for more (e.g. because
 * the curated image failed to load).
 */
export const resolveTeamLogos = async (
  teamName: string,
  sport?: string | null,
  opts: { online?: boolean; exclude?: string[] } = {},
): Promise<string[]> => {
  if (!teamName || teamName.trim().length < 2) return [];
  const exclude = new Set(opts.exclude ?? []);
  const first = [getCustomTeamLogo(teamName), getCuratedLogo(teamName, sport)].filter(
    (c): c is LogoCandidate => !!c && !exclude.has(c.url),
  );
  if (first.length && !opts.online) return first.map((c) => c.url);
  const online = (await searchOnline(teamName, sport)).filter((c) => (c.score ?? 0) >= 70 && !exclude.has(c.url));
  return rank([...first, ...online]).map((c) => c.url).slice(0, 5);
};

/** Everything found for a team, for the admin's logo picker. */
export const fetchTeamLogoCandidates = async (teamName: string, sport?: string | null): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.trim().length < 2) return [];
  const first = [getCustomTeamLogo(teamName), getCuratedLogo(teamName, sport)].filter((c): c is LogoCandidate => !!c);
  const online = await searchOnline(teamName, sport).catch(() => []);
  const seen = new Set<string>();
  return [...first, ...online]
    .filter((c) => !seen.has(c.url) && (seen.add(c.url), true))
    .slice(0, 15);
};

/** The best single logo URL, or null. */
export const fetchTeamLogoUrl = async (teamName: string, sport?: string | null): Promise<string | null> =>
  (await resolveTeamLogos(teamName, sport))[0] ?? null;
