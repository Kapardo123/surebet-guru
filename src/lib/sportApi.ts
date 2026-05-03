import { supabase } from "@/integrations/supabase/client";

const SPORT_API_KEY = "sk_live_7f431190a0515b40375c17e0f9ff8f39fbc6df19";
const BASE_URL = "https://sportapi.ai/api/v1";

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
}

export const fetchFixturesByDate = async (date: string): Promise<SportApiFixture[]> => {
  try {
    console.log(`[SportAPI] Calling proxy for date: ${date}`);
    const { data, error } = await supabase.functions.invoke('sport-api-proxy', {
      body: { 
        endpoint: '/fixtures',
        params: { date }
      }
    });

    if (error) {
      console.error("[SportAPI] Proxy invocation error:", error);
      throw error;
    }
    
    if (data?.success) {
      console.log(`[SportAPI] Successfully fetched ${data.fixtures?.length || 0} fixtures`);
      return data.fixtures;
    }
    
    console.warn("[SportAPI] Proxy returned success: false or no fixtures", data);
    return [];
  } catch (error) {
    console.error("[SportAPI] Final error in fetchFixturesByDate:", error);
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
