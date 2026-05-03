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
    
    // Strategy 1: events/schedule/date
    let { data, error } = await supabase.functions.invoke('sport-api-proxy', {
      body: { 
        endpoint: 'events/schedule/date',
        params: { date } 
      }
    });

    // Strategy 2: Fallback to match/by-date if Strategy 1 fails or returns empty
    const hasEvents = (d: any) => (d?.events && d.events.length > 0) || (d?.data?.events && d.data.events.length > 0) || (d?.data && Array.isArray(d.data) && d.data.length > 0);

    if (error || !hasEvents(data)) {
      console.log("[SofaScore] Strategy 1 failed or empty, trying Strategy 2 (match/by-date)...");
      const fallbackResponse = await supabase.functions.invoke('sport-api-proxy', {
        body: { 
          endpoint: 'match/by-date',
          params: { date } 
        }
      });
      if (!fallbackResponse.error && hasEvents(fallbackResponse.data)) {
        data = fallbackResponse.data;
      }
    }

    if (!data) return [];

    console.log("[SofaScore] Final Data Structure:", data);

    // Try multiple possible paths for events
    const events = data?.events || data?.data?.events || (Array.isArray(data?.data) ? data.data : []);
    
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
