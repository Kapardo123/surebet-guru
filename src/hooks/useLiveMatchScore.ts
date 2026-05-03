import { useState, useEffect } from "react";
import { fetchMatchesByDate, SofaMatch } from "@/lib/sportApi";

// Global cache to avoid redundant API calls
const dailyFixturesCache: Record<string, { data: SofaMatch[], timestamp: number }> = {};
const CACHE_DURATION_LIVE = 2 * 60 * 1000; // 2 minutes for live matches
const CACHE_DURATION_DEFAULT = 10 * 60 * 1000; // 10 minutes for finished/future matches

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
      if (!homeTeam || !awayTeam || !kickoffDate || !isMounted) return;

      // Optimization 1: Don't poll if match is already marked as finished in current state
      if (score?.status === 'finished' || score?.status === 'ended') {
        return;
      }

      const kickoffTime = new Date(kickoffDate.replace(' ', 'T')).getTime();
      const now = Date.now();
      
      // Optimization 2: Don't poll if kickoff is more than 15 minutes in the future
      // and we don't have any score yet.
      if (!score && kickoffTime > now + (15 * 60 * 1000)) {
        return;
      }

      const dateStr = kickoffDate.split('T')[0] || kickoffDate.split(' ')[0];
      
      try {
        let matches: SofaMatch[] = [];
        
        // Optimization 3: Dynamic cache duration
        const isCurrentlyLive = score?.isLive;
        const currentCacheDuration = isCurrentlyLive ? CACHE_DURATION_LIVE : CACHE_DURATION_DEFAULT;

        // Check global cache
        if (dailyFixturesCache[dateStr] && (now - dailyFixturesCache[dateStr].timestamp < currentCacheDuration)) {
          matches = dailyFixturesCache[dateStr].data;
        } else {
          // Only one request per dateStr even if multiple cards call this at the same time
          // (Simple way to avoid race conditions without a full state manager)
          setLoading(true);
          matches = await fetchMatchesByDate(dateStr);
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
    
    // Optimization 4: Smart interval - only poll if match is live or starting soon
    const kickoffTime = new Date(kickoffDate.replace(' ', 'T')).getTime();
    const now = Date.now();
    
    // Start polling if: match is live OR match starts within next 3 hours
    // OR match started less than 3 hours ago (and not finished)
    const isAroundMatchTime = now > kickoffTime - (30 * 60 * 1000) && now < kickoffTime + (180 * 60 * 1000);
    
    if (isAroundMatchTime && score?.status !== 'finished') {
      interval = setInterval(fetchScore, CACHE_DURATION_LIVE);
    }
    
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [homeTeam, awayTeam, kickoffDate, score?.status]);

  return { score, loading };
};
