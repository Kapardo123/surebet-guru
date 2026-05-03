import { useState } from "react";
import { useTeamLogo } from "@/hooks/useTeamLogo";
import { Shield } from "lucide-react";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
}

const TeamLogo = ({ teamName, size = 28, logoUrl: propLogoUrl }: TeamLogoProps) => {
  const [error, setError] = useState(false);
  const { logoUrl: hookLogoUrl, loading } = useTeamLogo(propLogoUrl ? "" : teamName);
  const finalLogoUrl = propLogoUrl || hookLogoUrl;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (loading && !propLogoUrl) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!finalLogoUrl || error) {
    return (
      <div 
        className="rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0"
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
