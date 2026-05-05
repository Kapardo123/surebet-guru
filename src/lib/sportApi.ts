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

// Global cache for API responses to avoid redundant calls for the same date
const matchesCache: Record<string, { data: SofaMatch[], timestamp: number }> = {};
const inFlightRequests: Record<string, Promise<SofaMatch[]>> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches matches for a specific date using SofaScore API via Supabase Edge Function proxy
 */
export const fetchMatchesByDate = async (date: string): Promise<SofaMatch[]> => {
  const now = Date.now();
  
  // 1. Check if we have valid cached data
  if (matchesCache[date] && (now - matchesCache[date].timestamp < CACHE_TTL)) {
    console.log(`[SofaScore] Returning cached data for ${date}`);
    return matchesCache[date];
  }

  // 2. Check if there is already a request in flight for this date
  if (inFlightRequests[date]) {
    console.log(`[SofaScore] Waiting for in-flight request for ${date}`);
    return inFlightRequests[date];
  }

  try {
    console.log(`[SofaScore] Fetching matches for date: ${date}`);
    
    // Create the request promise
    const requestPromise = (async () => {
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
      
      // ... mapping logic remains the same ...
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
      
      const mappedEvents = events.map((event: any) => {
        // ... all the existing mapping logic ...
        let statusStr = "unknown";
        if (typeof event.status === 'string') {
          statusStr = event.status;
        } else if (event.status?.type && typeof event.status.type === 'string') {
          statusStr = event.status.type;
        } else if (event.status?.description && typeof event.status.description === 'string') {
          statusStr = event.status.description;
        }

        let timeStr = "TBD";
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
            const ts = Number(timestamp);
            const dateObj = new Date(ts > 10000000000 ? ts : ts * 1000);
            if (!isNaN(dateObj.getTime())) {
              timeStr = dateObj.toLocaleTimeString('pl-PL', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              });
            }
          } catch (e) {}
        } else if (typeof event.time === 'string' && event.time.includes(':')) {
          timeStr = event.time;
        }

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
          // Remove direct SofaScore logo links to force using useTeamLogo (TheSportsDB + Cache)
          homeLogo: undefined,
          awayLogo: undefined,
        };
      });

      // Cache the result
      matchesCache[date] = { data: mappedEvents, timestamp: Date.now() };
      return mappedEvents;
    })();

    // Store in-flight promise
    inFlightRequests[date] = requestPromise;
    
    // Wait for the request
    const result = await requestPromise;
    
    // Cleanup in-flight tracking
    delete inFlightRequests[date];
    
    return result;
  } catch (error) {
    console.error("[SofaScore] Error fetching matches:", error);
    delete inFlightRequests[date];
    return [];
  }
};
