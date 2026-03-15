import { useTeamLogo } from "@/hooks/useTeamLogo";
import { Shield } from "lucide-react";

interface TeamLogoProps {
  teamName: string;
  size?: number;
}

const TeamLogo = ({ teamName, size = 28 }: TeamLogoProps) => {
  const { logoUrl, loading } = useTeamLogo(teamName);

  if (loading) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (!logoUrl) {
    return <Shield className="text-muted-foreground flex-shrink-0" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={logoUrl}
      alt={`${teamName} logo`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
};

export default TeamLogo;
