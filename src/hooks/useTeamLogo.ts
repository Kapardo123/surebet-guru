import { useCallback, useEffect, useRef, useState } from "react";
import { bareKey, getCustomTeamLogo, resolveTeamLogos, sportKind } from "@/lib/logoFetcher";

/*
 * Logo URLs per team and sport, cached in localStorage and shared between
 * every mounted TeamLogo. An image that fails to load is reported back, kept
 * out of the cache and, once the known URLs run out, triggers one online
 * search for alternatives.
 */

// v2: keyed by sport, so cached v1 mix-ups (Celtic FC for Boston Celtics) go.
const LOGO_CACHE_KEY = "team_logos_cache_v2";
const MAX_CACHE_ENTRIES = 600;
// A failed lookup is remembered so a team without a logo does not search on
// every render. Shorter than a success because sources gain coverage.
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;
export const TEAM_LOGO_EVENT = "gsb-team-logo";

interface CacheEntry {
  urls: string[];
  broken?: string[];
  /** The online search already ran for this entry. */
  online?: boolean;
  timestamp: number;
}

const readCache = (): Record<string, CacheEntry> => {
  try {
    return JSON.parse(localStorage.getItem(LOGO_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
};

const writeCache = (cache: Record<string, CacheEntry>) => {
  try {
    // Teams with a logo outrank known misses when trimming to the cap.
    const entries = Object.entries(cache).sort((a, b) => {
      if (!!a[1].urls?.length !== !!b[1].urls?.length) return a[1].urls?.length ? -1 : 1;
      return b[1].timestamp - a[1].timestamp;
    });
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_CACHE_ENTRIES))));
  } catch {
    /* quota: ignore */
  }
};

const keyOf = (teamName: string, sport?: string | null) => `${sportKind(sport)}:${bareKey(teamName)}`;

const putEntry = (key: string, entry: CacheEntry) => {
  writeCache({ ...readCache(), [key]: entry });
  window.dispatchEvent(new CustomEvent(TEAM_LOGO_EVENT, { detail: { key, urls: entry.urls } }));
};

/** Forget every found logo (and the v1 cache) so teams are looked up again. */
export const clearTeamLogoCache = () => {
  try {
    localStorage.removeItem(LOGO_CACHE_KEY);
    localStorage.removeItem("team_logos_cache");
  } catch {
    /* ignore */
  }
};

/** First known logo for a team, if any (no network). */
export const getCachedTeamLogo = (teamName: string, sport?: string | null): string | null =>
  teamName ? readCache()[keyOf(teamName, sport)]?.urls?.[0] ?? null : null;

/** Remember a logo that's known to work for this team (e.g. one saved on a tip). */
export const setCachedTeamLogo = (teamName: string, url: string, sport?: string | null) => {
  if (!teamName || !url) return;
  const key = keyOf(teamName, sport);
  const prev = readCache()[key];
  if (prev?.urls?.[0] === url || prev?.broken?.includes(url)) return;
  putEntry(key, { ...prev, urls: [url, ...(prev?.urls ?? []).filter((u) => u !== url)], timestamp: Date.now() });
};

export const useTeamLogo = (teamName: string, sport?: string | null, league?: string | null) => {
  const key = keyOf(teamName || "", sport);
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(
    async (online: boolean) => {
      setLoading(true);
      try {
        const prev = readCache()[key];
        const found = await resolveTeamLogos(teamName, sport, { online, exclude: prev?.broken, league });
        putEntry(key, { urls: found, broken: prev?.broken, online: online || prev?.online, timestamp: Date.now() });
        setUrls(found);
      } catch {
        setUrls([]);
      } finally {
        setLoading(false);
      }
    },
    [key, teamName, sport, league],
  );

  // Another instance resolved the same team: take its result.
  useEffect(() => {
    const onResolved = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d?.key === key) {
        setUrls(d.urls || []);
        setLoading(false);
      }
    };
    window.addEventListener(TEAM_LOGO_EVENT, onResolved);
    return () => window.removeEventListener(TEAM_LOGO_EVENT, onResolved);
  }, [key]);

  useEffect(() => {
    setLoading(false);
    if (!teamName || teamName.trim().length < 2) return setUrls([]);

    const custom = getCustomTeamLogo(teamName);
    if (custom) return setUrls([custom.url]);

    const cached = readCache()[key];
    if (cached?.urls?.length) return setUrls(cached.urls);
    if (cached && Date.now() - cached.timestamp < NEGATIVE_TTL_MS) return setUrls([]);

    setUrls([]);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(false), 300);
    return () => clearTimeout(timer.current);
  }, [key, teamName, search]);

  /** An image failed to load: drop it, and look online once the list runs out. */
  const reportBroken = useCallback(
    (url: string) => {
      const prev = readCache()[key] ?? { urls: [], timestamp: Date.now() };
      const left = prev.urls.filter((u) => u !== url);
      const entry: CacheEntry = { ...prev, urls: left, broken: [...new Set([...(prev.broken ?? []), url])] };
      putEntry(key, entry);
      if (!left.length && !prev.online && teamName) search(true);
    },
    [key, teamName, search],
  );

  return { logoUrl: urls[0] ?? null, urls, loading, reportBroken };
};
