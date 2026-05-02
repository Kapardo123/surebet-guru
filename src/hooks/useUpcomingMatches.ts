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
        // According to Odds-API.io v3 documentation, /events is the correct endpoint
        // Let's use the search query to find specific teams
        const response = await fetch(
          `https://api.odds-api.io/v3/events?apiKey=${ODDS_API_KEY}&sport=football&status=pending&search=${encodeURIComponent(teamName)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const events = await response.json();
        
        if (!Array.isArray(events)) {
          console.error("API returned non-array response:", events);
          setMatches([]);
          setLoading(false);
          return;
        }

        if (events.length === 0) {
          setMatches([]);
          setLoading(false);
          return;
        }

        // To save credits, we'll try to get odds in the same request if the API allows or 
        // fetch odds for the first 3 events only to minimize usage
        const topEvents = events.slice(0, 5);
        const eventIds = topEvents.map(e => e.id).join(',');

        const oddsResponse = await fetch(
          `https://api.odds-api.io/v3/odds/multi?apiKey=${ODDS_API_KEY}&eventIds=${eventIds}`,
          { signal: controller.signal }
        );

        let oddsData: any[] = [];
        if (oddsResponse.ok) {
          oddsData = await oddsResponse.json();
        }

        const mappedMatches = topEvents.map((event: any) => {
          const eventOdds = Array.isArray(oddsData) ? oddsData.find(o => o.id === event.id) : null;
          
          // Look for Moneyline (1X2) odds from the first bookmaker
          let prices = null;
          if (eventOdds && eventOdds.bookmakers) {
            const firstBookie = Object.values(eventOdds.bookmakers)[0] as any[];
            const mlMarket = firstBookie?.find((m: any) => m.name === "ML" || m.name === "1x2");
            prices = mlMarket?.odds?.[0];
          }

          return {
            id: event.id.toString(),
            homeTeam: event.home,
            awayTeam: event.away,
            date: event.date ? new Date(event.date).toISOString().split('T')[0] : "TBD",
            time: event.date ? new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD",
            league: event.league?.name || "Football",
            odds: prices ? {
              homeWin: parseFloat(prices.home),
              draw: parseFloat(prices.draw),
              awayWin: parseFloat(prices.away),
            } : undefined
          };
        });

        if (!controller.signal.aborted) {
          setMatches(mappedMatches);
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Odds API Hook Error:", err);
          setMatches([]);
          setLoading(false);
        }
      }
    }, 1000);

    return () => {
      clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [teamName]);

  return { matches, loading };
};
