import { useState, useEffect } from "react";
import { fetchMatchesByDate, SofaMatch } from "@/lib/sportApi";

// Global cache and request tracking
const dailyFixturesCache: Record<string, { data: SofaMatch[], timestamp: number }> = {};
const inFlightRequests: Record<string, Promise<SofaMatch[]>> = {};

const CACHE_DURATION_LIVE = 3 * 60 * 1000; // 3 minutes for live matches
const CACHE_DURATION_DEFAULT = 15 * 60 * 1000; // 15 minutes for others

export const useLiveMatchScore = (homeTeam: string, awayTeam: string, kickoffDate: string) => {
  const [score, setScore] = useState<{ 
    home: number | string | null, 
    away: number | string | null, 
    isLive: boolean, 
    status?: string,
    liveMinute?: string 
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;

    const fetchScore = async () => {
      // Optimization 1: Don't fetch if tab is in background
      if (document.visibilityState !== 'visible') return;

      if (!homeTeam || !awayTeam || !kickoffDate || !isMounted) return;

      // Optimization 2: Don't poll if match is already finished
      if (score?.status === 'finished' || score?.status === 'ended') return;

      const kickoffTime = new Date(kickoffDate.replace(' ', 'T')).getTime();
      const now = Date.now();
      
      // Optimization 3: Don't poll if kickoff is too far in the future
      if (!score && kickoffTime > now + (10 * 60 * 1000)) return;

      const dateStr = kickoffDate.split('T')[0] || kickoffDate.split(' ')[0];
      
      try {
        let matches: SofaMatch[] = [];
        const isCurrentlyLive = score?.isLive;
        const currentCacheDuration = isCurrentlyLive ? CACHE_DURATION_LIVE : CACHE_DURATION_DEFAULT;

        // Optimization 4: Smart Cache + In-flight Request Coalescing
        if (dailyFixturesCache[dateStr] && (now - dailyFixturesCache[dateStr].timestamp < currentCacheDuration)) {
          matches = dailyFixturesCache[dateStr].data;
        } else if (inFlightRequests[dateStr]) {
          // If a request for this date is already happening, wait for it instead of starting a new one
          matches = await inFlightRequests[dateStr];
        } else {
          setLoading(true);
          // Create the request and store its promise
          const requestPromise = fetchMatchesByDate(dateStr);
          inFlightRequests[dateStr] = requestPromise;
          
          matches = await requestPromise;
          
          // Cleanup in-flight tracking and update cache
          delete inFlightRequests[dateStr];
          dailyFixturesCache[dateStr] = { data: matches, timestamp: Date.now() };
        }

        if (!isMounted) return;

        // Find the match
        const match = matches.find(m => {
          const mHome = m.homeTeam.toLowerCase();
          const mAway = m.awayTeam.toLowerCase();
          const hTarget = homeTeam.toLowerCase();
          const aTarget = awayTeam.toLowerCase();

          return (mHome.includes(hTarget) || hTarget.includes(mHome)) && 
                 (mAway.includes(aTarget) || aTarget.includes(mAway));
        });

        if (match) {
          setScore({
            home: match.homeScore,
            away: match.awayScore,
            isLive: match.isLive || false,
            status: match.status,
            liveMinute: match.liveMinute
          });
        }
      } catch (error) {
        console.error("[useLiveMatchScore] Error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchScore();
    
    // Optimization 5: Visibility Change Listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchScore();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const kickoffTime = new Date(kickoffDate.replace(' ', 'T')).getTime();
    const isAroundMatchTime = Date.now() > kickoffTime - (15 * 60 * 1000) && Date.now() < kickoffTime + (150 * 60 * 1000);
    
    if (isAroundMatchTime && score?.status !== 'finished') {
      interval = setInterval(fetchScore, CACHE_DURATION_LIVE);
    }
    
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) clearInterval(interval);
    };
  }, [homeTeam, awayTeam, kickoffDate, score?.status]);

  return { score, loading };
};
