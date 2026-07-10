import { useState, useEffect } from "react";
import { useTeamLogo, getCachedTeamLogo, setCachedTeamLogo } from "@/hooks/useTeamLogo";
import { Shield, Loader2, Circle } from "lucide-react";
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
        <MdSportsTennis
          size={size * 0.6}
          className="text-yellow-500"
        />
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
