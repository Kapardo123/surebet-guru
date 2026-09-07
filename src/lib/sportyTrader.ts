import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// SportyTrader import: scrape betting tips via the sportytrader-proxy edge fn,
// rewrite the analysis so it is not 1:1 with the source, and track which
// matches have already been imported (imported_matches table).
// ---------------------------------------------------------------------------

// From the listing cards: carries the recommended pick AND its odds.
export interface SportyListItem {
  id: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  kickoff: string; // "YYYY-MM-DD HH:MM"
  prediction: string;
  odds: number | null; // null when the card shows no odds
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

// From a match page: sport, league and the full analysis (no odds here).
export interface SportyMatchDetail {
  id: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  time: string;
  kickoff: string;
  prediction: string;
  odds: number | null;
  analysisRaw: string;
}

// Final merged match ready to import (odds from listing, details from match page).
export interface ScrapedMatch {
  id: string;
  url: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  league: string;
  date: string;
  time: string;
  kickoff: string;
  prediction: string;
  odds: number;
  analysisRaw: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
}

export type ImportTarget = "tip" | "hero" | "coupon" | "queue" | "publish";

// --- edge function calls ----------------------------------------------------

export const fetchSportyList = async (): Promise<SportyListItem[]> => {
  const { data, error } = await supabase.functions.invoke("sportytrader-proxy", {
    body: { action: "list" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.matches || []) as SportyListItem[];
};

// --- client-side odds extraction (bypasses anti-bot IP blocking) ------------
// SportyTrader serves the odds-bearing SSR HTML only to clients with a good
// reputation (residential IP + browser-like TLS). Datacenter IPs (Vercel,
// Supabase, public CORS proxies) receive the same listing but with every
// <bet-now-light odd="..."> value stripped ("hideodd" variant).
//
// Fetch strategy, best first:
//  1. DIRECT fetch — in the Android/iOS app CapacitorHttp routes fetch through
//     the native stack: no CORS, device IP, real browser TLS → full HTML.
//     In a web browser it fails instantly (no ACAO headers upstream) and we
//     fall through at no cost.
//  2. corsproxy.io WITH an API key (free tier: ~4000 req/mo, sign up at
//     corsproxy.io). Their ASN passes SportyTrader's bot checks and returns
//     the raw SSR HTML. Key can be set via VITE_CORSPROXY_KEY at build time
//     or localStorage "gsb_corsproxy_key" at runtime (no redeploy needed).
//  3. /api/sportytrader-odds (our Vercel edge) — datacenter IP, usually
//     hideodd, but costs nothing and occasionally works.
//  4. Keyless passthrough proxies (codetabs / allorigins / cors.lol) — flaky,
//     rate-limited, kept as last-resort backups.

interface ClientOddsMap {
  [matchId: string]: number;
}

const parseOddsFromCard = (card: string): number | null => {
  // 1. <bet-now-light> or <bet-now-large> with odd="X"
  const bnl = card.match(/<bet-now-(?:light|large)[\s\S]*?\bodd="([\d.]+)"/);
  if (bnl) {
    const v = parseFloat(bnl[1]);
    if (v > 0) return v;
  }
  // 2. "Odds" label followed by numeric span (most reliable, least false matches)
  const lbl = card.match(/Odds<\/span>\s*<span[^>]*>([\d.]+)<\/span>/);
  if (lbl) {
    const v = parseFloat(lbl[1]);
    if (v > 0) return v;
  }
  // 3. Any <span class="font-bold ..."> with a number (broader fallback)
  const fb = card.match(/<span[^>]*\bfont-bold\b[^>]*>([\d.]+)<\/span>/);
  if (fb) {
    const v = parseFloat(fb[1]);
    if (v > 0) return v;
  }
  return null;
};

const CLIENT_ODDS_TTL_MS = 3 * 60 * 1000;
let oddsCache: { map: ClientOddsMap; ts: number } | null = null;

const getCorsProxyKey = (): string => {
  let key = "";
  try {
    key = localStorage.getItem("gsb_corsproxy_key") || "";
  } catch {
    /* ignore */
  }
  if (!key) key = (import.meta.env.VITE_CORSPROXY_KEY as string | undefined) || "";
  return key.trim();
};

export const hasClientOddsSource = (): boolean => {
  if (Capacitor.isNativePlatform()) return true; // direct native fetch
  return getCorsProxyKey().length > 0;
};

export const fetchClientOdds = async (): Promise<ClientOddsMap> => {
  // Every click re-importing a match would otherwise hammer the proxies;
  // three minutes keeps values fresh enough for pre-match odds.
  if (oddsCache && Date.now() - oddsCache.ts < CLIENT_ODDS_TTL_MS) {
    return oddsCache.map;
  }

  const listingUrl = "https://www.sportytrader.com/en/betting-tips/";
  const encoded = encodeURIComponent(listingUrl);
  const corsKey = getCorsProxyKey();

  const proxies: { url: string; init?: RequestInit }[] = [
    // 1. Direct: device IP + native stack (Capacitor) or browser IP; the only
    //    channel guaranteed to receive odds. Web browsers hit CORS → skipped.
    {
      url: listingUrl,
      init: {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    },
    // 2. corsproxy.io with a (free) API key — proven to pass raw SSR with odds.
    ...(corsKey
      ? [{ url: `https://corsproxy.io/?url=${encoded}&key=${encodeURIComponent(corsKey)}` }]
      : []),
    // 3. Our Vercel edge (JSON, pre-parsed).
    { url: "/api/sportytrader-odds" },
    // 4-6. Keyless passthrough backups — frequently rate-limited or down.
    { url: `https://api.codetabs.com/v1/proxy?quest=${encoded}` },
    { url: `https://api.allorigins.win/raw?url=${encoded}` },
    { url: `https://api.cors.lol/?url=${encoded}` },
  ];

  let html = "";
  let jsonResult: ClientOddsMap | null = null;
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy.url, proxy.init);
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";

      // Check if this is our own route returning JSON
      if (
        ct.includes("application/json") ||
        proxy.url.startsWith("/api/")
      ) {
        const data = await res.json();
        if (data?.odds && Object.keys(data.odds).length > 0) {
          jsonResult = data.odds as ClientOddsMap;
          break;
        }
        continue;
      }

      const text = await res.text();
      // Only accept HTML that actually carries odds values — a rate-limit or
      // challenge page from the proxy itself must not end the proxy chain.
      const hasRealOdds = /<bet-now-light[\s\S]*?\bodd="[1-9][\d.]*"/.test(text);
      if (hasRealOdds && text.includes("data-navigation-url-value")) {
        html = text;
        break;
      }
    } catch {
      continue;
    }
  }

  // If Vercel proxy returned parsed odds, use them directly
  if (jsonResult) {
    oddsCache = { map: jsonResult, ts: Date.now() };
    return jsonResult;
  }
  // A page without any odds values (SportyTrader's hideodd variant ships
  // periodically) must NOT be cached nor throw — callers continue with
  // SofaScore enrichment and manual odds inputs instead.
  if (!html) return {};

  // Find each match card by its data-navigation-url-value marker
  const marker =
    /data-navigation-url-value="(\/en\/betting-tips\/([a-z0-9-]+-(\d+))\/)"/g;
  const starts: { idx: number; id: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(html)) !== null) {
    starts.push({ idx: m.index, id: m[3] });
  }

