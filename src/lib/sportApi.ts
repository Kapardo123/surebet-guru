import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for match data from SofaScore API
 */
export interface SofaMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  league: string;
  date: string;
  time: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeLogo?: string;
  awayLogo?: string;
}

/**
 * Fetches matches for a specific date using SofaScore API via Supabase Edge Function proxy
 */
export const fetchMatchesByDate = async (date: string): Promise<SofaMatch[]> => {
  try {
    console.log(`[SofaScore] Fetching matches for date: ${date}`);
    
    const { data, error } = await supabase.functions.invoke('sport-api-proxy', {
      body: { 
        endpoint: 'match/list',
        params: { 
          date,
          sport_slug: 'football'
        } 
      }
    });

    if (error) throw error;

    console.log("[SofaScore] Response data:", data);

    // SofaScore can return events in various structures depending on the specific endpoint version
    let events: any[] = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (data?.matches && Array.isArray(data.matches)) {
      events = data.matches;
    } else if (data?.events && Array.isArray(data.events)) {
      events = data.events;
    } else if (data?.data?.matches && Array.isArray(data.data.matches)) {
      events = data.data.matches;
    } else if (data?.data?.events && Array.isArray(data.data.events)) {
      events = data.data.events;
    }
    
    if (events.length > 0) {
      console.log(`[SofaScore] Found ${events.length} events`);
      return events.map((event: any) => ({
        id: event.id,
        homeTeam: event.homeTeam?.name || event.home_team?.name || "Unknown",
        awayTeam: event.awayTeam?.name || event.away_team?.name || "Unknown",
        homeScore: event.homeScore?.current ?? event.home_score?.current,
        awayScore: event.awayScore?.current ?? event.away_score?.current,
        status: event.status?.type || event.status || "unknown",
        league: event.tournament?.name || event.league?.name || "Unknown",
        date: date,
        time: event.startTimestamp 
          ? new Date(event.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : (event.time || "TBD"),
        homeTeamId: event.homeTeam?.id || event.home_team?.id,
        awayTeamId: event.awayTeam?.id || event.away_team?.id,
        homeLogo: (event.homeTeam?.id || event.home_team?.id) ? `https://www.sofascore.com/api/v1/team/${event.homeTeam?.id || event.home_team?.id}/image` : undefined,
        awayLogo: (event.awayTeam?.id || event.away_team?.id) ? `https://www.sofascore.com/api/v1/team/${event.awayTeam?.id || event.away_team?.id}/image` : undefined,
      }));
    }
    
    return [];
  } catch (error) {
    console.error("[SofaScore] Error fetching matches:", error);
    return [];
  }
};
