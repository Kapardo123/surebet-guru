import { useState, useEffect } from "react";
import { useTeamLogo } from "@/hooks/useTeamLogo";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TeamLogoProps {
  teamName: string;
  size?: number;
  logoUrl?: string | null;
}

const TeamLogo = ({ teamName, size = 28, logoUrl: propLogoUrl }: TeamLogoProps) => {
  const [error, setError] = useState(false);
  const [proxyLogoUrl, setProxyLogoUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  
  const { logoUrl: hookLogoUrl, loading: hookLoading } = useTeamLogo(propLogoUrl ? "" : teamName);
  const finalLogoUrl = propLogoUrl || hookLogoUrl;

  useEffect(() => {
    const fetchImageThroughProxy = async (url: string) => {
      if (!url || !url.includes('sofascore')) return;
      
      try {
        setImageLoading(true);
        const { data, error: proxyError } = await supabase.functions.invoke('sport-api-proxy', {
          body: { 
            isImage: true,
            endpoint: url
          }
        });

        if (proxyError) throw proxyError;
        
        if (data instanceof Blob) {
          const objectUrl = URL.createObjectURL(data);
          setProxyLogoUrl(objectUrl);
        }
      } catch (err) {
        console.error("Error fetching image through proxy:", err);
        setError(true);
      } finally {
        setImageLoading(false);
      }
    };

    if (finalLogoUrl && finalLogoUrl.includes('sofascore')) {
      fetchImageThroughProxy(finalLogoUrl);
    }

    return () => {
      if (proxyLogoUrl) URL.revokeObjectURL(proxyLogoUrl);
    };
  }, [finalLogoUrl]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if ((hookLoading || imageLoading) && !propLogoUrl && !proxyLogoUrl) {
    return (
      <div
        className="rounded-full bg-muted animate-pulse flex-shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/50" />
      </div>
    );
  }

  const displayUrl = proxyLogoUrl || finalLogoUrl;

  if (!displayUrl || error) {
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
      src={displayUrl}
      alt={`${teamName} logo`}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
      loading="lazy"
      onError={() => setError(true)}
    />
  );
};

export default TeamLogo;
