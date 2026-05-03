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
      setLoading(true);
      const targetDate = date || new Date().toISOString().split('T')[0];
      const data = await fetchFixturesByDate(targetDate);
      
      const enhancedData = await Promise.all(data.map(async (fixture) => {
        // Fetch logos (will use cache if available)
        const homeLogo = await getTeamLogo(fixture.home_team, fixture.home_team_id);
        const awayLogo = await getTeamLogo(fixture.away_team, fixture.away_team_id);
        
        return {
          ...fixture,
          homeLogo,
          awayLogo,
          formattedDate: targetDate,
          formattedTime: fixture.status === 'NS' ? "Upcoming" : fixture.status
        };
      }));

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
