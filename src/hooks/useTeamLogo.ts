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
        // 1. Check local DB cache first (wrap in try-catch to not block if table missing)
        try {
          const { data: cacheData } = await supabase
            .from('team_logos_cache')
            .select('logo_url')
            .eq('team_name', teamName)
            .maybeSingle();

          if (cacheData?.logo_url) {
            console.log(`[useTeamLogo] ✅ Found in Cache: ${cacheData.logo_url}`);
            setLogoUrl(cacheData.logo_url);
            setLoading(false);
            return;
          }
        } catch (dbErr) {
          console.warn(`[useTeamLogo] ⚠️ Cache check failed (Table might be missing):`, dbErr);
        }

        // 2. Fetch from TheSportsDB (Try API key '3' then '1')
        const tryFetch = async (key: string) => {
          const url = `https://www.thesportsdb.com/api/v1/json/${key}/searchteams.php?t=${encodeURIComponent(teamName)}`;
          console.log(`[useTeamLogo] 🔍 Fetching from TheSportsDB (Key ${key})...`);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return await res.json();
        };

        let data = await tryFetch('3');
        if (!data.teams) {
          console.log(`[useTeamLogo] 🔄 Key 3 returned nothing, trying Key 1...`);
          data = await tryFetch('1');
        }

        const query = normalize(teamName);
        const teams = data.teams || [];
        console.log(`[useTeamLogo] 📊 API returned ${teams.length} teams for "${teamName}"`);

        let bestTeam = null;
        let bestScore = 0;

        if (teams.length === 1) {
          // If only one team found, we highly trust it
          bestTeam = teams[0];
          bestScore = 100;
        } else if (teams.length > 1) {
          const scored = teams.map((team: any) => ({
            team,
            score: scoreTeamMatch(team, query)
          })).sort((a: any, b: any) => b.score - a.score);
          
          bestTeam = scored[0].team;
          bestScore = scored[0].score;
        }

        // If we have a team and it has a badge, use it
        const badge = (bestTeam && bestScore >= 20) ? bestTeam.strBadge || null : null;
        
        if (badge) {
          console.log(`[useTeamLogo] ⭐ Match found: ${bestTeam.strTeam} (Score: ${bestScore})`);
        } else {
          console.log(`[useTeamLogo] ❌ No valid badge/match for "${teamName}" (Best Score: ${bestScore})`);
        }

        // 3. Save to DB cache
        try {
          await supabase.from('team_logos_cache').upsert({
            team_name: teamName,
            logo_url: badge || "", 
            updated_at: new Date().toISOString()
          }, { onConflict: 'team_name' });
        } catch (dbErr) {
          console.error("[useTeamLogo] ⚠️ Failed to save to cache:", dbErr);
        }

        setLogoUrl(badge);
      } catch (err) {
        console.error("[useTeamLogo] ‼️ Error:", err);
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
