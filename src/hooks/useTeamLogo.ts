import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTeamLogoUrl } from "@/lib/logoFetcher";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "") 
    .replace(/\s+/g, " ")
    .trim();

// Helper to validate if image URL works
const checkImageUrl = async (url: string): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    return res.ok && res.headers.get('content-type')?.startsWith('image/') === true;
  } catch {
    return false;
  }
};

export const useTeamLogo = (teamName: string) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!teamName || teamName.length < 3) {
      setLogoUrl(null);
      return;
    }

    const fetchLogo = async () => {
      console.log(`[useTeamLogo] 🚀 Start search for: "${teamName}"`);
      setLoading(true);
      
      try {
        // 1. Check local DB cache first, but validate the URL!
        const { data: cacheData } = await supabase
          .from('team_logos_cache')
          .select('logo_url')
          .eq('team_name', teamName)
          .maybeSingle();

        if (cacheData?.logo_url) {
          // Validate cached URL first
          const isValid = await checkImageUrl(cacheData.logo_url);
          if (isValid) {
            console.log(`[useTeamLogo] ✅ Found and validated in Cache: ${teamName}`);
            setLogoUrl(cacheData.logo_url);
            setLoading(false);
            return;
          } else {
            console.log(`[useTeamLogo] ❌ Cached URL invalid, re-fetching: ${teamName}`);
            // Remove invalid entry from cache
            await supabase.from('team_logos_cache').delete().eq('team_name', teamName);
          }
        }

        // 2. Try logoFetcher (TheSportsDB + Wikipedia)
        console.log(`[useTeamLogo] 🔍 Trying logoFetcher for: ${teamName}`);
        const foundLogo = await fetchTeamLogoUrl(teamName);
        
        // 3. Save to cache if we found something valid
        if (foundLogo) {
          await supabase.from('team_logos_cache').upsert({
            team_name: teamName,
            logo_url: foundLogo, 
            updated_at: new Date().toISOString()
          }, { onConflict: 'team_name' });
        }

        setLogoUrl(foundLogo);
      } catch (err) {
        console.error("[useTeamLogo] ‼️ Error:", err);
      } finally {
        setLoading(false);
      }
    };

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchLogo, 600);

    return () => clearTimeout(timerRef.current);
  }, [teamName]);

  return { logoUrl, loading };
};
