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

    const events = data?.matches || data?.data?.matches || data?.events || [];
    
    if (events && Array.isArray(events)) {
      console.log(`[SofaScore] Found ${events.length} events`);
      return events.map((event: any) => ({
        id: event.id,
        homeTeam: event.homeTeam?.name || "Unknown",
        awayTeam: event.awayTeam?.name || "Unknown",
        homeScore: event.homeScore?.current,
        awayScore: event.awayScore?.current,
        status: event.status?.type || "unknown",
        league: event.tournament?.name || "Unknown",
        date: date,
        time: event.startTimestamp 
          ? new Date(event.startTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          : "TBD",
        homeTeamId: event.homeTeam?.id,
        awayTeamId: event.awayTeam?.id,
        homeLogo: event.homeTeam?.id ? `https://api.sofascore.app/api/v1/team/${event.homeTeam.id}/image` : undefined,
        awayLogo: event.awayTeam?.id ? `https://api.sofascore.app/api/v1/team/${event.awayTeam.id}/image` : undefined,
      }));
    }
    
    return [];
  } catch (error) {
    console.error("[SofaScore] Error fetching matches:", error);
    return [];
  }
};
