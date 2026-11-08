import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

interface AppVersionInfo {
  version: string;
  build: number;
  forceUpdate: boolean;
  releaseDate: string;
  updateMessage: string;
  downloadUrl: string;
  minSupportedVersion: string;
}

interface UpdateStatus {
  needsUpdate: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  message: string;
  downloadUrl: string;
  loading: boolean;
}

const CURRENT_VERSION = "41.0.0";
const DEFAULT_DOWNLOAD = "https://play.google.com/store/apps/details?id=com.surebet.guru";
const CACHE_KEY = "gsb_update_requirement_v1";

interface CachedRequirement {
  latest: string;
  min: string;
  force: boolean;
  message: string;
  url: string;
  at: number;
}

const readCache = (): CachedRequirement | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedRequirement) : null;
  } catch {
    return null;
  }
};

const writeCache = (value: CachedRequirement) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
};

// Hard update gate. On native, ANY version behind the published one blocks the
// UI (the app never mounts routes). A previously fetched requirement is cached
// so going offline cannot bypass an update the server already told us about.
// If the version endpoint is unreachable AND nothing is cached, we fail open so
// a server outage can never brick the app.
export const useAppUpdate = (): UpdateStatus => {
  const [status, setStatus] = useState<UpdateStatus>(() => {
    const native = Capacitor.isNativePlatform();
    const cached = native ? readCache() : null;
    const cachedForces = !!cached && compareVersions(CURRENT_VERSION, cached.latest) < 0;
    return {
      needsUpdate: native && cachedForces,
      forceUpdate: native && cachedForces,
      currentVersion: CURRENT_VERSION,
      latestVersion: cached?.latest || CURRENT_VERSION,
      message: cached?.message || "",
      downloadUrl: cached?.url || DEFAULT_DOWNLOAD,
      loading: native,
    };
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setStatus((prev) => ({ ...prev, loading: false, needsUpdate: false, forceUpdate: false }));
      return;
    }

    let cancelled = false;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch("/api/app-version", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`version endpoint ${response.status}`);
        const data: AppVersionInfo = await response.json();

        const needsUpdate = compareVersions(CURRENT_VERSION, data.version) < 0;
        // Strict gate: any published newer version must be installed before the
        // app UI mounts. (minSupportedVersion is still recorded in the cache.)
        const forceUpdate = needsUpdate;

        const requirement: CachedRequirement = {
          latest: data.version || CURRENT_VERSION,
          min: data.minSupportedVersion || "",
          force: forceUpdate,
          message: data.updateMessage || `New version ${data.version} available!`,
          url: data.downloadUrl || DEFAULT_DOWNLOAD,
          at: Date.now(),
        };
        writeCache(requirement);

        if (!cancelled) {
          setStatus({
            needsUpdate,
            forceUpdate,
            currentVersion: CURRENT_VERSION,
            latestVersion: data.version || CURRENT_VERSION,
            message: requirement.message,
            downloadUrl: requirement.url,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Update check failed (failing open unless cached):", error);
        if (!cancelled) {
          const cached = readCache();
          const cachedForces = !!cached && compareVersions(CURRENT_VERSION, cached.latest) < 0;
          setStatus((prev) => ({
            ...prev,
            loading: false,
            needsUpdate: cachedForces || prev.needsUpdate,
            forceUpdate: cachedForces || prev.forceUpdate,
            latestVersion: cached?.latest || prev.latestVersion,
            message: cached?.message || prev.message,
            downloadUrl: cached?.url || prev.downloadUrl,
          }));
        }
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
};
