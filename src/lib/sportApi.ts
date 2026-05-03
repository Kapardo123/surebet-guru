import { supabase } from "@/integrations/supabase/client";

const RAPID_API_KEY = "fc0296157dmsh5bde502e15c007ap161035jsn820607c5daf7";
const RAPID_API_HOST = "sofascore6.p.rapidapi.com";

export interface SportApiFixture {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  league_name: string;
  date?: string;
  time?: string;
  home_team_id?: number;
  away_team_id?: number;
  home_logo?: string;
  away_logo?: string;
}

export const fetchFixturesByDate = async (date: string): Promise<SportApiFixture[]> => {
  try {
    console.log(`[SofaScore] Calling proxy for date: ${date}`);
    const { data, error } = await supabase.functions.invoke('sport-api-proxy', {
      body: { 
        endpoint: 'events/schedule/date',
        params: { date }
      }
    });

    if (error) {
      console.error("[SofaScore] Proxy invocation error:", error);
      throw error;
    }
    
    if (data?.events) {
      console.log(`[SofaScore] Successfully fetched ${data.events.length} events`);
      // Map SofaScore format to our app format
      return data.events.map((event: any) => ({
        id: event.id,
        home_team: event.homeTeam.name,
        away_team: event.awayTeam.name,
        home_score: event.homeScore?.current,
        away_score: event.awayScore?.current,
        status: event.status.type,
        league_name: event.tournament.name,
        date: date,
        time: new Date(event.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        home_team_id: event.homeTeam.id,
        away_team_id: event.awayTeam.id,
        home_logo: `https://api.sofascore.app/api/v1/team/${event.homeTeam.id}/image`,
        away_logo: `https://api.sofascore.app/api/v1/team/${event.awayTeam.id}/image`,
      }));
    }
    
    return [];
  } catch (error) {
    console.error("[SofaScore] Final error in fetchFixturesByDate:", error);
    return [];
  }
};

export const getTeamLogo = async (teamName: string, teamId?: number): Promise<string | null> => {
  if (!teamName) return null;

  // 1. Check cache in Supabase first
  try {
    const { data: cachedLogo } = await supabase
      .from('team_logos_cache' as any)
      .select('logo_url')
      .eq('team_name', teamName)
      .maybeSingle();

    if (cachedLogo?.logo_url) {
      return cachedLogo.logo_url;
    }
  } catch (e) {
    // Table might not exist yet
  }

  // 2. If not in cache and we have an ID, use the ID to get logo
  if (teamId) {
    const logoUrl = `${BASE_URL}/teams/${teamId}/logo?token=${SPORT_API_KEY}`;
    
    // Save to cache
    try {
      await supabase.from('team_logos_cache' as any).upsert({
        team_name: teamName,
        logo_url: logoUrl,
        team_id: teamId,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      // Ignore cache save errors
    }
    
    return logoUrl;
  }

  return null;
};
