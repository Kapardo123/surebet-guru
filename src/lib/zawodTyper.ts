import { supabase } from "@/integrations/supabase/client";
import { ScrapedMatch } from "@/lib/sportyTrader";

// ---------------------------------------------------------------------------
// ZawodTyper import.
//
// Two deliberately separate steps:
//   1. fetchZawodTyperList()  — pulls the whole day (~115 tips). No AI, no cost.
//   2. analyzeMatches()       — runs ONLY on the matches the admin selected,
//                               and writes the English prediction/league/analysis.
//
// Keeping AI out of step 1 is the whole point: the source publishes far more
// tips per day than SportyTrader, so rewriting all of them up front would be
// mostly wasted tokens on rows that are never imported.
// ---------------------------------------------------------------------------

// Result of checking the tipster-typed kickoff against an independent fixture
// list (odds-api.io), performed server-side by zawodtyper-proxy.
export interface KickoffCheck {
  status: "confirmed" | "time_mismatch" | "cancelled" | "not_found";
  officialKickoff: string | null; // "YYYY-MM-DD HH:MM", Europe/Warsaw
  officialLeague: string | null;
  matchedName: string | null;
  confidence: number;
}

// One tip as returned by the zawodtyper-proxy edge function (raw, Polish).
export interface ZawodTyperMatch {
  id: string; // "zt:<comment_id>" — namespaced for the shared imported_matches table
  sourceId: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string; // always "" from the source; filled in by the AI step
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  kickoff: string; // "YYYY-MM-DD HH:MM"
  predictionRaw: string; // Polish, as written by the tipster
  odds: number;
  bookmaker: string;
  analysisRaw: string; // Polish tipster note
  authorName: string;
  authorRatio: number; // 0..1 hit rate
  authorBets: number; // how many tips that author has settled
  authorRank: number | null; // position in the site's top 200, null if unranked
  settled: boolean;
  result: string | null;
  isBetbuilder: boolean;
  likeCount: number;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  // null when the sport has no fixture list to check against (e.g. Speedway).
  check: KickoffCheck | null;
}

// What the AI step produces for a selected match.
export interface ZawodTyperAnalysis {
  prediction: string; // English market label
  league: string; // inferred competition
  analysis: string; // English copy for the tip description
  // false when ai-analyze could not reach the model and fell back to the raw
  // Polish source text. Such rows must not be published as-is.
  ok: boolean;
}

// --- step 1: scrape (no AI) -------------------------------------------------

