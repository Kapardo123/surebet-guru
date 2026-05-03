import { useState, useEffect } from "react";
import { fetchMatchesByDate, SofaMatch } from "@/lib/sportApi";

// Simple global cache to avoid redundant API calls for the same date across multiple cards
const dailyFixturesCache: Record<string, { data: SofaMatch[], timestamp: number }> = {};
const CACHE_DURATION = 60 * 1000; // 60 seconds

export const useLiveMatchScore = (homeTeam: string, awayTeam: string, kickoffDate: string) => {
  const [score, setScore] = useState<{ home: number | string | null, away: number | string | null, isLive: boolean, status?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchScore = async () => {
      if (!homeTeam || !awayTeam || !kickoffDate) return;

      const dateStr = kickoffDate.split('T')[0] || kickoffDate.split(' ')[0];
      
      try {
        let matches: SofaMatch[] = [];
        const now = Date.now();

        // Check cache first
        if (dailyFixturesCache[dateStr] && (now - dailyFixturesCache[dateStr].timestamp < CACHE_DURATION)) {
          matches = dailyFixturesCache[dateStr].data;
        } else {
          setLoading(true);
          matches = await fetchMatchesByDate(dateStr);
          dailyFixturesCache[dateStr] = { data: matches, timestamp: now };
        }

        // Find the match by comparing team names (case insensitive and partial match)
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
            status: match.status
          });
        }
      } catch (error) {
        console.error("[useLiveMatchScore] Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScore();
    
    // Set up interval for live updates if the match is likely happening
    const interval = setInterval(fetchScore, CACHE_DURATION);
    
    return () => clearInterval(interval);
  }, [homeTeam, awayTeam, kickoffDate]);

  return { score, loading };
};
