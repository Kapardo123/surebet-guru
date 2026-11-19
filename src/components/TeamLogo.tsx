import { useState, useEffect, useMemo, memo } from "react";
import { useTeamLogo, setCachedTeamLogo } from "@/hooks/useTeamLogo";
import { MdSportsTennis } from "react-icons/md";
import Crest from "@/components/Crest";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
  sport?: string;
  league?: string | null;
  /** Initials colour scheme when no crest is found: "light" = for a light chip. */
  tone?: "dark" | "light";
}

export const SportIcon = ({ sport, size = 12 }: { sport: string; size?: number }) => {
  const isTennis = sport?.toLowerCase().includes("tennis");
  if (isTennis)
    return (
      <MdSportsTennis
        size={size * 1.5}
        className="text-current"
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

// Real image URLs, or a logo the admin uploaded from disk (data URL).
const isUsableUrl = (u?: string | null): u is string =>
  !!u && (/^https?:\/\//i.test(u.trim()) || /^data:image\//i.test(u.trim()));

// Order = priority: what the tip/coupon/hero saved, then every logo found for
// this team and sport, best first. A URL that fails to load is skipped.
const buildCandidates = (propUrl: string | null | undefined, found: string[]): string[] => {
  const list: string[] = [];
  for (const u of [propUrl, ...found]) if (isUsableUrl(u) && !list.includes(u.trim())) list.push(u.trim());
  return list;
};

const TeamLogo = ({
  teamName,
  size = 28,
  logoUrl: propLogoUrl,
  sport,
  league,
  tone = "dark",
}: TeamLogoProps) => {
  // The hook resolves by name and sport, so a broken stored URL falls back to
  // the next logo found instead of dropping straight to a generated crest.
  const { urls: found, loading: hookLoading, reportBroken } = useTeamLogo(teamName, sport, league);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);

  useEffect(() => {
    setFailedUrls([]);
  }, [teamName, sport]);

  // A saved URL for this team also warms the shared cache.
  useEffect(() => {
    if (isUsableUrl(propLogoUrl) && /^https?:/i.test(propLogoUrl)) setCachedTeamLogo(teamName, propLogoUrl.trim(), sport);
     
  }, [propLogoUrl, teamName, sport]);

  const url = useMemo(
    () => buildCandidates(propLogoUrl, found).find((u) => !failedUrls.includes(u)) ?? null,
    [propLogoUrl, found, failedUrls],
  );

  const isTennis = sport?.toLowerCase().includes("tennis");

  if (isTennis) {
    return (
      <div
        className={`rounded-full flex items-center justify-center flex-shrink-0 ${tone === "light" ? "text-stock-ink/70" : "bg-secondary text-muted-foreground"}`}
        style={{ width: size, height: size }}
      >
        <MdSportsTennis
          size={size * 0.7}
          className="text-current"
        />
      </div>
    );
  }

  if (!url && hookLoading && !failedUrls.length) {
    return (
      <div
        className="rounded-full bg-secondary animate-pulse flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!url && tone === "light") {
    return <Crest name={teamName} size={size} />;
  }

  if (!url) {
    return (
      <div
        className={`rounded-full flex items-center justify-center font-display font-black flex-shrink-0 overflow-hidden tracking-[-0.04em] ${
          tone === "light" ? "text-stock-ink" : "bg-secondary text-secondary-foreground"
        }`}
        style={{ width: size, height: size, fontSize: size * (tone === "light" ? 0.5 : 0.42) }}
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
      onError={() => {
        setFailedUrls((prev) => [...prev, url]);
        reportBroken(url);
      }}
    />
  );
};

export default memo(TeamLogo);
