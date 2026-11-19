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
export const SPORT_WORDS: Record<Exclude<SportKind, "other">, RegExp> = {
  football: /\b(soccer|association football|football club|footballclub|football)\b/i,
  basketball: /\bbasketball\b/i,
  hockey: /\b(ice hockey|hockey)\b/i,
};

/** Does a source's sport label agree with the tip's? Unknown on either side = yes. */
export const sportAgrees = (kind: SportKind, label?: string | null): boolean => {
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

