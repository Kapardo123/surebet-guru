import { useState, useEffect, useRef } from "react";

export interface OddsOutcome {
  name: string;
  price: number;
  market: string;
}

export interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  league: string;
  allOdds?: OddsOutcome[];
}

export interface League {
  name: string;
  slug: string;
}

// Odds-API.io Integration Hook - Forced Vercel Redeploy
const ODDS_API_KEY = "32bd7bdc9792fd0b5dd5fe53f7791410334554a3ff7e08746c0cfa470c3d1a2a";

// Global cache for bookmakers to avoid multiple calls
let bookmakerSlugsCache: string[] | null = null;

const getBookmakerSlugs = async (): Promise<string[]> => {
  if (bookmakerSlugsCache && bookmakerSlugsCache.length > 0) return bookmakerSlugsCache;
  
  try {
    console.log("[OddsAPI] Fetching available bookmakers...");
    const response = await fetch(`https://api.odds-api.io/v3/bookmakers?apiKey=${ODDS_API_KEY}`);
    
    if (!response.ok) {
      console.error("[OddsAPI] Bookmakers response not OK:", response.status);
      return ["bet365", "1xbet"]; // Fallback to common ones if API fails
    }

    const data = await response.json();
    let slugs: string[] = [];

    if (Array.isArray(data)) {
      slugs = data
        .map((b: any) => (b.slug || b.key || b.id || "").toString())
        .filter(s => s.trim().length > 0);
    } else if (data && typeof data === 'object') {
      // If it's an object, it might be { slug1: {...}, slug2: {...} } or { error: "..." }
      if (data.error) {
        console.error("[OddsAPI] API Error in bookmakers:", data.error);
        return ["bet365", "1xbet"];
      }
      slugs = Object.keys(data).filter(key => key !== 'error' && key.length > 0);
    }
      
    console.log("[OddsAPI] Parsed bookmaker slugs:", slugs);
    
    if (slugs.length > 0) {
      bookmakerSlugsCache = slugs;
      return slugs;
    }
    
    return ["bet365", "1xbet"]; // Last resort fallback
  } catch (err) {
    console.error("[OddsAPI] Exception in getBookmakerSlugs:", err);
    return ["bet365", "1xbet"];
  }
};

