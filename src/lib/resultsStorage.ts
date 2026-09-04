import { supabase } from "@/integrations/supabase/client";
import { Tip } from "@/components/TipCard";
import { Coupon, CouponMatch } from "@/lib/couponStorage";

// Zakładka "Yesterday's Results" czyta archiwum `match_results`, zasilane
// przez edge function `settle-results` (cron / przycisk w panelu admina).
// Tabela `tips` jest czyszczona po 8h, więc wczorajszy dzień żyje tylko tutaj.

export type ResultStatus = "won" | "lost" | "void";

export interface ResultTip extends Tip {
  finalScore?: string | null;
  settledMethod?: "auto" | "ai" | "manual";
}

export type ResultCoupon = Coupon;

export interface ResultHero {
  id: number;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: string;
  kickoff: string;
  description?: string | null;
  confidence?: string | null;
  resultStatus: ResultStatus;
  finalScore: string | null;
  settledMethod: "auto" | "ai" | "manual";
}

export interface YesterdayData {
  date: string; // "YYYY-MM-DD" (Europe/Warsaw)
  tips: ResultTip[];
  coupons: ResultCoupon[];
  hero: ResultHero | null;
}

// v2 — unieważnia stare, puste cache zapisane przed pierwszym uruchomieniem settle
const CACHE_PREFIX = "gsb_results_cache_v2_";
const CACHE_TTL_MS = 15 * 60 * 1000; // po dosettlowaniu w adminie dane mają się odświeżyć

/** Dzien kalendarzowy (Europe/Warsaw) danego momentu jako "YYYY-MM-DD". */
export const warsawDateOf = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

export const getYesterdayWarsaw = (): string => {
  const today = warsawDateOf(new Date().toISOString());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

const getCached = (date: string): YesterdayData | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + date);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    const data = parsed.data as YesterdayData;
    // Kupon w cache bez legStatus przy nogach = snapshot sprzed rozstrzygania
    // per-noga — nie serwuj go, wymuś świeże pobranie z bazy.
    const stale = (data.coupons || []).some(
      (c) => (c.matches || []).some((m) => !m.legStatus),
    );
    if (stale) return null;
    return data;
  } catch {
    return null;
  }
};

