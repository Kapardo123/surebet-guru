import { Capacitor } from "@capacitor/core";

/* Shared helpers for the team logo lookup: names, sports, scoring, fetch. */

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

// Legal-form, sport and team-type words that say nothing about which club it is.
const AFFIXES = new Set([
  "fc", "cf", "afc", "sc", "ac", "as", "ss", "ssc", "us", "bc", "kk", "bk", "sk", "fk", "nk", "cd", "ud", "rc", "rcd",
  "sl", "bsc", "tsg", "vfb", "vfl", "sv", "if", "ff", "ks", "mks", "club", "calcio", "futbol", "football", "soccer",
  "basket", "basketball", "baloncesto", "basquet", "pallacanestro", "team", "the", "volley", "volleyball", "handball",
  "hc", "hk", "ehc",
  // Club-form prefixes: Polish (KKS Lech), German (TSV, FSV), Balkan and Romanian (OFK, CS).
  "kks", "gks", "lks", "wks", "rks", "zks", "tks", "tsv", "fsv", "ofk", "cs", "csm",
  // Women's sides carry the club's crest: "Arsenal Women" looks like Arsenal.
  "women", "womens", "ladies", "feminino", "femenino", "femenina", "feminine", "feminin", "frauen", "damen", "kobiet", "kobiety", "kobieca", "reprezentacja",
  "wfc", "lfc",
]);

// One spelling per word, so "Man Utd" meets "Manchester United" and
// "Bayern München" meets "Bayern Munich". Applied to both sides of a match.
const SYNONYMS: Record<string, string> = {
  utd: "united", man: "manchester", st: "saint", ste: "sainte", munchen: "munich", koln: "cologne",
  wien: "vienna", praha: "prague", warszawa: "warsaw", beograd: "belgrade", kobenhavn: "copenhagen",
  lisboa: "lisbon", moskva: "moscow", kyiv: "kiev", kiew: "kiev", bucuresti: "bucharest", athina: "athens",
  internazionale: "inter", ath: "athletic", atl: "atletico", wolverhampton: "wolves",
  psg: "paris saint germain", sixers: "76ers", cavs: "cavaliers", mavs: "mavericks",
};

/**
 * teamKey without legal forms, sport words and women's markers, with common
 * spellings unified: "FC Bayern München" -> "bayern munich".
 */
export const bareKey = (name: string): string => {
  const raw = teamKey(name).split(" ").filter(Boolean);
  let words = raw.map((w) => SYNONYMS[w] ?? w).join(" ").split(" ").filter((w) => !AFFIXES.has(w));
  // A trailing "W" marks a women's side ("Chelsea W"); age groups too ("Poland U21").
  words = words.filter((w, i) => !(i === words.length - 1 && words.length > 1 && (w === "w" || /^u\d{2}$/.test(w))));
  return words.length ? words.join(" ") : teamKey(name);
};

/** Is this a women's team or competition? */
export const isWomen = (...texts: (string | null | undefined)[]): boolean =>
  texts.some((t) => {
    const k = teamKey(t || "");
    return (
      /\b(women|womens|ladies|feminino|femenino|femenina|feminine|feminin|frauen|damen|kobiet|kobieca|kobiety|wsl|nwsl|liga f|wnba|damallsvenskan|toppserien|wchampions|mistrzyn)\b/.test(k) ||
      / w$/.test(k)
    );
  });

export type SportKind =
  | "football"
  | "basketball"
  | "hockey"
  | "volleyball"
  | "handball"
  | "american-football"
  | "baseball"
  | "other";

export const sportKind = (sport?: string | null): SportKind => {
  const s = (sport || "").toLowerCase();
  if (!s) return "other";
  if (s.includes("basket") || s.includes("nba") || s.includes("koszyk")) return "basketball";
  if (s.includes("hockey") || s.includes("hokej") || s.includes("nhl")) return "hockey";
  if (s.includes("volley") || s.includes("siatk")) return "volleyball";
  if (s.includes("handball") || s.includes("ręczn") || s.includes("reczn")) return "handball";
  if (s.includes("american") || s.includes("nfl") || s.includes("amerykań") || s.includes("amerykan")) return "american-football";
  if (s.includes("baseball") || s.includes("mlb")) return "baseball";
  if (s.includes("football") || s.includes("soccer") || s.includes("piłka") || s.includes("pilka")) return "football";
  return "other";
};

// What each source calls the sport.
export const SPORT_WORDS: Record<Exclude<SportKind, "other">, RegExp> = {
  football: /\b(soccer|association football|football club|footballclub|football)\b/i,
  basketball: /\bbasketball\b/i,
  hockey: /\b(ice hockey|hockey)\b/i,
  volleyball: /\bvolleyball\b/i,
  handball: /\bhandball\b/i,
  "american-football": /\b(american football|nfl|gridiron)\b/i,
  baseball: /\bbaseball\b/i,
};

/** Does a source's sport label agree with the tip's? Unknown on either side = yes. */
export const sportAgrees = (kind: SportKind, label?: string | null): boolean => {
  if (kind === "other" || !label) return true;
  const l = label.toLowerCase().replace(/[-_]/g, " ");
  switch (kind) {
    case "football":
      return /soccer|football/.test(l) && !/american|australian|basket|futsal|beach/.test(l);
    case "american-football":
      return /american football|american-football|nfl/.test(l) || l === "football";
    case "basketball":
      return /basket/.test(l);
    case "hockey":
      return /hockey/.test(l) && !/field/.test(l);
    default:
      return SPORT_WORDS[kind].test(l);
  }
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
  /** Name similarity to the searched team, 0..100 (300 = uploaded by the admin). */
  score?: number;
  /** What the source says about the team, used to pick between candidates. */
  meta?: {
    country?: string | null;
    league?: string | null;
    /** badge = crest (best); wordmark = text logo; thumb = page picture. */
    type?: "badge" | "wordmark" | "thumb";
  };
}

// Broken/hotlink-protected junk must not enter the cache chain.
export const isValidLogoUrl = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u.trim());

// Hard cap per request so one slow or hung source never stalls rendering.
// With CapacitorHttp (native) the fetch goes through the Android bridge and
// aborting it can crash the app, so no AbortController there.
const IS_NATIVE = Capacitor.isNativePlatform();
export const fetchJson = async (url: string, ms = 7000): Promise<any | null> => {
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

