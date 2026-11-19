import { LogoCandidate, SportKind, bareKey, isWomen, nameScore, teamKey } from "@/lib/logoNames";

/*
 * Choosing the logo. Every candidate starts from how well its team name
 * matches, then:
 *  - sources are weighted by how reliable their logos are;
 *  - a reserve, youth or women's side loses when the tip isn't one;
 *  - a team from the tip's country or league wins over a namesake abroad
 *    (Arsenal vs Arsenal Tula, Valencia vs Valencia in Venezuela);
 *  - crests beat text logos and page pictures;
 *  - the same team found by several sources earns trust.
 * The browser then checks that the top images really load and look like a
 * logo (not a wide stadium photo) before they're used.
 */

export interface RankContext {
  teamName: string;
  kind: SportKind;
  league?: string | null;
}

// How much each source's logos can be trusted, by source name prefix.
const TRUST: [RegExp, number][] = [
  [/^custom/i, 1.3],
  [/^(curated|nba)$/i, 1.15],
  [/^flag$/i, 1.1],
  [/^(espn|openligadb)$/i, 1.1], // league directories: the team is in that league
  [/^thesportsdb$/i, 1.02],
  [/^espn search$/i, 1.0],
  [/^(sofascore|fotmob)$/i, 0.97],
  [/^wikidata$/i, 0.9],
  [/^wikipedia/i, 0.8],
];
const trust = (source: string) => TRUST.find(([re]) => re.test(source))?.[1] ?? 0.9;

/** Second teams, reserves and youth sides: "Barcelona B", "Bayern II", "Ajax U21", "Jong Ajax". */
export const isReserve = (name: string): boolean => {
  const words = teamKey(name).split(" ");
  return words.some((w, i) =>
    /^(ii|iii|reserves?|youth|academy|juniors?|primavera|jong|castilla|u1[5-9]|u2[0-3])$/.test(w) ||
    // A lone "B" or "2" at the end: "Barcelona B", "Bayern 2". Not "Bayer 04".
    (i === words.length - 1 && words.length > 1 && /^(b|2)$/.test(w)),
  );
};

// League -> country, for picking the right namesake. Checked in order.
const LEAGUE_COUNTRY: [RegExp, string][] = [
  [/ukrain/, "ukraine"],
  [/saudi|roshn/, "saudi arabia"],
  [/scotland|scottish|premiership/, "scotland"],
  [/austria/, "austria"],
  [/brasil|brazil|brasileir/, "brazil"],
  [/argentin/, "argentina"],
  [/mls|major league soccer|nwsl|usa/, "usa"],
  [/liga mx|mexico/, "mexico"],
  [/premier league|championship|league one|league two|fa cup|carabao|efl|wsl|england/, "england"],
  [/la ?liga|segunda|copa del rey|liga f|spain/, "spain"],
  [/bundesliga|dfb|3 liga|germany/, "germany"],
  [/serie a|serie b|coppa italia|italy/, "italy"],
  [/ligue 1|ligue 2|coupe de france|france/, "france"],
  [/eredivisie|netherlands/, "netherlands"],
  [/primeira liga|liga portugal|portugal/, "portugal"],
  [/super ?lig|turkey/, "turkey"],
  [/jupiler|belgi/, "belgium"],
  [/ekstraklasa|i liga|puchar polski|plusliga|plk|orlen|poland|polska/, "poland"],
  [/greece|greek/, "greece"],
  [/swiss|switzerland/, "switzerland"],
  [/denmark|danish|superliga/, "denmark"],
  [/norway|norwegian|eliteserien|toppserien/, "norway"],
  [/sweden|swedish|allsvenskan|shl/, "sweden"],
  [/czech|extraliga/, "czech republic"],
  [/croatia|hnl/, "croatia"],
  [/serbia/, "serbia"],
  [/romania/, "romania"],
];

