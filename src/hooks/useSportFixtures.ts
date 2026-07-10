import { useState, useEffect, useRef } from "react";
import { fetchMatchesByDate, SofaMatch } from "@/lib/sportApi";

export const useSportFixtures = (date?: string, filterTeam?: string) => {
  const [fixtures, setFixtures] = useState<SofaMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchedRef = useRef<{ date: string, data: SofaMatch[] } | null>(null);

  useEffect(() => {
    const loadFixtures = async () => {
      const search = (filterTeam || "").toLowerCase();
      
      // Optimization: Require at least 3 characters
      if (search.length < 3) {
        setFixtures([]);
        setLoading(false);
        return;
      }

      const targetDate = date || new Date().toISOString().split('T')[0];

      try {
        let data: SofaMatch[] = [];
        
        // Check if we already have the data for this date in the local ref
        if (lastFetchedRef.current?.date === targetDate) {
          data = lastFetchedRef.current.data;
        } else {
          setLoading(true);
          data = await fetchMatchesByDate(targetDate);
          lastFetchedRef.current = { date: targetDate, data };
        }
        
        const filtered = data.filter(f => 
          f.homeTeam.toLowerCase().includes(search) || 
          f.awayTeam.toLowerCase().includes(search) ||
          f.league.toLowerCase().includes(search)
        );

        setFixtures(filtered);
      } catch (error) {
        console.error("[useSportFixtures] Error:", error);
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search slightly to avoid rapid API calls/filtering
    const timeout = setTimeout(loadFixtures, 300);
    return () => clearTimeout(timeout);
  }, [date, filterTeam]);

  return { fixtures, loading };
};
