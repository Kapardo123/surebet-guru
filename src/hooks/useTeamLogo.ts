import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
      console.log(`[useTeamLogo] Searching for: ${teamName}`);
      setLoading(true);
      
      try {
        // 1. Check local DB cache first
        const { data: cacheData, error: cacheError } = await supabase
          .from('team_logos_cache')
          .select('logo_url')
          .eq('team_name', teamName)
          .maybeSingle();

        if (cacheData?.logo_url) {
          console.log(`[useTeamLogo] Found in cache: ${teamName} -> ${cacheData.logo_url}`);
          setLogoUrl(cacheData.logo_url);
          setLoading(false);
          return;
        }

        if (cacheError) {
          console.warn(`[useTeamLogo] Cache check error (table might not exist):`, cacheError);
        }

        // 2. Fetch from TheSportsDB
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
        );
        const data = await res.json();
        const query = normalize(teamName);
        const teams = data.teams || [];

        console.log(`[useTeamLogo] TheSportsDB found ${teams.length} potential matches for ${teamName}`);

        const best = teams
          .map((team: any) => ({ team, score: scoreTeamMatch(team, query) }))
          .sort((a: any, b: any) => b.score - a.score)[0];

        // Lower threshold to 40 to be more permissive
        const badge = best?.score >= 40 ? best.team?.strBadge || null : null;
        
        if (badge) {
          console.log(`[useTeamLogo] Best match found: ${best.team.strTeam} (Score: ${best.score})`);
        } else {
          console.log(`[useTeamLogo] No good match found for ${teamName}`);
        }

        // 3. Save to DB cache (even if null, to avoid re-searching)
        try {
          await supabase.from('team_logos_cache').upsert({
            team_name: teamName,
            logo_url: badge || "", // Save empty string if not found
            updated_at: new Date().toISOString()
          }, { onConflict: 'team_name' });
        } catch (dbErr) {
          console.error("[useTeamLogo] Failed to save to cache:", dbErr);
        }

        setLogoUrl(badge);
      } catch (err) {
        console.error("[useTeamLogo] Fetch error:", err);
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
