import { LogoCandidate, SportKind, bareKey, fetchJson, isValidLogoUrl, isWomen, nameScore, teamKey } from "@/lib/logoNames";

/*
 * League directories: one request returns every team in a league with its
 * official logo, so whole leagues are covered without hand-typed URLs.
 * Each directory is cached in this browser for a week (a failed one for a
 * day). The tip's league picks the directory to open first; without one, the
 * big leagues for the sport are tried in turn.
 */

export interface DirTeam {
  names: string[];
  logo: string;
}

interface Directory {
  id: string;
  sport: SportKind;
  /** Women's competition: only opened for women's tips. */
  women?: boolean;
  url: string;
  parse: (data: any) => DirTeam[];
}

// ---------------------------------------------------------------------------
// Parsers (exported for tests)
// ---------------------------------------------------------------------------

/** ESPN site API: /apis/site/v2/sports/{sport}/{league}/teams */
export const parseEspnTeams = (data: any): DirTeam[] => {
  const out: DirTeam[] = [];
  for (const sport of data?.sports ?? []) {
    for (const league of sport?.leagues ?? []) {
      for (const row of league?.teams ?? []) {
        const t = row?.team ?? row;
        const logos: any[] = t?.logos ?? [];
        // Prefer the default full-colour logo over dark/scoreboard variants.
        const logo =
          logos.find((l) => l?.rel?.includes("default") && !l?.rel?.includes("dark"))?.href ?? logos[0]?.href ?? t?.logo;
        if (!isValidLogoUrl(logo)) continue;
        const names = [t.displayName, t.shortDisplayName, t.name, t.nickname, t.location && t.name ? `${t.location} ${t.name}` : null]
          .filter((n): n is string => typeof n === "string" && n.trim().length > 1);
        if (names.length) out.push({ names: [...new Set(names)], logo });
      }
    }
  }
  return out;
};

/** TheSportsDB: /search_all_teams.php?l={league} */
export const parseTsdbTeams = (data: any): DirTeam[] => {
  const out: DirTeam[] = [];
  for (const t of data?.teams ?? []) {
    const logo = t?.strBadge || t?.strTeamBadge;
    if (!isValidLogoUrl(logo)) continue;
    const names = [t.strTeam, t.strTeamShort, ...String(t.strTeamAlternate || "").split(",")]
      .map((n) => (typeof n === "string" ? n.trim() : ""))
      .filter((n) => n.length > 1);
    if (names.length) out.push({ names: [...new Set(names)], logo });
  }
  return out;
};

// ---------------------------------------------------------------------------
// The directories
// ---------------------------------------------------------------------------

// ESPN's path segment per sport ("football" there is American football).
const ESPN_SPORT: Partial<Record<SportKind, string>> = {
  football: "soccer",
  basketball: "basketball",
  hockey: "hockey",
  "american-football": "football",
  baseball: "baseball",
};

const espn = (sport: SportKind, slug: string, women = false): Directory => ({
  id: `espn:${slug}`,
  sport,
  women,
  url: `https://site.api.espn.com/apis/site/v2/sports/${ESPN_SPORT[sport] ?? "soccer"}/${slug}/teams?limit=500`,
  parse: parseEspnTeams,
});

const tsdb = (sport: SportKind, league: string, women = false): Directory => ({
  id: `tsdb:${league}`,
  sport,
  women,
  url: `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(league)}`,
  parse: parseTsdbTeams,
});

