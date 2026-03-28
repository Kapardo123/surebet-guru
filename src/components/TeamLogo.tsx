import { useTeamLogo } from "@/hooks/useTeamLogo";
import { Shield } from "lucide-react";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
}

const TeamLogo = ({ teamName, size = 28, logoUrl: propLogoUrl }: TeamLogoProps) => {
  const { logoUrl: hookLogoUrl, loading } = useTeamLogo(propLogoUrl ? "" : teamName);
  const finalLogoUrl = propLogoUrl || hookLogoUrl;

  if (loading && !propLogoUrl) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!finalLogoUrl) {
    return <Shield className="text-muted-foreground flex-shrink-0" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={finalLogoUrl}
      alt={`${teamName} logo`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
};

export default TeamLogo;
