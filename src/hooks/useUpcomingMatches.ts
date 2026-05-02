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

// Function to clear bookmaker selections if needed (call this once if you get access denied)
export const clearBookmakerSelections = async () => {
  try {
    const response = await fetch(`https://api.odds-api.io/v3/bookmakers/selected/clear?apiKey=${ODDS_API_KEY}`, {
      method: 'PUT'
    });
    const data = await response.json();
    console.log("[OddsAPI] Selection cleared:", data);
    return data;
  } catch (err) {
    console.error("[OddsAPI] Failed to clear selections:", err);
  }
};

// Global cache for bookmakers to avoid multiple calls
let bookmakerSlugsCache: string[] | null = null;

const getBookmakerSlugs = async (): Promise<string[]> => {
  if (bookmakerSlugsCache && bookmakerSlugsCache.length > 0) return bookmakerSlugsCache;
  
  try {
    console.log("[OddsAPI] Fetching available bookmakers...");
    const response = await fetch(`https://api.odds-api.io/v3/bookmakers?apiKey=${ODDS_API_KEY}`);
    const data = await response.json();

    if (!response.ok) {
      console.error("[OddsAPI] Bookmakers response not OK:", response.status, data);
      // If we get an error, it might contain the allowed bookmakers
      if (data.error && data.error.includes("Allowed:")) {
        const match = data.error.match(/Allowed: ([^.]+)/);
        if (match && match[1]) {
          const allowed = match[1].split(',').map((s: string) => s.trim());
          bookmakerSlugsCache = allowed;
          return allowed;
        }
      }
      return ["Bet365", "1xBet"]; 
    }

    let slugs: string[] = [];
    if (Array.isArray(data)) {
      // Prioritize Bet365 and 1xBet
      const allSlugs = data.map((b: any) => (b.name || b.slug || b.key || b.id || "").toString());
      const preferred = allSlugs.filter(s => 
        s.toLowerCase().includes('bet365') || 
        s.toLowerCase().includes('1xbet')
      );
      
      if (preferred.length > 0) {
        slugs = [...preferred, ...allSlugs.filter(s => !preferred.includes(s))];
      } else {
        slugs = allSlugs;
      }
    }
      
    const limitedSlugs = slugs.slice(0, 2);
    bookmakerSlugsCache = limitedSlugs;
    return limitedSlugs;
  } catch (err) {
    console.error("[OddsAPI] Exception in getBookmakerSlugs:", err);
    return ["Bet365", "1xBet"];
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
        
        let response = await fetch(url);
        
        // If the request fails with 400 (likely invalid bookmaker), try without the bookmakers filter
        if (!response.ok && response.status === 400) {
          console.warn("[OddsAPI] Request with bookmakers failed, trying without filter...");
          const fallbackUrl = `https://api.odds-api.io/v3/odds?apiKey=${ODDS_API_KEY}&eventId=${eventId}`;
          response = await fetch(fallbackUrl);
        }
        
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
      
      const marketNameMap: Record<string, string> = {
        'ML': '1X2',
        'OU': 'Totals',
        'BTTS': 'Both Teams to Score',
        'DC': 'Double Chance',
        'DNB': 'Draw No Bet',
        'AH': 'Asian Handicap',
        'EH': 'European Handicap',
        'CS': 'Correct Score',
        'HTFT': 'HT/FT',
        'HT_ML': 'HT 1X2',
        'HT_OU': 'HT Totals',
        'HT_BTTS': 'HT BTTS',
        'Corners': 'Corners',
        'Cards': 'Cards',
        'FTS': 'First Team to Score',
        'OE': 'Odd/Even',
        'CleanSheet': 'Clean Sheet',
        'WinToNil': 'Win to Nil',
        'AnytimeScorer': 'Anytime Scorer',
        'FirstScorer': 'First Scorer',
        'LastScorer': 'Last Scorer',
        'BookingPoints': 'Booking Points'
      };

      Object.entries(bookmakers).forEach(([bookieName, markets]: [string, any]) => {
        if (!Array.isArray(markets)) return;

        markets.forEach((market: any) => {
          const rawMarketName = market.name || 'Unknown';
          const readableMarket = marketNameMap[rawMarketName] || rawMarketName;

          if (Array.isArray(market.odds)) {
            market.odds.forEach((odd: any) => {
              Object.entries(odd).forEach(([side, price]: [string, any]) => {
                // Skip meta-fields
                if (['updatedAt', 'marketId'].includes(side)) return;
                
                let outcomeName = side;
                const handicap = odd.hdp || odd.handicap || odd.total || '';
                
                // Format outcome based on side key
                if (side === 'home') outcomeName = eventData.home || 'Home';
                else if (side === 'away') outcomeName = eventData.away || 'Away';
                else if (side === 'draw') outcomeName = 'Draw';
                else if (side === 'over') outcomeName = `Over ${handicap}`;
                else if (side === 'under') outcomeName = `Under ${handicap}`;
                else if (side === 'yes') outcomeName = 'Yes';
                else if (side === 'no') outcomeName = 'No';
                else if (side === '1X') outcomeName = '1X';
                else if (side === '12') outcomeName = '12';
                else if (side === 'X2') outcomeName = 'X2';
                else if (side === '1') outcomeName = eventData.home || 'Home';
                else if (side === '2') outcomeName = eventData.away || 'Away';
                // HT/FT formats like home_home, home_draw, etc.
                else if (side.includes('_')) {
                  outcomeName = side.replace('_', '/').replace('home', 'H').replace('away', 'A').replace('draw', 'D');
                }

                // Add handicap/total if present and not already in name
                if (handicap && !outcomeName.includes(handicap.toString())) {
                  outcomeName += ` (${handicap > 0 ? '+' : ''}${handicap})`;
                }
                
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

      // Keep only best price for each unique outcome name
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
