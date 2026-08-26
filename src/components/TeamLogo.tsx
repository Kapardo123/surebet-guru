import { useState, useEffect, useMemo, memo } from "react";
import { useTeamLogo, getCachedTeamLogo, setCachedTeamLogo } from "@/hooks/useTeamLogo";
import { Loader2 } from "lucide-react";
import { MdSportsTennis } from "react-icons/md";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
  sport?: string;
}

export const SportIcon = ({ sport, size = 12 }: { sport: string; size?: number }) => {
  const isTennis = sport?.toLowerCase().includes("tennis");
  if (isTennis)
    return (
      <MdSportsTennis
        size={size * 1.5}
        className="text-yellow-500"
      />
    );
  return null;
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// Only real image URLs are worth rendering; anything else falls through the chain.
const isUsableUrl = (u?: string | null): u is string =>
  !!u && /^https?:\/\//i.test(u.trim());

// Order = priority: what the tip/coupon/hero saved, then a fresh lookup for
// this team, then whatever any previous render already resolved into cache.
const buildCandidates = (
  teamName: string,
  propUrl?: string | null,
  hookUrl?: string | null,
): string[] => {
  const seen = new Set<string>();
  const list: string[] = [];
  const push = (u?: string | null) => {
    if (isUsableUrl(u)) {
      const trimmed = u.trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        list.push(trimmed);
      }
    }
  };
  push(propUrl);
  push(hookUrl);
  push(getCachedTeamLogo(teamName));
  return list;
};

const TeamLogo = ({
  teamName,
  size = 28,
  logoUrl: propLogoUrl,
  sport,
}: TeamLogoProps) => {
  // The hook always resolves by name, so a broken stored URL can fall back to
  // a freshly found one instead of dropping straight to initials.
  const { logoUrl: hookLogoUrl, loading: hookLoading } = useTeamLogo(teamName);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  useEffect(() => {
    setFailedUrls([]);
  }, [teamName]);

  // A prop URL that loads also warms the global cache under this team name.
  useEffect(() => {
    if (isUsableUrl(propLogoUrl)) setCachedTeamLogo(teamName, propLogoUrl.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propLogoUrl, teamName]);

  const url = useMemo(
    () =>
      buildCandidates(teamName, propLogoUrl, hookLogoUrl).find(
        (u) => !failedUrls.includes(u),
      ) ?? null,
    [teamName, propLogoUrl, hookLogoUrl, failedUrls],
  );

  const isTennis = sport?.toLowerCase().includes("tennis");

  if (isTennis) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <MdSportsTennis
          size={size * 0.6}
          className="text-yellow-500"
        />
      </div>
    );
  }

  if (!url && hookLoading && !failedUrls.length) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className="rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0 overflow-hidden"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {getInitials(teamName)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${teamName} logo`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setFailedUrls((prev) => [...prev, url])}
    />
  );
};

export default memo(TeamLogo);
