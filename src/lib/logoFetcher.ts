// ============================================================================
// Team logos — thin client for the `team-logo` edge function.
//
// The heavy lifting (provider chain, name matching, PL→EN translation, shared
// DB cache) lives server-side. This module only:
//   • keeps custom admin uploads (localStorage),
//   • dedupes concurrent lookups,
//   • holds a short in-memory cache,
//   • calls the edge function once per team.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";
import { normalize } from "@/lib/teamNameMatch";

const CUSTOM_TEAM_LOGOS_KEY = "custom_team_logos_v1";

export interface LogoCandidate {
  url: string;
  source: string;
  teamName: string;
  score?: number;
}

export const isValidLogoUrl = (u?: string | null): u is string =>
  !!u && (/^https?:\/\//i.test(u.trim()) || /^data:image\//i.test(u.trim()));

// ---- Custom admin uploads (device-local, highest priority) ------------------

export const saveCustomTeamLogo = (teamName: string, dataUrl: string) => {
  const key = teamName.trim().toLowerCase();
  if (!key || key.length < 2) return;
  try {
    const raw = localStorage.getItem(CUSTOM_TEAM_LOGOS_KEY);
    const store: Record<string, string> = raw ? JSON.parse(raw) : {};
    store[key] = dataUrl;
    localStorage.setItem(CUSTOM_TEAM_LOGOS_KEY, JSON.stringify(store));
  } catch {
    /* quota — ignore */
  }
};

export const getCustomTeamLogo = (teamName: string): LogoCandidate | null => {
  const key = teamName.trim().toLowerCase();
  if (!key || key.length < 2) return null;
  try {
    const raw = localStorage.getItem(CUSTOM_TEAM_LOGOS_KEY);
    if (!raw) return null;
    const store: Record<string, string> = JSON.parse(raw);
    if (store[key]) {
      return { url: store[key], source: "Custom (Plik)", teamName: teamName.trim(), score: 300 };
    }
    return null;
  } catch {
    return null;
  }
};

// ---- In-memory dedupe + short cache ----------------------------------------

const CANDIDATES_CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { candidates: LogoCandidate[]; ts: number }>();
const inflight = new Map<string, Promise<LogoCandidate[]>>();

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([p.catch(() => fallback), timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
};

const callEdge = async (teamName: string): Promise<LogoCandidate[]> => {
  const { data, error } = await withTimeout(
    supabase.functions.invoke("team-logo", { body: { team: teamName } }),
    15000,
    { data: null, error: new Error("timeout") } as any,
  );
  if (error || !data) return [];
  const list = Array.isArray((data as any).candidates) ? (data as any).candidates : [];
  return list
    .filter((c: any) => isValidLogoUrl(c?.url))
    .map((c: any) => ({
      url: String(c.url),
      source: String(c.source || "Team Logo"),
      teamName: String(c.teamName || teamName),
      score: Number(c.score) || 0,
    }));
};

const dedupe = (lists: LogoCandidate[][], limit = 40): LogoCandidate[] => {
  const seen = new Set<string>();
  const out: LogoCandidate[] = [];
  for (const list of lists) {
    for (const c of list) {
      if (!isValidLogoUrl(c.url) || seen.has(c.url)) continue;
      seen.add(c.url);
      out.push(c);
    }
  }
  return out.slice(0, limit);
};

/**
 * Returns logo candidates for a team. `onPartial` fires immediately with any
 * custom/known results so the UI can render without waiting for the network.
 */
export const fetchTeamLogoCandidates = async (
  teamName: string,
  onPartial?: (candidates: LogoCandidate[]) => void,
): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.trim().length < 2) return [];

  const custom = getCustomTeamLogo(teamName);
  const instant = custom ? [custom] : [];
  if (instant.length) onPartial?.(instant);

  const key = normalize(teamName);

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CANDIDATES_CACHE_TTL) {
    const result = dedupe([instant, cached.candidates]);
    onPartial?.(result);
    return result;
  }

  let running = inflight.get(key);
  if (!running) {
    running = callEdge(teamName.trim()).finally(() => inflight.delete(key));
    inflight.set(key, running);
  }
  const fetched = await running;
  cache.set(key, { candidates: fetched, ts: Date.now() });
  if (cache.size > 300) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }

  const result = dedupe([instant, fetched]);
  onPartial?.(result);
  return result;
};

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.trim().length < 2) return null;
  const custom = getCustomTeamLogo(teamName);
  if (custom) return custom.url;
  const candidates = await fetchTeamLogoCandidates(teamName);
  return candidates[0]?.url ?? null;
};
