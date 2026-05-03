import { useState, useEffect } from "react";
import { fetchMatchesByDate, SofaMatch } from "@/lib/sportApi";

export const useSportFixtures = (date?: string, filterTeam?: string) => {
  const [fixtures, setFixtures] = useState<SofaMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFixtures = async () => {
      // Don't fetch if filter is too short
      if (filterTeam && filterTeam.length > 0 && filterTeam.length < 3) {
        setFixtures([]);
        return;
      }

      setLoading(true);
      const targetDate = date || new Date().toISOString().split('T')[0];
      const data = await fetchMatchesByDate(targetDate);
      
      let filtered = data;
      if (filterTeam && filterTeam.length >= 2) {
        const search = filterTeam.toLowerCase();
        filtered = data.filter(f => 
          f.homeTeam.toLowerCase().includes(search) || 
          f.awayTeam.toLowerCase().includes(search) ||
          f.league.toLowerCase().includes(search)
        );
      }

      setFixtures(filtered);
      setLoading(false);
    };

    loadFixtures();
  }, [date, filterTeam]);

  return { fixtures, loading };
};