/** League name patterns -> directory. First match wins, so specific ones go first. */
const LEAGUES: [RegExp, Directory][] = [
  // --- Women's football (only for women's tips; the club's men's league is
  //     tried next, since women's sides carry the same crest)
  [/champions league|liga mistrzyn|wchampions/, espn("football", "uefa.wchampions", true)],
  [/world cup|mundial|mistrzostw swiata/, espn("football", "fifa.wwc", true)],
  [/euro/, espn("football", "uefa.weuro", true)],
  [/\bwsl\b|super league|england|anglia/, espn("football", "eng.w.1", true)],
  [/nwsl|usa|national women/, espn("football", "usa.nwsl", true)],
  [/liga f|spain|hiszpania/, espn("football", "esp.1")],
  [/frauen|germany|niemcy/, espn("football", "ger.1")],
  [/premiere ligue|d1 arkema|division 1|france|francja/, espn("football", "fra.1")],
  [/serie a|italy|wlochy/, espn("football", "ita.1")],
  [/eredivisie|vrouwen|netherlands|holandia/, espn("football", "ned.1")],
  [/ekstraliga|poland|polska/, tsdb("football", "Polish Ekstraklasa")],
  [/damallsvenskan|sweden|szwecja/, tsdb("football", "Swedish Allsvenskan")],
  [/toppserien|norway|norwegia/, tsdb("football", "Norwegian Eliteserien")],
  // --- National teams
  [/world cup qual|eliminacje ms|wc qual/, espn("football", "fifa.worldq.uefa")],
  [/world cup|mundial|mistrzostwa swiata/, espn("football", "fifa.world")],
  [/nations league|liga narodow/, espn("football", "uefa.nations")],
  [/euro qual|eliminacje euro/, espn("football", "uefa.euroq")],
  [/\beuro\b|european championship|mistrzostwa europy/, espn("football", "uefa.euro")],
  [/copa america/, espn("football", "conmebol.america")],
  [/friendl|towarzysk/, espn("football", "fifa.friendly")],
  [/club world cup|klubowe/, espn("football", "fifa.cwc")],
  [/libertadores/, espn("football", "conmebol.libertadores")],
  [/sudamericana/, espn("football", "conmebol.sudamericana")],
  [/fa cup|puchar anglii/, espn("football", "eng.fa")],
  [/carabao|league cup|efl cup/, espn("football", "eng.league_cup")],
  [/copa del rey|puchar krola/, espn("football", "esp.copa_del_rey")],
  [/dfb pokal|puchar niemiec/, espn("football", "ger.dfb_pokal")],
  [/coppa italia|puchar wloch/, espn("football", "ita.coppa_italia")],
  [/coupe de france|puchar francji/, espn("football", "fra.coupe_de_france")],
  [/puchar polski|polish cup/, tsdb("football", "Polish Ekstraklasa")],
  // --- Football: European cups
  [/champions league|liga mistrzow|ucl\b/, espn("football", "uefa.champions")],
  [/conference league|liga konferencji/, espn("football", "uefa.europa.conf")],
  [/europa league|liga europy/, espn("football", "uefa.europa")],
  // --- Football: second tiers before first tiers with the same words
  [/championship|efl/, espn("football", "eng.2")],
  [/league one/, espn("football", "eng.3")],
  [/2 bundesliga|bundesliga 2|zweite bundesliga/, espn("football", "ger.2")],
  [/serie b/, espn("football", "ita.2")],
  [/ligue 2/, espn("football", "fra.2")],
  [/segunda|laliga 2|la liga 2|laliga hypermotion/, espn("football", "esp.2")],
  [/\bi liga\b|1 liga polska|fortuna 1 liga|betclic 1 liga/, tsdb("football", "Polish I Liga")],
  // --- Football: leagues named with their country first, so "Ukrainian
  //     Premier League" or "Saudi Pro League" don't land in the generic ones
  [/brasileir|brazil|serie a betano|campeonato brasileiro/, espn("football", "bra.1")],
  [/austria|osterreich/, tsdb("football", "Austrian Bundesliga")],
  [/ukrain/, tsdb("football", "Ukrainian Premier League")],
  [/scottish|premiership|scotland|szkocja/, espn("football", "sco.1")],
  [/super ?league greece|greece|grecja/, tsdb("football", "Greek Superleague Greece")],
  [/swiss|switzerland|szwajcaria/, tsdb("football", "Swiss Super League")],
  [/serbia|serbian/, tsdb("football", "Serbian SuperLiga")],
  [/romania|liga i\b|rumunia/, tsdb("football", "Romanian Liga I")],
  [/czech|chance liga|czechy/, tsdb("football", "Czech First League")],
  [/croatia|hnl|chorwacja/, tsdb("football", "Croatian First Football League")],
  [/saudi|roshn/, espn("football", "ksa.1")],
  [/eliteserien|norway|norwegia/, tsdb("football", "Norwegian Eliteserien")],
  [/allsvenskan|sweden|szwecja/, tsdb("football", "Swedish Allsvenskan")],
  [/superliga|denmark|dania/, tsdb("football", "Danish Superliga")],
  [/ekstraklasa|poland|polska/, tsdb("football", "Polish Ekstraklasa")],
  [/liga mx|mexico|meksyk/, espn("football", "mex.1")],
  [/liga profesional|argentin/, espn("football", "arg.1")],
  [/mls|major league soccer/, espn("football", "usa.1")],
  // --- Football: the big leagues by name
  [/premier league|epl|england|anglia/, espn("football", "eng.1")],
  [/la ?liga|primera division|hiszpania|spain/, espn("football", "esp.1")],
  [/bundesliga|germany|niemcy/, espn("football", "ger.1")],
  [/serie a|italy|wlochy/, espn("football", "ita.1")],
  [/ligue 1|france|francja/, espn("football", "fra.1")],
  [/eredivisie|netherlands|holandia/, espn("football", "ned.1")],
  [/primeira liga|liga portugal|portugal|portugalia/, espn("football", "por.1")],
  [/super ?lig|turkey|turcja/, espn("football", "tur.1")],
  [/jupiler|pro league|belgium|belgia/, espn("football", "bel.1")],
  // --- Basketball
  [/wnba/, espn("basketball", "wnba")],
  [/nba/, espn("basketball", "nba")],
  [/ncaa|college/, espn("basketball", "mens-college-basketball")],
  [/euroleague|euroliga/, tsdb("basketball", "EuroLeague")],
  [/eurocup/, tsdb("basketball", "EuroCup")],
  [/acb|liga endesa|spanish basketball/, tsdb("basketball", "Spanish Liga ACB")],
  [/plk|orlen basket|energa basket|polish basketball/, tsdb("basketball", "Polish Basketball League")],
  [/lega basket|italian basketball/, tsdb("basketball", "Italian Lega Basket")],
  [/bbl|basketball bundesliga|german basketball/, tsdb("basketball", "German BBL")],
  [/lnb|betclic elite|pro a/, tsdb("basketball", "French LNB Pro A")],
  [/aba league|adriatic/, tsdb("basketball", "ABA League")],
  [/bsl|turkish basketball/, tsdb("basketball", "Turkish Basketball Super League")],
  [/greek basket|basket league greece/, tsdb("basketball", "Greek Basket League")],
  // --- Hockey
  [/nhl/, espn("hockey", "nhl")],
  [/khl/, tsdb("hockey", "Russian KHL")],
  [/shl|swedish hockey/, tsdb("hockey", "Swedish SHL")],
  [/liiga|finnish/, tsdb("hockey", "Finnish Liiga")],
  [/\bdel\b|deutsche eishockey/, tsdb("hockey", "German DEL")],
  [/extraliga|czech/, tsdb("hockey", "Czech Extraliga")],
  [/polska hokej|phl|polish hockey/, tsdb("hockey", "Polish Hockey League")],
  [/ahl/, tsdb("hockey", "American Hockey League")],
  // --- Volleyball
  [/plusliga/, tsdb("volleyball", "Polish PlusLiga")],
  [/tauron liga|liga siatkowki kobiet/, tsdb("volleyball", "Polish Tauron Liga", true)],
  [/superlega/, tsdb("volleyball", "Italian SuperLega")],
  [/volleyball champions league|cev/, tsdb("volleyball", "CEV Champions League")],
  // --- Handball
  [/ehf|champions league/, tsdb("handball", "EHF Champions League")],
  [/superliga|orlen superliga|polish handball/, tsdb("handball", "Polish Superliga Handball")],
  [/bundesliga|hbl/, tsdb("handball", "German Handball-Bundesliga")],
  [/liga asobal|asobal/, tsdb("handball", "Spanish Liga ASOBAL")],
  // --- American football and baseball
  [/nfl/, espn("american-football", "nfl")],
  [/ncaa|college/, espn("american-football", "college-football")],
  [/mlb/, espn("baseball", "mlb")],
];

