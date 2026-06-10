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
    width={size * 0.75}
    height={size * 0.75}
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient id="tbgrad" cx="0.35" cy="0.35" r="0.75">
        <stop offset="0%" stopColor="#fffbe6" />
        <stop offset="35%" stopColor="#fde047" />
        <stop offset="70%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#854d0e" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="13" fill="url(#tbgrad)" stroke="#854d0e" strokeWidth="1.3" />
    <path d="M3 16 Q16 10 29 16" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity="0.85" strokeLinecap="round" />
    <path d="M16 3 Q10 16 16 29" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity="0.85" strokeLinecap="round" />
    <ellipse cx="11" cy="10" rx="2.5" ry="1.3" fill="#ffffff" opacity="0.55" />
  </svg>
);

export const SportIcon = ({ sport, size = 12 }: { sport: string; size?: number }) => {
  const isTennis = sport?.toLowerCase().includes("tennis");
  if (isTennis) return <TennisBall size={size * 1.5} />;
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
        className="rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/10 border border-yellow-400/30 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <TennisBall size={size} />
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
