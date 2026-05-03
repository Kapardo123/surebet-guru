import { useState, useEffect } from "react";
import { fetchFixturesByDate, SportApiFixture, getTeamLogo } from "@/lib/sportApi";

export interface EnhancedUpcomingMatch extends SportApiFixture {
  homeLogo?: string | null;
  awayLogo?: string | null;
  formattedTime?: string;
  formattedDate?: string;
}

export const useSportFixtures = (date?: string, filterTeam?: string) => {
  const [fixtures, setFixtures] = useState<EnhancedUpcomingMatch[]>([]);
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
      const data = await fetchFixturesByDate(targetDate);
      
      const enhancedData = data.map((fixture) => {
        return {
          ...fixture,
          homeLogo: fixture.home_logo || null,
          awayLogo: fixture.away_logo || null,
          formattedDate: targetDate,
          formattedTime: fixture.status === 'NS' || fixture.status === 'not_started' ? "Upcoming" : fixture.status
        };
      });

      let filtered = enhancedData;
      if (filterTeam && filterTeam.length >= 2) {
        const search = filterTeam.toLowerCase();
        filtered = enhancedData.filter(f => 
          f.home_team.toLowerCase().includes(search) || 
          f.away_team.toLowerCase().includes(search) ||
          f.league_name.toLowerCase().includes(search)
        );
      }

      setFixtures(filtered);
      setLoading(false);
    };

    loadFixtures();
  }, [date, filterTeam]);

  return { fixtures, loading };
};
