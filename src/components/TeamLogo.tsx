import { useState, useEffect } from "react";
import { useTeamLogo } from "@/hooks/useTeamLogo";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
  teamId?: number;
  sport?: string;
}

const TennisRacket = ({ size }: { size: number }) => (
  <svg
    width={size * 0.6}
    height={size * 0.6}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-foreground/70"
  >
    <path d="M17.5 6.5a4.95 4.95 0 1 0-7 7" />
    <path d="M20 9c0-3.87-3.13-7-7-7s-7 3.13-7 7c0 1.94.79 3.7 2.06 4.97L4 18l3 3 4.03-4.03A6.97 6.97 0 0 0 16 17c3.87 0 7-3.13 7-7h-3z" />
    <circle cx="14" cy="8" r="2.5" />
  </svg>
);

const TeamLogo = ({ teamName, size = 28, logoUrl: propLogoUrl, teamId, sport }: TeamLogoProps) => {
  const [error, setError] = useState(false);
  const { logoUrl: hookLogoUrl, loading: hookLoading } = useTeamLogo(propLogoUrl ? "" : teamName, teamId);
  const finalLogoUrl = propLogoUrl || hookLogoUrl;
  
  const isTennis = sport?.toLowerCase().includes('tennis');

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

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(' ')
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (hookLoading && !propLogoUrl) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  if (!finalLogoUrl || error) {
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
      src={finalLogoUrl}
      alt={`${teamName} logo`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
};

export default TeamLogo;
