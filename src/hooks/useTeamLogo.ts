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

        let foundLogo = null;

        // 2. Try TheSportsDB (via logoFetcher) - Much more accurate for sports
        console.log(`[useTeamLogo] 🔍 Trying TheSportsDB for: ${teamName}`);
        foundLogo = await fetchTeamLogoUrl(teamName);
        
        if (foundLogo) {
          console.log(`[useTeamLogo] ⭐ Found on TheSportsDB!`);
        }

        // 3. Try Wikipedia API (Wikimedia) - Fallback
        if (!foundLogo) {
          console.log(`[useTeamLogo] 🔍 Trying Wikipedia for: ${teamName}`);
          // For football clubs, we try to append " FC" or " (football club)" to be more specific
          const searchTerms = [
            teamName.includes("FC") || teamName.includes("F.C.") ? teamName : `${teamName} FC`,
            `${teamName} (football club)`,
            teamName
          ];

          for (const term of searchTerms) {
            const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/\s+/g, '_'))}`;
            const wikiRes = await fetch(wikiUrl);
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              // Check if it's actually a sports related page or has a thumbnail
              if (wikiData.thumbnail?.source && !wikiData.title.includes("Arsenal (disambiguation)")) {
                foundLogo = wikiData.thumbnail.source;
                console.log(`[useTeamLogo] ⭐ Found on Wikipedia with term: ${term}`);
                break;
              }
            }
          }
        }

        // 4. Fallback to Clearbit
        if (!foundLogo) {
          console.log(`[useTeamLogo] 🔍 Trying Clearbit for: ${teamName}`);
          const clearbitUrl = `https://logo.clearbit.com/${normalize(teamName).replace(/\s+/g, '')}.com`;
          const cbRes = await fetch(clearbitUrl);
          if (cbRes.ok) {
            foundLogo = clearbitUrl;
            console.log(`[useTeamLogo] ⭐ Found on Clearbit!`);
          }
        }

        // 5. Save to DB cache
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
