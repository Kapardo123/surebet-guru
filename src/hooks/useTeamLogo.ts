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

        // 3. Try SofaScore direct image API - Highly reliable for teams from SofaScore
        if (!foundLogo) {
          console.log(`[useTeamLogo] 🔍 Trying SofaScore direct API for: ${teamName}`);
          // We need the team ID for this. We can try to get it from our recent search cache
          // or by searching SofaScore via proxy if we had a search endpoint.
          // For now, let's try a common fallback: Wikipedia with better search terms
        }

        // 4. Try Wikipedia API (Wikimedia) - Fallback
        if (!foundLogo) {
          console.log(`[useTeamLogo] 🔍 Trying Wikipedia for: ${teamName}`);
          const searchTerms = [
            teamName,
            `${teamName} FC`,
            `${teamName} football`,
            `${teamName} (football club)`,
            `${teamName} SK`,
            `${teamName} JK`
          ];

          for (const term of searchTerms) {
            const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/\s+/g, '_'))}`;
            const wikiRes = await fetch(wikiUrl);
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              
              const description = (wikiData.description || "").toLowerCase();
              const title = (wikiData.title || "").toLowerCase();
              const isSportsTeam = 
                description.includes("club") || 
                description.includes("team") || 
                description.includes("football") || 
                description.includes("soccer") ||
                description.includes("sports") ||
                description.includes("association") ||
                title.includes("f.c") ||
                title.includes("fc");

              if (wikiData.thumbnail?.source && isSportsTeam && !wikiData.title.includes("disambiguation")) {
                foundLogo = wikiData.thumbnail.source;
                console.log(`[useTeamLogo] ⭐ Found on Wikipedia with term: ${term}`);
                break;
              }
            }
          }
        }

        // 5. Fallback: Try DuckDuckGo / Google Favicon service as a last resort for logos
        if (!foundLogo) {
          console.log(`[useTeamLogo] 🔍 Trying Favicon fallback for: ${teamName}`);
          foundLogo = `https://icons.duckduckgo.com/ip3/${normalize(teamName).replace(/\s+/g, '')}.com.ico`;
          // We don't verify this one, just use it as a last-last resort
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
