import { useState, useEffect, useRef } from "react";
import { fetchTeamLogoUrl, getCustomTeamLogo } from "@/lib/logoFetcher";

const LOGO_CACHE_KEY = "team_logos_cache";
const MAX_CACHE_ENTRIES = 500; // a busy day lists ~115 matches × 2 teams
// A failed lookup is remembered so one team without a logo does not re-fire
// six API searches on every page render. Shorter than the success TTL because
// the sources gain coverage over time — failures deserve a retry eventually.
const NEGATIVE_TTL_MS = 6 * 60 * 60 * 1000;
export const TEAM_LOGO_EVENT = "gsb-team-logo";

interface CacheEntry {
  url?: string;
  timestamp: number;
  failedAt?: number;
}

const readCache = (): Record<string, CacheEntry> => {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const writeCache = (cache: Record<string, CacheEntry>) => {
  try {
    // Positive results outrank known failures when trimming to the cap.
    const entries = Object.entries(cache).sort((a, b) => {
      if (!!a[1].url !== !!b[1].url) return a[1].url ? -1 : 1;
      return b[1].timestamp - a[1].timestamp;
    });
    const trimmed: Record<string, CacheEntry> = {};
    for (const [k, v] of entries.slice(0, MAX_CACHE_ENTRIES)) trimmed[k] = v;
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota — ignore */
  }
};

const keyOf = (teamName: string) => teamName.trim().toLowerCase();

export const getCachedTeamLogo = (teamName: string): string | null => {
  if (!teamName) return null;
  return readCache()[keyOf(teamName)]?.url || null;
};

// True while a previous full search for this team came back empty and has not
// outlived its retry window.
const isNegativeCached = (entry?: CacheEntry): boolean =>
  !!entry && !entry.url && !!entry.failedAt &&
  Date.now() - entry.failedAt < NEGATIVE_TTL_MS;

const putCache = (teamName: string, entry: CacheEntry) =>
  writeCache({ ...readCache(), [keyOf(teamName)]: entry });

export const setCachedTeamLogo = (teamName: string, url: string) => {
  if (!teamName || !url) return;
  putCache(teamName, { url, timestamp: Date.now() });
  window.dispatchEvent(
    new CustomEvent(TEAM_LOGO_EVENT, { detail: { teamName, url } }),
  );
};

const setFailedTeamLogo = (teamName: string) => {
  if (!teamName) return;
  putCache(teamName, { timestamp: Date.now(), failedAt: Date.now() });
};

export const useTeamLogo = (teamName: string) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Other instances resolving the same team push their result here, so every
  // mounted TeamLogo updates from a single network search.
  useEffect(() => {
    const onResolved = (e: Event) => {
      const { teamName: name, url } = (e as CustomEvent).detail || {};
      if (
        name &&
        url &&
        teamName &&
        name.trim().toLowerCase() === teamName.trim().toLowerCase()
      ) {
        setLogoUrl(url);
        setLoading(false);
      }
    };
    window.addEventListener(TEAM_LOGO_EVENT, onResolved);
    return () => window.removeEventListener(TEAM_LOGO_EVENT, onResolved);
  }, [teamName]);

  useEffect(() => {
    setLoading(false);

    if (!teamName || teamName.length < 3) {
      setLogoUrl(null);
      return;
    }

    // NAJWYZSZY PRIORYTET: custom logo wgrany z dysku przez admina
    const custom = getCustomTeamLogo(teamName);
    if (custom) {
      setLogoUrl(custom.url);
      return;
    }

    const cached = readCache()[keyOf(teamName)];
    if (cached?.url) {
      setLogoUrl(cached.url);
      return;
    }
    // Fresh negative result: no point re-running six API calls right now.
    if (isNegativeCached(cached)) {
      setLogoUrl(null);
      return;
    }

    // fetchTeamLogoUrl dedupes concurrent lookups internally, so several
    // mounted logos for the same team share one network round-trip.
    const fetchLogo = async () => {
      setLoading(true);
      try {
        const found = await fetchTeamLogoUrl(teamName);
        if (found) setCachedTeamLogo(teamName, found);
        else setFailedTeamLogo(teamName);
        setLogoUrl(found);
      } catch {
        setFailedTeamLogo(teamName);
        setLogoUrl(null);
      } finally {
        setLoading(false);
      }
    };

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchLogo, 500);

    return () => clearTimeout(timerRef.current);
  }, [teamName]);

  return { logoUrl, loading };
};