  const result: ClientOddsMap = {};
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (result[s.id] !== undefined) continue;
    const card = html.slice(s.idx, i + 1 < starts.length ? starts[i + 1].idx : html.length);
    const odds = parseOddsFromCard(card);
    if (odds !== null) result[s.id] = odds;
  }
  if (Object.keys(result).length > 0) {
    oddsCache = { map: result, ts: Date.now() };
  }
  return result;
};

export const fetchSportyMatch = async (url: string): Promise<SportyMatchDetail> => {
  const { data, error } = await supabase.functions.invoke("sportytrader-proxy", {
    body: { action: "match", url },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.match as SportyMatchDetail;
};

// --- AI rewrite via OpenRouter edge function ---------------------------------

export interface AiRewriteMatch {
  text: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  prediction?: string;
  odds?: number;
}

export const rewriteWithAI = async (matches: AiRewriteMatch[]): Promise<string[]> => {
  const { data, error } = await supabase.functions.invoke("ai-rewrite", {
    body: { matches },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return (data?.rewritten || []) as string[];
};

// --- cache of fetched matches (survives tab switch + page reload) -------

const MATCHES_CACHE_KEY = "gsb_sporty_fetched";

export interface CachedMatches<T = unknown> {
  ts: number; // when the matches were fetched
  cards: T[];
}

export const readMatchesCache = <T = unknown>(): CachedMatches<T> | null => {
  try {
    const raw = localStorage.getItem(MATCHES_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedMatches<T>;
  } catch {
    return null;
  }
};

// Persist the fetched list. Pass `ts` to keep the original fetch time (so the
// 12h window is not reset when only removing an imported match from the list).
export const writeMatchesCache = <T = unknown>(cards: T[], ts: number = Date.now()) => {
  try {
    localStorage.setItem(MATCHES_CACHE_KEY, JSON.stringify({ ts, cards }));
  } catch {
    /* ignore quota errors */
  }
};

export const clearMatchesCache = () => {
  try {
    localStorage.removeItem(MATCHES_CACHE_KEY);
  } catch {
    /* ignore */
  }
};

// --- deduplication (imported_matches table) --------------------------------

export const getImportedIds = async (): Promise<Set<string>> => {
  try {
    const { data, error } = await (supabase as any)
      .from("imported_matches")
      .select("source_id");
    if (error) throw error;
    return new Set<string>((data || []).map((r: any) => String(r.source_id)));
  } catch (e) {
    console.warn("[sportyTrader] getImportedIds failed:", e);
    return new Set();
  }
};

export const clearImportedIds = async (): Promise<void> => {
  try {
    const { error } = await (supabase as any)
      .from("imported_matches")
      .delete()
      .neq("source_id", "RESET_PLACEHOLDER");
    if (error) throw error;
  } catch (e) {
    console.warn("[sportyTrader] clearImportedIds failed:", e);
    throw e;
  }
};

export const markImported = async (
  match: ScrapedMatch,
  target: ImportTarget,
): Promise<void> => {
  try {
    await (supabase as any).from("imported_matches").upsert(
      {
        source_id: match.id,
        home_team: match.homeTeam,
        away_team: match.awayTeam,
        target,
      },
      { onConflict: "source_id" },
    );
  } catch (e) {
    console.warn("[sportyTrader] markImported failed:", e);
  }
};

// --- analysis rewriting (algorithmic, no AI) -------------------------------
// Goal: keep the meaning, but make the text clearly different from the source.

const PROMO_SENTENCE_RE =
  /(sportytrader|bet365|betsson|888starz|1xbet|bwin|unibet|winamax|betway|betfair|promo code|welcome (package|bonus)|free bets?|open(ing)? an account|qualifying bet|try your luck|sign up|our algorithm|according to our|probabilit|odds movement|opening odds|pre-match odds|best odds|[€£$]\s?\d)/i;

// Longer phrases first, then single words. One-directional to avoid ping-pong.
const PHRASE_MAP: [RegExp, string][] = [
  [/\boff the back of\b/gi, "following"],
  [/\bone to watch\b/gi, "a key man to keep an eye on"],
  [/\bbooked their spot\b/gi, "secured their place"],
  [/\bcrashing out\b/gi, "being knocked out"],
  [/\blooked much better\b/gi, "clearly improved"],
  [/\bcame at a cost\b/gi, "was not without a price"],
  [/\bdating back to\b/gi, "going back to"],
  [/\bacross all competitions\b/gi, "in all tournaments"],
  [/\bin this competition\b/gi, "in this tournament"],
  [/\bclean sheets?\b/gi, "shutouts"],
  [/\bHowever,\s*/g, "That said, "],
  [/\bMeanwhile,\s*/g, "On the other side, "],
  [/\bIn addition,\s*/g, "What's more, "],
];

const WORD_MAP: [RegExp, string][] = [
  [/\bvictory\b/gi, "win"],
  [/\bvictories\b/gi, "wins"],
  [/\bdefeat\b/gi, "loss"],
  [/\bclash\b/gi, "encounter"],
  [/\bfixture\b/gi, "game"],
  [/\bside\b/gi, "team"],
  [/\bimpressive\b/gi, "notable"],
  [/\bdominated\b/gi, "controlled"],
  [/\bproduced\b/gi, "delivered"],
  [/\bscored\b/gi, "netted"],
  [/\bunbeaten\b/gi, "without a loss"],
  [/\benter\b/gi, "head into"],
  [/\bstandout\b/gi, "star"],
  [/\bcurrently\b/gi, "presently"],
  [/\baveraging\b/gi, "posting an average of"],
  [/\bstriker\b/gi, "forward"],
];

const splitSentences = (text: string): string[] =>
  text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const applyMaps = (text: string): string => {
  let out = text;
  for (const [re, rep] of PHRASE_MAP) out = out.replace(re, rep);
  for (const [re, rep] of WORD_MAP) out = out.replace(re, rep);
  // Fix accidental double spaces / capitalization after "That said,"
  out = out.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1");
  return out.trim();
};

/**
 * Rewrites scraped analysis so it is not identical to the source:
 * drops promo/leftover sentences, trims to a digestible length, and applies
 * synonym/phrase substitutions. Deterministic and free (no AI).
 */
export const rewriteAnalysis = (raw: string, maxChars = 350): string => {
  if (!raw) return "";
  const sentences = splitSentences(raw).filter(
    (s) => !PROMO_SENTENCE_RE.test(s) && s.length > 25,
  );

  // Take enough sentences to be useful but not the whole article.
  const picked: string[] = [];
  let total = 0;
  for (const s of sentences) {
    const rewritten = applyMaps(s);
    if (total + rewritten.length > maxChars && picked.length >= 3) break;
    picked.push(rewritten);
    total += rewritten.length + 1;
  }

  let result = picked.join(" ");
  // Ensure a capital start and terminal punctuation.
  result = result.charAt(0).toUpperCase() + result.slice(1);
  if (result && !/[.!?]$/.test(result)) result += ".";
  return result;
};
