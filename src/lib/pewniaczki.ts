import { supabase } from "@/integrations/supabase/client";
import { ScrapedMatch } from "@/lib/sportyTrader";

// ---------------------------------------------------------------------------
// Pewniaczki import.
//
// Two deliberately separate steps, like ZawodTyper:
//   1. fetchPewniaczkiList()  — pulls a day's tips from pewniaczki-proxy. No AI.
//   2. analyzeMatches()       — runs ONLY on the matches the admin selected and
//                               WRITES the English analysis.
//
// pewniaczki.pl hub pages show only a short pick; the written analysis lives on
// each match's own page and is scraped into analysisRaw by pewniaczki-proxy.
// The AI step therefore behaves like ZawodTyper: a faithful translation of that
// analysis (mode auto-detected as "rewrite"); it only falls back to writing from
// the market when a match genuinely has no note.
// ---------------------------------------------------------------------------

export type PewniakDay = "today" | "tomorrow";

export interface PewniakMatch {
  id: string;
  sourceId: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  kickoff: string; // "YYYY-MM-DD HH:MM"
  predictionRaw: string; // Polish short pick
  odds: number;
  bookmaker: string;
  analysisRaw: string; // Polish analysis from the match page ("" if none)
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  settled: boolean;
}

export interface PewniakAnalysis {
  prediction: string; // English market label
  league: string; // inferred competition
  analysis: string; // English copy for the tip description
  homeTeam?: string; // canonical English names (for logo lookups)
  awayTeam?: string;
  // false when ai-analyze could not reach the model. Such rows must not be
  // published — there is no source text to fall back on.
  ok: boolean;
}

// --- step 1: scrape (no AI) -------------------------------------------------

export const fetchPewniaczkiList = async (
  day: PewniakDay,
): Promise<{ day: PewniakDay; date: string; matches: PewniakMatch[] }> => {
  const { data, error } = await supabase.functions.invoke("pewniaczki-proxy", {
    body: { action: "list", day },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return {
    day: (data?.day as PewniakDay) || day,
    date: data?.date || "",
    matches: (data?.matches || []) as PewniakMatch[],
  };
};

// --- step 2: AI, on the selected matches only -------------------------------

export const analyzeMatches = async (
  matches: PewniakMatch[],
  grounded = true,
): Promise<PewniakAnalysis[]> => {
  if (matches.length === 0) return [];
  const { data, error } = await supabase.functions.invoke("ai-analyze", {
    body: {
      grounded,
      matches: matches.map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        sport: m.sport,
        league: m.league,
        predictionRaw: m.predictionRaw,
        odds: m.odds,
        kickoff: m.kickoff,
        analysisRaw: m.analysisRaw,
      })),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return ((data?.analyses || []) as PewniakAnalysis[]).map((a) => ({
    ...a,
    ok: a?.ok === true,
  }));
};

// --- canonical team names ---------------------------------------------------

export const applyAnalysisNames = (
  matches: PewniakMatch[],
  analyses: Record<string, PewniakAnalysis>,
): PewniakMatch[] =>
  matches.map((m) => {
    const a = analyses[m.id];
    if (!a?.ok) return m;
    const homeTeam = (a.homeTeam || "").trim();
    const awayTeam = (a.awayTeam || "").trim();
    if (!homeTeam && !awayTeam) return m;
    return {
      ...m,
      ...(homeTeam ? { homeTeam } : {}),
      ...(awayTeam ? { awayTeam } : {}),
    };
  });

// --- bridging to the existing import pipeline -------------------------------

export const toScrapedMatch = (
  m: PewniakMatch,
  analysis?: PewniakAnalysis,
): ScrapedMatch => {
  const [date, time] = m.kickoff.split(" ");
  return {
    id: m.id,
    url: m.url,
    homeTeam: analysis?.homeTeam || m.homeTeam,
    awayTeam: analysis?.awayTeam || m.awayTeam,
    sport: m.sport,
    league: analysis?.league || m.league,
    date: date || m.date,
    time: time || m.time,
    kickoff: m.kickoff,
    prediction: analysis?.prediction || m.predictionRaw,
    odds: m.odds,
    analysisRaw: "",
    homeTeamLogo: m.homeTeamLogo,
    awayTeamLogo: m.awayTeamLogo,
  };
};

// --- cache (survives tab switches and reloads) ------------------------------

const CACHE_KEY = "gsb_pewniaczki_fetched";

export interface PewniakCache {
  ts: number;
  day: PewniakDay;
  matches: PewniakMatch[];
  analyses: Record<string, PewniakAnalysis>;
}

export const readPwCache = (): PewniakCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PewniakCache;
    if (!Array.isArray(parsed?.matches)) return null;
    return { ...parsed, analyses: parsed.analyses || {} };
  } catch {
    return null;
  }
};

export const writePwCache = (cache: PewniakCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
};

export const clearPwCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
};

// --- deduplication ----------------------------------------------------------
// Shares imported_matches with the other sources; pewniaczki rows are
// namespaced with "pw:" so a reset can target this source only.

const PW_PREFIX = "pw:";

export const getImportedPwIds = async (): Promise<Set<string>> => {
  try {
    const { data, error } = await (supabase as any)
      .from("imported_matches")
      .select("source_id")
      .like("source_id", `${PW_PREFIX}%`);
    if (error) throw error;
    return new Set<string>((data || []).map((r: any) => String(r.source_id)));
  } catch (e) {
    console.warn("[pewniaczki] getImportedPwIds failed:", e);
    return new Set();
  }
};

export const clearImportedPwIds = async (): Promise<void> => {
  const { error } = await (supabase as any)
    .from("imported_matches")
    .delete()
    .like("source_id", `${PW_PREFIX}%`);
  if (error) throw error;
};

// --- local filtering helpers ------------------------------------------------

export interface PwFilters {
  sport: string; // "All" or a mapped sport label
  minOdds: number;
  maxOdds: number;
  hideSettled: boolean;
  search: string;
}

export const defaultPwFilters: PwFilters = {
  sport: "All",
  minOdds: 1.3,
  maxOdds: 6,
  hideSettled: true,
  search: "",
};

export const applyPwFilters = (
  matches: PewniakMatch[],
  f: PwFilters,
  importedIds: Set<string>,
): PewniakMatch[] => {
  const needle = f.search.trim().toLowerCase();
  return matches.filter((m) => {
    if (importedIds.has(m.id)) return false;
    if (f.sport !== "All" && m.sport !== f.sport) return false;
    if (m.odds < f.minOdds || m.odds > f.maxOdds) return false;
    if (f.hideSettled && m.settled) return false;
    if (needle) {
      const hay = `${m.homeTeam} ${m.awayTeam} ${m.predictionRaw} ${m.league}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
};
