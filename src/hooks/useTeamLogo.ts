import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "") // Remove punctuation like & or -
    .replace(/\s+/g, " ")
    .trim();

const scoreTeamMatch = (team: any, query: string) => {
  const names = [team?.strTeam, team?.strTeamShort, team?.strTeamAlternate].filter(Boolean).map(normalize);

  if (names.some((name) => name === query)) return 100;
  if (names.some((name) => name.startsWith(query))) return 80;
  if (names.some((name) => name.includes(query))) return 60;
  return 0;
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
        // 1. Check local DB cache first
        try {
          const { data: cacheData } = await supabase
            .from('team_logos_cache')
            .select('logo_url')
            .eq('team_name', teamName)
            .maybeSingle();

          if (cacheData?.logo_url) {
            console.log(`[useTeamLogo] ✅ Found in Cache: ${teamName} -> ${cacheData.logo_url}`);
            setLogoUrl(cacheData.logo_url);
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn(`[useTeamLogo] ⚠️ Cache check failed:`, dbErr);
        }

        // 2. Fetch from API-Football via Proxy
        console.log(`[useTeamLogo] 🔍 Fetching from API-Football for: "${teamName}"`);
        const { data, error: apiError } = await supabase.functions.invoke('sport-api-proxy', {
          body: {
            provider: 'api-football',
            endpoint: 'teams',
            params: { search: teamName }
          }
        });

        if (apiError) throw apiError;

        const teams = data?.response || [];
        console.log(`[useTeamLogo] 📊 API-Football returned ${teams.length} teams`);

        let badge = null;
        if (teams.length > 0) {
          const query = normalize(teamName);
          const scored = teams.map((item: any) => {
            const team = item.team;
            const names = [team.name, team.name.replace("FC", ""), team.name.replace("CF", "")].map(normalize);
            
            let score = 0;
            if (names.some(n => n === query)) score = 100;
            else if (names.some(n => n.includes(query) || query.includes(n))) score = 80;
            
            return { team, score };
          }).sort((a: any, b: any) => b.score - a.score);

          if (scored[0].score >= 50) {
            badge = scored[0].team.logo;
            console.log(`[useTeamLogo] ⭐ Match: "${teamName}" -> "${scored[0].team.name}" (Score: ${scored[0].score})`);
          }
        }

        if (!badge) {
          console.log(`[useTeamLogo] ❌ No match found for "${teamName}" in API-Football`);
        }

        // 3. Save to DB cache
        try {
          await supabase.from('team_logos_cache').upsert({
            team_name: teamName,
            logo_url: badge || "", 
            updated_at: new Date().toISOString()
          }, { onConflict: 'team_name' });
        } catch (dbErr) {
          console.error("[useTeamLogo] ⚠️ Cache save failed:", dbErr);
        }

        setLogoUrl(badge);
      } catch (err) {
        console.error("[useTeamLogo] ‼️ Error:", err);
        setLogoUrl(null);
      } finally {
        setLoading(false);
      }
    };

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchLogo, 500);

    return () => clearTimeout(timerRef.current);
  }, [teamName]);

  return { logoUrl, loading };
};
