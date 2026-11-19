import { FOOTBALL_LOGOS, NBA_FULL, NBA_SHORT } from "@/lib/logoMaps";
import {
  LogoCandidate,
  SportKind,
  SPORT_WORDS,
  bareKey,
  fetchJson,
  isValidLogoUrl,
  nameScore,
  sportAgrees,
  sportKind,
  teamKey,
} from "@/lib/logoNames";
import { findInDirectories } from "@/lib/logoDirectories";
import { getCountryFlag } from "@/lib/logoCountries";

export { bareKey, isValidLogoUrl, nameScore, sportKind, teamKey };
export type { LogoCandidate, SportKind };

/*
 * Team logo lookup.
 *
 * 1. A logo the admin uploaded for this team.
 * 2. Instant, no API call: the curated maps (football clubs, all NBA teams)
 *    and, for national teams, the country's flag.
 * 3. Online, sport-aware and in stages so a team costs few requests:
 *    a) league directories (ESPN, TheSportsDB): a whole league's teams and
 *       official logos in one cached request, the tip's league first;
 *    b) team search on TheSportsDB, SofaScore, FotMob (football) and ESPN;
 *    c) only if nothing convincing yet: Wikidata's logo property and the
 *       team's Wikipedia page.
 * Every candidate is scored by name similarity and dropped when its sport
 * doesn't match the tip's.
 */

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
      : kind === "football" || kind === "volleyball" || kind === "handball"
        ? // Multi-sport clubs wear the same crest in every section.
          [[FOOTBALL, "Curated"]]
        : kind === "other"
          ? // Sport unknown: football clubs, and NBA teams only by full name.
            [[FOOTBALL, "Curated"], [NBA_FULL_IDX, "NBA"]]
          : [];
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

/**
 * FotMob search (football only) -> candidates (exported for tests). The
 * response nests teams in groups; walk it and keep anything typed "team".
 */
export const parseFotmob = (data: any, teamName: string): LogoCandidate[] => {
  const out: LogoCandidate[] = [];
  const seen = new Set<string>();
  const walk = (v: any, depth = 0) => {
    if (!v || depth > 6) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (typeof v !== "object") return;
    const id = v.id ?? v.teamId;
    const name = v.name ?? v.teamName ?? v.title;
    if ((v.type === "team" || v.teamId) && id && typeof name === "string" && !seen.has(String(id))) {
      seen.add(String(id));
      const score = nameScore(name, teamName);
      if (score >= 60)
        out.push({ url: `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`, source: "FotMob", teamName: name, score });
    }
    Object.values(v).forEach((x) => walk(x, depth + 1));
  };
  walk(data);
  return out;
};

const fromFotmob = async (teamName: string, kind: SportKind) =>
  kind === "football" || kind === "other"
    ? parseFotmob(await fetchJson(`https://www.fotmob.com/api/search/suggest?term=${encodeURIComponent(teamName.trim())}&lang=en`), teamName)
    : [];

/**
 * ESPN's site-wide search (every sport ESPN covers, women's leagues too) ->
 * candidates (exported for tests). Read defensively: any object with a team
 * name and an image counts.
 */
export const parseEspnSearch = (data: any, teamName: string, kind: SportKind): LogoCandidate[] => {
  const out: LogoCandidate[] = [];
  const seen = new Set<string>();
  const walk = (v: any, depth = 0) => {
    if (!v || depth > 6) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (typeof v !== "object") return;
    const name = v.displayName ?? v.name;
    const img = v.image?.default ?? v.image?.href ?? (typeof v.image === "string" ? v.image : null) ?? v.logo ?? v.logos?.[0]?.href;
    const isTeam = v.type === "team" || v.uid?.includes?.("~t:") || (!!v.logos && !v.type);
    if (isTeam && typeof name === "string" && isValidLogoUrl(img) && !seen.has(img)) {
      const label = [v.sport, v.defaultLeagueSlug, v.league, v.description].filter((x) => typeof x === "string").join(" ");
      if (sportAgrees(kind, label || null)) {
        const score = nameScore(name, teamName);
        if (score >= 60) {
          seen.add(img);
          out.push({ url: img, source: "ESPN search", teamName: name, score });
        }
      }
    }
    Object.values(v).forEach((x) => walk(x, depth + 1));
  };
  walk(data);
  return out;
};

const fromEspnSearch = async (teamName: string, kind: SportKind) =>
  parseEspnSearch(
    await fetchJson(`https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(teamName.trim())}&limit=10&type=team`),
    teamName,
    kind,
  );

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

const WIKI_SUFFIX: Record<SportKind, string> = {
  football: " F.C.",
  basketball: " basketball",
  hockey: " hockey",
  volleyball: " volleyball",
  handball: " handball",
  "american-football": "",
  baseball: "",
  other: "",
};

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

const searchOnline = (teamName: string, sport?: string | null, league?: string | null): Promise<LogoCandidate[]> => {
  const kind = sportKind(sport);
  const key = `${kind}:${bareKey(teamName)}`;
  let p = inflight.get(key);
  if (!p) {
    p = slot(async () => {
      // League directories first: one cached request covers a whole league.
      const dir = await findInDirectories(teamName, kind, league).catch(() => null);
      const [db, sofa, fotmob, espnSearch] = await Promise.all([
        fromSportsDB(teamName, kind),
        fromSofa(teamName, kind),
        fromFotmob(teamName, kind),
        fromEspnSearch(teamName, kind),
      ]);
      let all = rank([...(dir ? [dir] : []), ...db, ...sofa, ...fotmob, ...espnSearch]);
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
  opts: { online?: boolean; exclude?: string[]; league?: string | null } = {},
): Promise<string[]> => {
  if (!teamName || teamName.trim().length < 2) return [];
  const exclude = new Set(opts.exclude ?? []);
  const first = [getCustomTeamLogo(teamName), getCuratedLogo(teamName, sport), getCountryFlag(teamName, sport, opts.league)].filter(
    (c): c is LogoCandidate => !!c && !exclude.has(c.url),
  );
  if (first.length && !opts.online) return first.map((c) => c.url);
  const online = (await searchOnline(teamName, sport, opts.league)).filter((c) => (c.score ?? 0) >= 70 && !exclude.has(c.url));
  return rank([...first, ...online]).map((c) => c.url).slice(0, 5);
};

/** Everything found for a team, for the admin's logo picker. */
export const fetchTeamLogoCandidates = async (
  teamName: string,
  sport?: string | null,
  league?: string | null,
): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.trim().length < 2) return [];
  const first = [getCustomTeamLogo(teamName), getCuratedLogo(teamName, sport), getCountryFlag(teamName, sport, league)].filter(
    (c): c is LogoCandidate => !!c,
  );
  const online = await searchOnline(teamName, sport, league).catch(() => []);
  const seen = new Set<string>();
  return [...first, ...online]
    .filter((c) => !seen.has(c.url) && (seen.add(c.url), true))
    .slice(0, 15);
};

/** The best single logo URL, or null. */
export const fetchTeamLogoUrl = async (teamName: string, sport?: string | null, league?: string | null): Promise<string | null> =>
  (await resolveTeamLogos(teamName, sport, { league }))[0] ?? null;
