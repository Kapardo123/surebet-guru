import { useState, useEffect, useRef } from "react";
import { fetchTeamLogoUrl, getCustomTeamLogo } from "@/lib/logoFetcher";

const LOGO_CACHE_KEY = "team_logos_cache";
const MAX_CACHE_ENTRIES = 200;

const readCache = (): Record<string, { url: string; timestamp: number }> => {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const writeCache = (
  cache: Record<string, { url: string; timestamp: number }>,
) => {
  try {
    const entries = Object.entries(cache)
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, MAX_CACHE_ENTRIES);
    const trimmed: Record<string, { url: string; timestamp: number }> = {};
    for (const [k, v] of entries) trimmed[k] = v;
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
  }
};

export const getCachedTeamLogo = (teamName: string): string | null => {
  if (!teamName) return null;
  const cache = readCache();
  const key = teamName.trim().toLowerCase();
  return cache[key]?.url || null;
};

export const setCachedTeamLogo = (teamName: string, url: string) => {
  if (!teamName || !url) return;
  const cache = readCache();
  const key = teamName.trim().toLowerCase();
  cache[key] = { url, timestamp: Date.now() };
  writeCache(cache);
};

export const useTeamLogo = (teamName: string) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
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

    const key = teamName.trim().toLowerCase();
    const cached = getCachedTeamLogo(teamName);
    if (cached) {
      setLogoUrl(cached);
      return;
    }

    const fetchLogo = async () => {
      setLoading(true);
      try {
        const foundLogo = await fetchTeamLogoUrl(teamName);
        if (foundLogo) {
          setCachedTeamLogo(key, foundLogo);
        }
        setLogoUrl(foundLogo);
      } catch {
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
