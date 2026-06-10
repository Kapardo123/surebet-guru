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
    width={size * 0.9}
    height={size * 0.9}
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <radialGradient id="rrBg" cx="50%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="100%" stopColor="#0f172a" />
      </radialGradient>
      <linearGradient id="rrFrameOuter" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#dc2626" />
        <stop offset="45%" stopColor="#ef4444" />
        <stop offset="55%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="rrFrameInner" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fca5a5" />
        <stop offset="50%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
      <linearGradient id="rrStringBed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="50%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#fde68a" />
      </linearGradient>
      <linearGradient id="rrGrip" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="50%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0f172a" />
      </linearGradient>
      <linearGradient id="rrGripHi" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <linearGradient id="rrShaft" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="50%" stopColor="#64748b" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
      <radialGradient id="rrBall" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="30%" stopColor="#fde047" />
        <stop offset="70%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#a16207" />
      </radialGradient>
      <filter id="rrShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.4" />
      </filter>
    </defs>

    <ellipse cx="24" cy="24" rx="18" ry="17" fill="url(#rrBg)" opacity="0.6" filter="url(#rrShadow)" />
    <ellipse cx="24" cy="24" rx="17" ry="16" fill="url(#rrStringBed)" opacity="0.9" />
    <ellipse cx="24" cy="24" rx="17" ry="16" fill="none" stroke="url(#rrFrameOuter)" strokeWidth="3.2" />
    <ellipse cx="24" cy="24" rx="17" ry="16" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.55" />
    <ellipse cx="24" cy="24" rx="15.8" ry="14.8" fill="none" stroke="url(#rrFrameInner)" strokeWidth="0.8" opacity="0.35" />
    <line x1="9" y1="24" x2="39" y2="24" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="10" y1="20" x2="38" y2="28" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="10" y1="28" x2="38" y2="20" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="11.5" y1="16" x2="36.5" y2="32" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="11.5" y1="32" x2="36.5" y2="16" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="13.5" y1="12.5" x2="34.5" y2="35.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="13.5" y1="35.5" x2="34.5" y2="12.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="16" y1="9.5" x2="32" y2="38.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="16" y1="38.5" x2="32" y2="9.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="19" y1="7.5" x2="29" y2="40.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="19" y1="40.5" x2="29" y2="7.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="22" y1="6.5" x2="26" y2="41.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="22" y1="41.5" x2="26" y2="6.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="24" y1="6" x2="24" y2="42" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="6" y1="24" x2="42" y2="24" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="7" y1="21" x2="41" y2="27" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="7" y1="27" x2="41" y2="21" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="8.5" y1="17.5" x2="39.5" y2="30.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="8.5" y1="30.5" x2="39.5" y2="17.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="10.5" y1="13.5" x2="37.5" y2="34.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="10.5" y1="34.5" x2="37.5" y2="13.5" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="13" y1="10" x2="35" y2="38" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="13" y1="38" x2="35" y2="10" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="16.5" y1="8" x2="31.5" y2="40" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <line x1="16.5" y1="40" x2="31.5" y2="8" stroke="#475569" strokeWidth="0.35" opacity="0.75" />
    <path d="M 20 43 L 28 51 L 27 52 L 19 44 Z" fill="url(#rrShaft)" stroke="#1e293b" strokeWidth="0.6" />
    <path d="M 22.5 47.5 L 24.5 49.5 L 24 50 L 22 48 Z" fill="url(#rrGripHi)" opacity="0.6" />
    <path d="M 18 42 L 26 50 L 24 52 L 16 44 Z" fill="url(#rrGrip)" stroke="#0f172a" strokeWidth="0.6" />
    <line x1="16.5" y1="43" x2="24" y2="50.5" stroke="#0f172a" strokeWidth="0.6" opacity="0.9" />
    <line x1="18" y1="44.5" x2="25.5" y2="52" stroke="#475569" strokeWidth="0.3" opacity="0.8" />
    <line x1="19.5" y1="44.5" x2="27" y2="52" stroke="#475569" strokeWidth="0.3" opacity="0.8" />
    <line x1="21" y1="44.5" x2="28.5" y2="52" stroke="#475569" strokeWidth="0.3" opacity="0.8" />
    <path d="M 15.5 43.5 Q 16.5 44.5 15.5 45.5" fill="none" stroke="#1e293b" strokeWidth="0.8" strokeLinecap="round" />
    <circle cx="48" cy="46" r="9" fill="url(#rrBall)" stroke="#a16207" strokeWidth="0.7" />
    <path d="M 42 44.5 Q 48 41 54 45" fill="none" stroke="#fef3c7" strokeWidth="0.6" opacity="0.8" strokeLinecap="round" />
    <path d="M 42 47.5 Q 48 51 54 47" fill="none" stroke="#fef3c7" strokeWidth="0.6" opacity="0.8" strokeLinecap="round" />
    <ellipse cx="45.5" cy="43.5" rx="3.5" ry="2.5" fill="#ffffff" opacity="0.55" />
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