const setCached = (data: YesterdayData) => {
  try {
    localStorage.setItem(
      CACHE_PREFIX + data.date,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {}
};

const rowToTip = (row: any): ResultTip | null => {
  const p = row.payload || {};
  if (!p.homeTeam || !p.awayTeam) return null;
  return {
    id: Number(row.source_id) || 0,
    sport: String(p.sport || "Football"),
    league: String(p.league || ""),
    homeTeam: String(p.homeTeam),
    awayTeam: String(p.awayTeam),
    prediction: String(p.prediction || ""),
    odds: Number(p.odds) || 0,
    kickoff: String(p.kickoff || ""),
    status: (row.result_status === "won" || row.result_status === "lost"
      ? row.result_status
      : "void") as ResultTip["status"],
    isPremium: !!p.isPremium,
    isPublished: true,
    homeTeamLogo: p.homeTeamLogo ?? null,
    awayTeamLogo: p.awayTeamLogo ?? null,
    description: p.description ?? null,
    wonAt: row.settled_at || null,
    finalScore: row.final_score || null,
    settledMethod: row.settled_method || "auto",
  };
};

const rowToCoupon = (row: any): ResultCoupon | null => {
  const p = row.payload || {};
  const matches: CouponMatch[] = Array.isArray(p.matches)
    ? p.matches
        .filter((m: any) => m && m.homeTeam && m.awayTeam)
        .map((m: any) => ({
          homeTeam: String(m.homeTeam),
          awayTeam: String(m.awayTeam),
          prediction: String(m.prediction || ""),
          odds: Number(m.odds) || 0,
          league: String(m.league || ""),
          sport: String(m.sport || "Football"),
          kickoff: String(m.kickoff || ""),
          homeTeamLogo: m.homeTeamLogo ?? null,
          awayTeamLogo: m.awayTeamLogo ?? null,
          // Status + wynik nogi (z rozstrzygania per-noga w settle-results)
          legStatus: (m.legStatus === "won" || m.legStatus === "lost" ? m.legStatus : m.legStatus === "void" ? "void" : undefined) as CouponMatch["legStatus"],
          finalScore: m.finalScore ? String(m.finalScore) : null,
        }))
    : [];
  if (!matches.length) return null;
  return {
    id: Number(row.source_id) || 0,
    name: String(p.name || `Coupon #${row.source_id}`),
    matches,
    totalOdds: Number(p.totalOdds) || matches.reduce((acc, m) => acc * m.odds, 1),
    stake: p.stake ?? undefined,
    status: (row.result_status === "won" || row.result_status === "lost"
      ? row.result_status
      : "void") as ResultCoupon["status"],
    createdAt: String(p.createdAt || row.settled_at || ""),
    isPremium: !!p.isPremium,
    wonAt: row.result_status === "won" ? row.settled_at : null,
    sport: matches[0]?.sport,
  };
};

/**
 * Wczytuje rozstrzygnięte mecze i kupony z wczoraj (Europe/Warsaw).
 * Wyniki są publiczne (RLS: anon SELECT), więc działa też bez logowania.
 */
export const loadYesterdayResults = async (force: boolean = false): Promise<YesterdayData> => {
  const yesterday = getYesterdayWarsaw();
  const cached = force ? null : getCached(yesterday);
  if (cached) return cached;

  // settled_at >= 3 dni wstecz: cron rozstrzyga wczorajszy dzień rano,
  // więc wiersze wczorajszych meczów mają settled_at z dzisiaj.
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - 3);

  const data: YesterdayData = { date: yesterday, tips: [], coupons: [], hero: null };

  try {
    const { data: rows, error } = await (supabase as any)
      .from("match_results")
      .select("*")
      .gte("settled_at", from.toISOString())
      .order("settled_at", { ascending: false })
      .limit(400);

    if (error) {
      console.warn("[results] match_results unavailable:", error.message);
      return cached || data;
    }

    for (const row of rows || []) {
      const p = row.payload || {};
      // Kupon może łączyć dni — wystarczy, że KTÓRYŚ mecz był wczoraj.
      const kickoffDates: string[] = row.source_type === "tip" || row.source_type === "hero"
        ? [warsawDateOf(String(p.kickoff || ""))]
        : Array.isArray(p.matches)
          ? p.matches.map((m: any) => warsawDateOf(String(m?.kickoff || "")))
          : [];
      if (!kickoffDates.includes(yesterday)) continue;

      if (row.source_type === "tip") {
        const tip = rowToTip(row);
        if (tip) data.tips.push(tip);
      } else if (row.source_type === "coupon") {
        const coupon = rowToCoupon(row);
        if (coupon) data.coupons.push(coupon);
      } else if (row.source_type === "hero") {
        data.hero = {
          id: Number(row.source_id) || 0,
          sport: String(p.sport || "Football"),
          league: String(p.league || ""),
          homeTeam: String(p.homeTeam || ""),
          awayTeam: String(p.awayTeam || ""),
          prediction: String(p.prediction || ""),
          odds: String(p.odds ?? ""),
          kickoff: String(p.kickoff || ""),
          description: p.description ?? null,
          confidence: p.confidence ?? null,
          resultStatus: (row.result_status === "won" || row.result_status === "lost"
            ? row.result_status
            : "void") as ResultStatus,
          finalScore: row.final_score || null,
          settledMethod: row.settled_method || "auto",
        };
      }
    }

    data.tips.sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || ""));
    setCached(data);
    return data;
  } catch (e) {
    console.error("[results] load failed:", e);
    return cached || data;
  }
};