const norm = (s: string) => teamKey(s);

/** Directories that fit a league name (and the sport, when known). */
export const directoriesForLeague = (
  league: string | null | undefined,
  kind: SportKind,
  women = false,
): Directory[] => {
  const l = norm(league || "");
  if (!l) return [];
  const sportOk = (d: Directory) => kind === "other" || d.sport === kind;
  // The women's block ends where the national-team block starts.
  const womenEnd = LEAGUES.findIndex(([, d]) => d.id === "espn:fifa.worldq.uefa");
  const rules = women ? LEAGUES.slice(0, womenEnd) : LEAGUES.slice(womenEnd);
  const found = rules.filter(([re, d]) => re.test(l) && sportOk(d)).map(([, d]) => d);
  // A women's league not on the list: the men's directory for the same name.
  if (women && found.length === 0) return directoriesForLeague(league, kind, false);
  return found.slice(0, 2);
};

// Tried in this order when the tip's league is unknown or not listed.
const DEFAULTS: Record<SportKind, string[]> = {
  football: ["uefa.champions", "uefa.europa", "eng.1", "esp.1", "ger.1", "ita.1", "fra.1", "uefa.europa.conf", "ned.1", "por.1", "fifa.world"],
  basketball: ["nba", "wnba"],
  hockey: ["nhl"],
  volleyball: [],
  handball: [],
  "american-football": ["nfl", "college-football"],
  baseball: ["mlb"],
  other: ["uefa.champions", "eng.1", "nba"],
};
// Women's tips: the women's competitions first, then the men's (same crests).
const WOMEN_DEFAULTS = ["uefa.wchampions", "eng.w.1", "usa.nwsl", "fifa.wwc"];

