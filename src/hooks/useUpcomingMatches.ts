import { useState, useEffect, useRef } from "react";

export interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  league: string;
  odds?: {
    homeWin?: number;
    draw?: number;
    awayWin?: number;
  };
}

const ODDS_API_KEY = "32bd7bdc9792fd0b5dd5fe53f7791410334554a3ff7e08746c0cfa470c3d1a2a";

export const useUpcomingMatches = (teamName: string) => {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!teamName || teamName.length < 3) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    timerRef.current = setTimeout(async () => {
      try {
        // Fetch matches and odds from odds-api.io
        // Using the /v1/odds endpoint which provides both match info and odds
        // We filter by team name in the results to save requests
        const response = await fetch(
          `https://api.odds-api.io/v1/odds?apikey=${ODDS_API_KEY}&sport=soccer`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("API response error");
        
        const data = await response.json();
        
        // The API returns an array of events
        const events = Array.isArray(data) ? data : (data.data || []);
        
        const searchStr = teamName.toLowerCase();
        
        const filtered = events
          .filter((event: any) => {
            const home = (event.home_team || "").toLowerCase();
            const away = (event.away_team || "").toLowerCase();
            return home.includes(searchStr) || away.includes(searchStr);
          })
          .slice(0, 5)
          .map((event: any) => {
            // Find 1x2 odds if available
            const h2hOdds = event.bookmakers?.[0]?.markets?.find((m: any) => m.key === "h2h")?.outcomes;
            
            return {
              id: event.id || Math.random().toString(36).substr(2, 9),
              homeTeam: event.home_team,
              awayTeam: event.away_team,
              date: event.commence_time ? new Date(event.commence_time).toISOString().split('T')[0] : "TBD",
              time: event.commence_time ? new Date(event.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD",
              league: event.sport_title || "Soccer",
              odds: h2hOdds ? {
                homeWin: h2hOdds.find((o: any) => o.name === event.home_team)?.price,
                draw: h2hOdds.find((o: any) => o.name === "Draw")?.price,
                awayWin: h2hOdds.find((o: any) => o.name === event.away_team)?.price,
              } : undefined
            };
          });

        if (!controller.signal.aborted) {
          setMatches(filtered);
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Odds API Error:", err);
          setMatches([]);
          setLoading(false);
        }
      }
    }, 800);

    return () => {
      clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [teamName]);

  return { matches, loading };
};
