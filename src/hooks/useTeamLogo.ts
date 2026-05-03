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
      setLoading(true);
      
      try {
        // 1. Check local DB cache first
        const { data: cacheData, error: cacheError } = await supabase
          .from('team_logos_cache')
          .select('logo_url')
          .eq('team_name', teamName)
          .maybeSingle();

        if (cacheData?.logo_url) {
          setLogoUrl(cacheData.logo_url);
          setLoading(false);
          return;
        }

        // 2. Fetch from TheSportsDB
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
        );
        const data = await res.json();
        const query = normalize(teamName);
        const teams = data.teams || [];

        const best = teams
          .map((team: any) => ({ team, score: scoreTeamMatch(team, query) }))
          .sort((a: any, b: any) => b.score - a.score)[0];

        const badge = best?.score >= 60 ? best.team?.strBadge || null : null;

        // 3. Save to DB cache
        if (badge) {
          await supabase.from('team_logos_cache').upsert({
            team_name: teamName,
            logo_url: badge,
            updated_at: new Date().toISOString()
          }, { onConflict: 'team_name' });
        }

        setLogoUrl(badge);
      } catch (err) {
        console.error("Error in useTeamLogo:", err);
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