const defaultDirectories = (kind: SportKind, women = false): Directory[] =>
  [...(women && (kind === "football" || kind === "other") ? WOMEN_DEFAULTS : []), ...DEFAULTS[kind]]
    .map((slug) => LEAGUES.find(([, d]) => d.id === `espn:${slug}`)?.[1])
    .filter((d): d is Directory => !!d);

// ---------------------------------------------------------------------------
// Loading with a cache
// ---------------------------------------------------------------------------

const CACHE_KEY = "gsb_logo_dirs_v1";
const OK_TTL = 7 * 24 * 3600e3;
const FAIL_TTL = 24 * 3600e3;
type Cached = Record<string, { ts: number; teams: DirTeam[] }>;

const readCache = (): Cached => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
};
const writeCache = (id: string, teams: DirTeam[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), [id]: { ts: Date.now(), teams } }));
  } catch {
    /* quota: the directory is simply fetched again next time */
  }
};

const loading = new Map<string, Promise<DirTeam[]>>();

export const loadDirectory = (d: Directory): Promise<DirTeam[]> => {
  const hit = readCache()[d.id];
  if (hit && Date.now() - hit.ts < (hit.teams.length ? OK_TTL : FAIL_TTL)) return Promise.resolve(hit.teams);
  let p = loading.get(d.id);
  if (!p) {
    p = fetchJson(d.url, 9000)
      .then((data) => {
        const teams = data ? d.parse(data) : [];
        writeCache(d.id, teams);
        return teams;
      })
      .finally(() => loading.delete(d.id));
    loading.set(d.id, p);
  }
  return p;
};

/** Best team in a directory for a name: exact (ignoring FC etc.) or a close match. */
export const pickTeam = (teams: DirTeam[], teamName: string): { team: DirTeam; score: number } | null => {
  const q = bareKey(teamName);
  let best: { team: DirTeam; score: number } | null = null;
  for (const team of teams) {
    for (const n of team.names) {
      const score = bareKey(n) === q ? 100 : nameScore(n, teamName);
      if (score > (best?.score ?? 0)) best = { team, score };
    }
    if (best?.score === 100) break;
  }
  return best && best.score >= 85 ? best : null;
};

/**
 * The team's logo from the league directories: the tip's league first, then
 * the big leagues for the sport. Stops at the first convincing match.
 */
export const findInDirectories = async (
  teamName: string,
  kind: SportKind,
  league?: string | null,
): Promise<LogoCandidate | null> => {
  const women = isWomen(teamName, league);
  const dirs = [...directoriesForLeague(league, kind, women), ...defaultDirectories(kind, women)];
  const seen = new Set<string>();
  for (const d of dirs) {
    if (seen.has(d.id)) continue;
    seen.add(d.id);
    const found = pickTeam(await loadDirectory(d), teamName);
    if (found) {
      return { url: found.team.logo, source: d.id.startsWith("espn") ? "ESPN" : "TheSportsDB", teamName: found.team.names[0], score: found.score };
    }
  }
  return null;
};
