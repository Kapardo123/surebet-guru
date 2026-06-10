import { useState, useEffect } from "react";
import { useTeamLogo, getCachedTeamLogo, setCachedTeamLogo } from "@/hooks/useTeamLogo";
import { Shield, Loader2, Circle } from "lucide-react";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
  sport?: string;
}

const TennisBall = ({ size }: { size: number }) => (
  <svg
    width={size * 0.7}
    height={size * 0.7}
    viewBox="0 0 32 32"
    className="text-emerald-500"
  >
    <circle cx="16" cy="16" r="13" fill="url(#tbgrad)" stroke="#059669" strokeWidth="1.5" />
    <ellipse cx="11" cy="16" rx="3" ry="9" fill="none" stroke="#065f46" strokeWidth="1.2" opacity="0.55" />
    <ellipse cx="21" cy="16" rx="3" ry="9" fill="none" stroke="#065f46" strokeWidth="1.2" opacity="0.55" />
    <path d="M8 9 Q16 12 24 9" fill="none" stroke="#065f46" strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
    <path d="M8 23 Q16 20 24 23" fill="none" stroke="#065f46" strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
    <circle cx="12" cy="10" r="2" fill="white" opacity="0.35" />
    <defs>
      <radialGradient id="tbgrad" cx="0.35" cy="0.35" r="0.7">
        <stop offset="0%" stopColor="#86efac" />
        <stop offset="60%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </radialGradient>
    </defs>
  </svg>
);

const TennisRacket = ({ size }: { size: number }) => (
  <div className="flex items-center justify-center" style={{ width: size, height: size }}>
    <TennisBall size={size} />
  </div>
);

export const SportIcon = ({ sport, size = 12 }: { sport: string; size?: number }) => {
  const isTennis = sport?.toLowerCase().includes("tennis");
  if (isTennis) return <TennisBall size={size * 1.4} />;
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

const TeamLogo = ({
  teamName,
  size = 28,
  logoUrl: propLogoUrl,
  sport,
}: TeamLogoProps) => {
  const [error, setError] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  const { logoUrl: hookLogoUrl, loading: hookLoading } = useTeamLogo(
    propLogoUrl ? "" : teamName,
  );

  useEffect(() => {
    if (propLogoUrl) {
      setResolvedUrl(propLogoUrl);
      setCachedTeamLogo(teamName, propLogoUrl);
    } else {
      const cached = getCachedTeamLogo(teamName);
      if (cached) {
        setResolvedUrl(cached);
      } else if (hookLogoUrl) {
        setResolvedUrl(hookLogoUrl);
      }
    }
    setError(false);
  }, [propLogoUrl, hookLogoUrl, teamName]);

  const isTennis = sport?.toLowerCase().includes("tennis");

  if (isTennis) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-emerald-500/15 to-green-600/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <TennisRacket size={size} />
      </div>
    );
  }

  if (hookLoading && !propLogoUrl && !resolvedUrl) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!resolvedUrl || error) {
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
      src={resolvedUrl}
      alt={`${teamName} logo`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
};

export default TeamLogo;
