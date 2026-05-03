import { supabase } from "@/integrations/supabase/client";

/**
 * Interface for match data from SofaScore API
 */
export interface SofaMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | string | null;
  awayScore: number | string | null;
  status: string;
  league: string;
  date: string;
  time: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeLogo?: string;
  awayLogo?: string;
  isLive?: boolean;
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
      // Debug first few events to see structure
      console.log("[SofaScore] First event sample:", JSON.stringify(events[0], null, 2));
      
      return events.map((event: any) => {
        // Ensure status is a string
        let statusStr = "unknown";
        if (typeof event.status === 'string') {
          statusStr = event.status;
        } else if (event.status?.type && typeof event.status.type === 'string') {
          statusStr = event.status.type;
        } else if (event.status?.description && typeof event.status.description === 'string') {
          statusStr = event.status.description;
        }

        // Ensure time is a string - check multiple possible SofaScore fields
         let timeStr = "TBD";
         
         // Based on debug data: timestamp is at the root
         const timestamp = event.timestamp ||
                           event.startTimestamp || 
                           event.start_timestamp || 
                           event.startTime || 
                           event.start_time ||
                           (event.time && typeof event.time === 'number' ? event.time : null) ||
                           event.time?.startTimestamp ||
                           event.time?.start_timestamp;
         
         if (timestamp) {
           try {
             // SofaScore usually provides seconds (10 digits), but JS needs milliseconds (13 digits)
             const ts = Number(timestamp);
             const dateObj = new Date(ts > 10000000000 ? ts : ts * 1000);
             if (!isNaN(dateObj.getTime())) {
               timeStr = dateObj.toLocaleTimeString('pl-PL', { 
                 hour: '2-digit', 
                 minute: '2-digit',
                 hour12: false 
               });
             }
           } catch (e) {
             console.error("[SofaScore] Time formatting error:", e);
           }
         } else if (typeof event.time === 'string' && event.time.includes(':')) {
           timeStr = event.time;
         } else if (event.time?.initial) {
           timeStr = event.time.initial;
         } else if (event.status?.description && event.status.description.includes(':')) {
           // Fallback: sometimes the time is in the status description
           timeStr = event.status.description;
         } else if (event.formatedStartDate) {
           // Another common field in some SofaScore-like APIs
           const match = event.formatedStartDate.match(/(\d{2}:\d{2})/);
           if (match) timeStr = match[1];
         }

        // Check if match is live
         const isLive = event.status?.type === 'inprogress' || event.status?.type === 'live';

         return {
           id: event.id,
           homeTeam: event.homeTeam?.name || event.home_team?.name || "Unknown",
           awayTeam: event.awayTeam?.name || event.away_team?.name || "Unknown",
           homeScore: event.homeScore?.current ?? event.home_score?.current ?? null,
           awayScore: event.awayScore?.current ?? event.away_score?.current ?? null,
           status: statusStr,
           league: event.tournament?.name || event.league?.name || "Unknown",
           date: date,
           time: timeStr,
           homeTeamId: event.homeTeam?.id || event.home_team?.id,
           awayTeamId: event.awayTeam?.id || event.away_team?.id,
           isLive: isLive,
           // Remove direct SofaScore logo links to force using useTeamLogo (TheSportsDB + Cache)
           homeLogo: undefined,
           awayLogo: undefined,
         };
      });
    }
    
    return [];
  } catch (error) {
    console.error("[SofaScore] Error fetching matches:", error);
    return [];
  }
};