// Sources spell countries differently.
const COUNTRY_ALIASES: Record<string, string> = {
  "united states": "usa",
  "united states of america": "usa",
  czechia: "czech republic",
  turkiye: "turkey",
  holland: "netherlands",
};
const countryOf = (s?: string | null) => {
  const k = teamKey(s || "");
  return k ? COUNTRY_ALIASES[k] ?? k : null;
};

export const leagueCountry = (league?: string | null): string | null => {
  const l = teamKey(league || "");
  return l ? LEAGUE_COUNTRY.find(([re]) => re.test(l))?.[1] ?? null : null;
};

/** The final score used to order candidates. Exported for tests. */
export const finalScore = (c: LogoCandidate, ctx: RankContext, all: LogoCandidate[] = []): number => {
  let s = (c.score ?? 0) * trust(c.source);

  // Reserve or youth side when the tip isn't about one (a senior crest for
  // a youth tip is fine: it's the same club).
  if (isReserve(c.teamName) && !isReserve(ctx.teamName)) s -= 40;
  // A women's side for a men's tip: usually the same crest, but a tell.
  const womenTip = isWomen(ctx.teamName, ctx.league);
  if (isWomen(c.teamName, c.meta?.league) && !womenTip) s -= 25;

  // Namesakes: the tip's country and league win.
  const want = leagueCountry(ctx.league);
  const got = countryOf(c.meta?.country);
  if (want && got) s += got === want ? 12 : -25;
  if (ctx.league && c.meta?.league && nameScore(c.meta.league, ctx.league) >= 70) s += 10;

  // Crests over text logos and page pictures.
  if (c.meta?.type === "wordmark") s -= 8;
  if (c.meta?.type === "thumb") s -= 10;

  // The same team found by other sources.
  const key = bareKey(c.teamName);
  const sources = new Set(all.filter((o) => o.source !== c.source && bareKey(o.teamName) === key).map((o) => o.source));
  s += Math.min(sources.size, 2) * 6;

  return s;
};

/** Candidates, deduped by URL, best first. */
export const rankCandidates = (list: LogoCandidate[], ctx: RankContext): LogoCandidate[] => {
  const seen = new Set<string>();
  const unique = list.filter((c) => !!c.url && !seen.has(c.url) && (seen.add(c.url), true));
  const scored = unique.map((c) => ({ c, s: finalScore(c, ctx, unique) }));
  // Ties: the shorter name is the closer one ("Arsenal" over "Arsenal Tula").
  scored.sort((a, b) => b.s - a.s || a.c.teamName.length - b.c.teamName.length);
  return scored.map(({ c, s }) => ({ ...c, score: Math.round(s) }));
};

// ---------------------------------------------------------------------------
// Image check in the browser
// ---------------------------------------------------------------------------

const probed = new Map<string, Promise<boolean>>();

/**
 * Loads the image and checks it looks like a logo: big enough and roughly
 * square (a crest, a flag), not a wide photo. Without a DOM (tests) it passes.
 */
export const probeLogo = (url: string, ms = 5000): Promise<boolean> => {
  if (typeof Image === "undefined" || /^data:/i.test(url)) return Promise.resolve(true);
  let p = probed.get(url);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      const timer = setTimeout(() => resolve(false), ms);
      img.onload = () => {
        clearTimeout(timer);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        resolve(w >= 24 && h >= 24 && w / h <= 1.6 && h / w <= 1.6);
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
      img.referrerPolicy = "no-referrer";
      img.src = url;
    });
    probed.set(url, p);
  }
  return p;
};

/** Keeps the order, drops images that don't load or don't look like a logo. */
export const keepWorking = async (list: LogoCandidate[], max = 4): Promise<LogoCandidate[]> => {
  const top = list.slice(0, max + 2);
  const ok = await Promise.all(top.map((c) => probeLogo(c.url)));
  return top.filter((_, i) => ok[i]).slice(0, max);
};