export const useLeagues = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeagues = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://api.odds-api.io/v3/leagues?apiKey=${ODDS_API_KEY}&sport=football&all=true`);
        if (!response.ok) throw new Error("Failed to fetch leagues");
        const data = await response.json();
        // Filter leagues with events
        if (Array.isArray(data)) {
          setLeagues(data.filter((l: any) => l.eventsCount > 0).map((l: any) => ({ name: l.name, slug: l.slug })));
        } else {
          console.error("Leagues API returned non-array data:", data);
          setLeagues([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, []);

  return { leagues, loading };
};

export const useLeagueMatches = (leagueSlug: string | null) => {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leagueSlug) {
      setMatches([]);
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://api.odds-api.io/v3/events?apiKey=${ODDS_API_KEY}&sport=football&league=${leagueSlug}&status=pending`);
        if (!response.ok) throw new Error("Failed to fetch matches");
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setMatches(data.map((event: any) => ({
            id: event.id.toString(),
            homeTeam: event.home,
            awayTeam: event.away,
            date: event.date ? new Date(event.date).toISOString().split('T')[0] : "TBD",
            time: event.date ? new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "TBD",
            league: event.league?.name || "Football",
          })));
        } else {
          setMatches([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [leagueSlug]);

  return { matches, loading };
};

export const useEventOdds = (eventId: string | null) => {
  const [outcomes, setOutcomes] = useState<OddsOutcome[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setOutcomes([]);
      return;
    }

    const fetchOdds = async () => {
      setLoading(true);
      console.log(`[OddsAPI] Fetching odds for event: ${eventId}`);
      try {
        // Step 1: Get valid bookmaker slugs
        const validSlugs = await getBookmakerSlugs();
        
        // Step 2: Build the request with valid slugs (max 30 allowed)
        // Ensure no empty strings or spaces get through
        const cleanSlugs = validSlugs
          .map(s => s?.toString().trim())
          .filter(s => s && s.length > 0)
          .slice(0, 30);
          
        const bookmakersParam = cleanSlugs.join(',');
          
        if (!bookmakersParam) {
          throw new Error("No valid bookmaker slugs available for the request.");
        }

        const url = `https://api.odds-api.io/v3/odds?apiKey=${ODDS_API_KEY}&eventId=${eventId}&bookmakers=${encodeURIComponent(bookmakersParam)}`;
        console.log(`[OddsAPI] Request URL: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API Error ${response.status}`);
        }
        
        const eventData = await response.json();
        processEventData(eventData);
      } catch (err: any) {
        console.error("[OddsAPI] Error in useEventOdds:", err);
        setOutcomes([]);
      } finally {
        setLoading(false);
      }
    };

    const processEventData = (eventData: any) => {
      if (!eventData || !eventData.bookmakers) {
        console.warn("[OddsAPI] No bookmakers found for this event:", eventData);
        setOutcomes([]);
        return;
      }

      const allOutcomes: OddsOutcome[] = [];
      const bookmakers = eventData.bookmakers;
      
      Object.entries(bookmakers).forEach(([bookieName, markets]: [string, any]) => {
        if (!Array.isArray(markets)) return;

        markets.forEach((market: any) => {
          const marketName = market.name || 'Unknown';
          const readableMarket = marketName === 'ML' ? '1X2' : 
                               marketName === 'OU' ? 'Over/Under' : 
                               marketName === 'BTTS' ? 'BTTS' : marketName;

          if (Array.isArray(market.odds)) {
            market.odds.forEach((odd: any) => {
              Object.entries(odd).forEach(([side, price]: [string, any]) => {
                if (['updatedAt', 'handicap', 'total', 'marketId'].includes(side)) return;
                
                let outcomeName = side;
                if (side === 'home') outcomeName = eventData.home || 'Home';
                if (side === 'away') outcomeName = eventData.away || 'Away';
                if (side === 'draw') outcomeName = 'Draw';
                if (side === 'over') outcomeName = `Over ${odd.total || ''}`;
                if (side === 'under') outcomeName = `Under ${odd.total || ''}`;
                if (side === 'yes') outcomeName = 'BTTS: Yes';
                if (side === 'no') outcomeName = 'BTTS: No';
                
                allOutcomes.push({
                  name: `${readableMarket}: ${outcomeName}`,
                  price: parseFloat(price) || 0,
                  market: readableMarket
                });
              });
            });
          }
        });
      });

      const bestOdds = allOutcomes.reduce((acc, curr) => {
        if (!acc[curr.name] || acc[curr.name].price < curr.price) {
          acc[curr.name] = curr;
        }
        return acc;
      }, {} as Record<string, OddsOutcome>);

      const finalOutcomes = Object.values(bestOdds);
      console.log(`[OddsAPI] Successfully parsed ${finalOutcomes.length} outcomes`);
      setOutcomes(finalOutcomes);
    };

    fetchOdds();
  }, [eventId]);

  return { outcomes, loading };
};

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
        const response = await fetch(
          `https://api.odds-api.io/v3/events?apiKey=${ODDS_API_KEY}&sport=football&status=pending&search=${encodeURIComponent(teamName)}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const events = await response.json();
        
        if (!Array.isArray(events)) {
          setMatches([]);
          setLoading(false);
          return;
        }

        const topEvents = events.slice(0, 5);
        const eventIds = topEvents.map(e => e.id).join(',');

        // Step 2: Fetch odds for these events in ONE multi-odds request
        // We also need to provide bookmakers here to avoid "Missing bookmakers"
        const validSlugs = await getBookmakerSlugs();
        const bookmakersParam = validSlugs.length > 0 
          ? `&bookmakers=${validSlugs.filter(s => s && s.trim().length > 0).slice(0, 30).join(',')}` 
          : "";
        
        const oddsResponse = await fetch(
          `https://api.odds-api.io/v3/odds/multi?apiKey=${ODDS_API_KEY}&eventIds=${eventIds}${bookmakersParam}`,
          { signal: controller.signal }
        );

        let oddsData: any[] = [];
        if (oddsResponse.ok) {
          oddsData = await oddsResponse.json();
        }

        const mappedMatches = topEvents.map((event: any) => {
          const eventOdds = Array.isArray(oddsData) ? oddsData.find(o => o.id === event.id) : null;
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
