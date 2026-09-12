// ============================================================================
// Team-name matching — shared by the client (tests, hints) and mirrored by the
// `team-logo` edge function. Handles PL→EN translation, youth variants and
// token-based scoring.
// ============================================================================

/** Lowercase, de-accent, strip everything non-alphanumeric. */
export const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/ß/g, "s")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

/** Like `normalize` but keeps single spaces (used for human-readable keys). */
export const normalizeSpaced = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/ß/g, "s")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const NAME_SYNONYMS: Record<string, string> = {
  polska: "poland", niemcy: "germany", anglia: "england", hiszpania: "spain",
  wlochy: "italy", francja: "france", holandia: "netherlands", belgia: "belgium",
  portugalia: "portugal", czechy: "czechia", szwajcaria: "switzerland",
  chorwacja: "croatia", ukraina: "ukraine", rosja: "russia", dania: "denmark",
  szwecja: "sweden", norwegia: "norway", szkocja: "scotland", walia: "wales",
  brazylia: "brazil", argentyna: "argentina", grecja: "greece", turcja: "turkey",
  rumunia: "romania", wegry: "hungary", bulgaria: "bulgaria", slowacja: "slovakia",
  slowenia: "slovenia", serbia: "serbia", izrael: "israel", japonia: "japan",
  "stany zjednoczone": "usa", "republika czeska": "czechia",
  druzyna: "team", reprezentacja: "team", klub: "club", pilka: "football",
  mlodziezowa: "youth",
  warszawa: "warsaw", moskwa: "moscow", kijow: "kyiv", londyn: "london",
  paryz: "paris", madryt: "madrid", mediolan: "milan", monachium: "munich",
  kolonia: "cologne", turyn: "turin", neapol: "naples", sewilla: "seville",
  lipsk: "leipzig", kopenhaga: "copenhagen", ateny: "athens", wieden: "vienna",
};

/** Replace Polish country/city words with their English equivalents. */
export const translateQuery = (name: string): string | null => {
  const tokens = normalizeSpaced(name).split(" ").filter(Boolean);
  let changed = false;
  const out = tokens.map((t) => {
    const syn = NAME_SYNONYMS[t];
    if (syn && syn !== t) {
      changed = true;
      return syn;
    }
    return t;
  });
  return changed ? out.join(" ") : null;
};

/** Tokens: de-accent, unify "under 19"/"U-19"/"U19" → "u19", apply synonyms. */
const normTokens = (s: string): string[] =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/under[\s-]?(\d{2})/gi, " u$1 ")
    .replace(/\bu[\s-]?(\d{2})\b/gi, " u$1 ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => NAME_SYNONYMS[t] || t);

/** Build search-query variants for a team (youth age handling included). */
export const makeQueries = (teamName: string): string[] => {
  const clean = teamName.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const queries: string[] = [];
  const set = new Set<string>();

  const add = (q: string) => {
    if (q && q.length >= 3 && !set.has(q.toLowerCase())) {
      set.add(q.toLowerCase());
      queries.push(q);
    }
  };

  const translated = translateQuery(teamName);
  const youth = clean.match(/\b(?:u|under)[\s-]?(\d{2})\b/i);
  if (youth) {
    const age = youth[1];
    const base = clean.replace(/\b(?:u|under)[\s-]?\d{2}\b/i, "").replace(/\s+/g, " ").trim();
    if (translated) {
      const tBase = translated.replace(/\b(?:u|under)[\s-]?\d{2}\b/i, "").replace(/\s+/g, " ").trim();
      add(`${tBase} under-${age}`);
      add(`${tBase} U${age}`);
    }
    add(`${base} U${age}`);
    add(`${base} under-${age}`);
    add(teamName.trim());
    if (translated) add(translated);
    add(base);
    return queries;
  }

  add(teamName.trim());
  add(clean);
  add(`${clean} FC`);
  add(`${clean} football`);
  add(`FC ${clean}`);
  if (translated) add(translated);

  return queries.slice(0, 6);
};

/** Token + normalized match score (0–200). Exact beats substring beats partial. */
export const matches = (candidate: string, query: string): number => {
  const ct = normTokens(candidate);
  const qt = normTokens(query);
  if (!ct.length || !qt.length) return 0;

  const cb = ct.join("");
  const qb = qt.join("");
  if (cb === qb) return 200;
  if (cb.includes(qb) || qb.includes(cb)) return 150;

  let matched = 0;
  for (const t of qt) {
    if (ct.some((x) => x === t || (t.length >= 3 && x.includes(t)) || (x.length >= 3 && t.includes(x)))) {
      matched++;
    }
  }
  let score = Math.round((matched / qt.length) * 100);

  const qYouth = qt.some((t) => /^u\d{2}$/.test(t));
  const cYouth = ct.some((t) => /^u\d{2}$/.test(t));
  if (qYouth && cYouth) score = Math.min(200, score + 40);
  if (qYouth && !cYouth) score = Math.min(score, 90);

  return score;
};
