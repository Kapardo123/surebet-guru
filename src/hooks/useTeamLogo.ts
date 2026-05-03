import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "") 
    .replace(/\s+/g, " ")
    .trim();

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
        // 1. Check local DB cache first
        const { data: cacheData } = await supabase
          .from('team_logos_cache')
          .select('logo_url')
          .eq('team_name', teamName)
          .maybeSingle();

        if (cacheData?.logo_url) {
          console.log(`[useTeamLogo] ✅ Found in Cache: ${teamName}`);
          setLogoUrl(cacheData.logo_url);
          setLoading(false);
          return;
        }

        // 2. Try Wikipedia API (Wikimedia) - Very reliable for football clubs
        console.log(`[useTeamLogo] 🔍 Trying Wikipedia for: ${teamName}`);
        const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(teamName.replace(/\s+/g, '_'))}`;
        const wikiRes = await fetch(wikiUrl);
        
        let foundLogo = null;

        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.thumbnail?.source) {
            foundLogo = wikiData.thumbnail.source;
            console.log(`[useTeamLogo] ⭐ Found on Wikipedia!`);
          }
        }

        // 3. Fallback to Clearbit if Wikipedia fails
        if (!foundLogo) {
          console.log(`[useTeamLogo] 🔍 Trying Clearbit for: ${teamName}`);
          // Clearbit works better with domain-like strings, so we just use the name
          const clearbitUrl = `https://logo.clearbit.com/${normalize(teamName).replace(/\s+/g, '')}.com`;
          const cbRes = await fetch(clearbitUrl);
          if (cbRes.ok) {
            foundLogo = clearbitUrl;
            console.log(`[useTeamLogo] ⭐ Found on Clearbit!`);
          }
        }

        // 4. Save to DB cache
        await supabase.from('team_logos_cache').upsert({
          team_name: teamName,
          logo_url: foundLogo || "", 
          updated_at: new Date().toISOString()
        }, { onConflict: 'team_name' });

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