export const fetchZawodTyperList = async (
  date?: string,
): Promise<{ date: string; postId: string; matches: ZawodTyperMatch[] }> => {
  const { data, error } = await supabase.functions.invoke("zawodtyper-proxy", {
    body: { action: "list", ...(date ? { date } : {}) },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return {
    date: data?.date || date || "",
    postId: data?.postId || "",
    matches: (data?.matches || []) as ZawodTyperMatch[],
  };
};

// --- step 2: AI, on the selected matches only -------------------------------

export const analyzeMatches = async (
  matches: ZawodTyperMatch[],
): Promise<ZawodTyperAnalysis[]> => {
  if (matches.length === 0) return [];
  const { data, error } = await supabase.functions.invoke("ai-analyze", {
    body: {
      matches: matches.map((m) => ({
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        sport: m.sport,
        predictionRaw: m.predictionRaw,
        odds: m.odds,
        kickoff: m.kickoff,
        analysisRaw: m.analysisRaw,
      })),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  // Treat a missing ok flag as a failure rather than a pass, so an older
  // deployment of ai-analyze cannot smuggle raw Polish text through.
  return ((data?.analyses || []) as ZawodTyperAnalysis[]).map((a) => ({
    ...a,
    ok: a?.ok === true,
  }));
};

// --- bridging to the existing import pipeline -------------------------------

// The Admin panel routes SportyTrader matches through a ScrapedMatch shape;
// reuse it so Tip / Hero / Coupon handling stays in one place.
//
// Where the fixture list and the tipster disagree, the fixture list wins: its
// kickoff and competition are authoritative, the tipster's are hand-typed. That
// is the point of verifying — a flagged tip gets imported with the real time.
export const toScrapedMatch = (
  m: ZawodTyperMatch,
  analysis?: ZawodTyperAnalysis,
): ScrapedMatch => {
  const official = m.check?.officialKickoff || null;
  const kickoff = official || m.kickoff;
  const [date, time] = kickoff.split(" ");

  return {
    id: m.id,
    url: m.url,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    sport: m.sport,
    // Verified competition beats the model's guess, which beats nothing.
    league: m.check?.officialLeague || analysis?.league || m.league,
    date: date || m.date,
    time: time || m.time,
    kickoff,
    prediction: analysis?.prediction || m.predictionRaw,
    odds: m.odds,
    analysisRaw: m.analysisRaw,
    homeTeamLogo: m.homeTeamLogo,
    awayTeamLogo: m.awayTeamLogo,
  };
};

// --- cache (survives tab switches and reloads, like the SportyTrader one) ----

const CACHE_KEY = "gsb_zawodtyper_fetched";

export interface ZawodTyperCache {
  ts: number;
  date: string;
  matches: ZawodTyperMatch[];
  analyses: Record<string, ZawodTyperAnalysis>; // by match id, only generated ones
}

export const readZTCache = (): ZawodTyperCache | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ZawodTyperCache;
    if (!Array.isArray(parsed?.matches)) return null;
    return { ...parsed, analyses: parsed.analyses || {} };
  } catch {
    return null;
  }
};

export const writeZTCache = (cache: ZawodTyperCache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota errors */
  }
};

export const clearZTCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
};

// --- deduplication ----------------------------------------------------------
// Shares the imported_matches table with SportyTrader; ZawodTyper rows are
// namespaced with the "zt:" id prefix so a reset can target one source only.

const ZT_PREFIX = "zt:";

export const getImportedZTIds = async (): Promise<Set<string>> => {
  try {
    const { data, error } = await (supabase as any)
      .from("imported_matches")
      .select("source_id")
      .like("source_id", `${ZT_PREFIX}%`);
    if (error) throw error;
    return new Set<string>((data || []).map((r: any) => String(r.source_id)));
  } catch (e) {
    console.warn("[zawodTyper] getImportedZTIds failed:", e);
    return new Set();
  }
};

export const clearImportedZTIds = async (): Promise<void> => {
  const { error } = await (supabase as any)
    .from("imported_matches")
    .delete()
    .like("source_id", `${ZT_PREFIX}%`);
  if (error) throw error;
};

// --- local filtering helpers ------------------------------------------------

export interface ZTFilters {
  sport: string; // "All" or a mapped sport label
  minOdds: number;
  maxOdds: number;
  minRatio: number; // 0..1, author hit rate
  minBets: number; // author sample size — a 100% rate over 2 tips means little
  hideSettled: boolean; // drop tips whose match already finished
  hideBetbuilder: boolean;
  // Keep only tips whose kickoff an independent fixture list confirmed.
  onlyVerified: boolean;
  search: string;
}

export const defaultZTFilters: ZTFilters = {
  sport: "All",
  minOdds: 1.5,
  maxOdds: 5,
  minRatio: 0,
  minBets: 0,
  hideSettled: true,
  hideBetbuilder: false,
  onlyVerified: false,
  search: "",
};

export const applyZTFilters = (
  matches: ZawodTyperMatch[],
  f: ZTFilters,
  importedIds: Set<string>,
): ZawodTyperMatch[] => {
  const needle = f.search.trim().toLowerCase();
  return matches.filter((m) => {
    if (importedIds.has(m.id)) return false;
    if (f.sport !== "All" && m.sport !== f.sport) return false;
    if (m.odds < f.minOdds || m.odds > f.maxOdds) return false;
    if (m.authorRatio < f.minRatio) return false;
    if (m.authorBets < f.minBets) return false;
    if (f.hideSettled && m.settled) return false;
    if (f.hideBetbuilder && m.isBetbuilder) return false;
    if (f.onlyVerified && m.check?.status !== "confirmed") return false;
    if (needle) {
      const hay = `${m.homeTeam} ${m.awayTeam} ${m.predictionRaw} ${m.authorName}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
};
