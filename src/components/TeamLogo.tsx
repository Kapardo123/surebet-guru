import { useState, useEffect } from "react";
import { useTeamLogo, getCachedTeamLogo, setCachedTeamLogo } from "@/hooks/useTeamLogo";
import { Shield, Loader2, Circle } from "lucide-react";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
  sport?: string;
}

const TennisRacket = ({ size }: { size: number }) => (
  <svg
    width={size * 0.85}
    height={size * 0.85}
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="racketFrame" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <linearGradient id="racketGrip" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#422006" />
        <stop offset="50%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
      <radialGradient id="racketBall" cx="0.35" cy="0.35" r="0.75">
        <stop offset="0%" stopColor="#fffbe6" />
        <stop offset="35%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#854d0e" />
      </radialGradient>
    </defs>
    <ellipse cx="11.5" cy="11.5" rx="9" ry="9" fill="#0891b2" opacity="0.15" />
    <ellipse cx="11.5" cy="11.5" rx="7.5" ry="7.5" fill="none" stroke="url(#racketFrame)" strokeWidth="2.5" />
    <ellipse cx="11.5" cy="11.5" rx="7.5" ry="7.5" fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />
    <line x1="5" y1="11.5" x2="18" y2="11.5" stroke="#ffffff" strokeWidth="0.4" opacity="0.6" />
    <line x1="5.5" y1="7" x2="17.5" y2="16" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
    <line x1="5.5" y1="16" x2="17.5" y2="7" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
    <line x1="8" y1="4.5" x2="15" y2="18.5" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
    <line x1="8" y1="18.5" x2="15" y2="4.5" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
    <line x1="11.5" y1="4" x2="11.5" y2="19" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
    <line x1="3.5" y1="11.5" x2="19.5" y2="11.5" stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
    <path d="M 17.5 17.5 L 25 25 L 27 23 L 19.5 15.5 Z" fill="url(#racketGrip)" stroke="#422006" strokeWidth="0.5" />
    <line x1="22" y1="27" x2="27" y2="22" stroke="#422006" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="25.5" cy="26.5" r="3" fill="url(#racketBall)" stroke="#854d0e" strokeWidth="0.8" />
    <path d="M 23 26.5 Q 25.5 25 28 26.5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.7" strokeLinecap="round" />
    <path d="M 25.5 24 Q 24 26.5 25.5 29" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.7" strokeLinecap="round" />
  </svg>
);

export const SportIcon = ({ sport, size = 12 }: { sport: string; size?: number }) => {
  const isTennis = sport?.toLowerCase().includes("tennis");
  if (isTennis) return <TennisRacket size={size * 1.5} />;
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
