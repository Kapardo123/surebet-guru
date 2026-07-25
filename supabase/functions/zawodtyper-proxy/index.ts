// Supabase Edge Function: zawodtyper-proxy
// Fetches daily betting tips from zawodtyper.pl (server-side: the site sends no
// CORS headers, so the browser cannot call it directly).
//
// Unlike sportytrader-proxy this does NOT scrape HTML. The daily pages ship an
// empty <div data-page="betting-tips"> and hydrate it client-side, so the tips
// only exist in the site's internal JSON API:
//   POST /wp-content/NP_ajax.php  { endpoint: "api_get_td_post_id_by_date", daily_bets_date }
//   POST /wp-content/NP_ajax.php  { endpoint: "api_get_bets_by_post_id", post_id, offset, count }
//
// Actions:
//   { action: "list", date? }  -> { date, postId, matches: NormalisedMatch[] }
//                                 date defaults to today in Europe/Warsaw.
//
// NOTE: no AI runs here. Analyses are written by the ai-analyze function, and
// only for the matches the admin actually selects.
//
// Parsing rules live in ./parse.ts so they can be unit-tested from the app's
// vitest suite (src/lib/zawodTyperParse.test.ts).
//
// Deploy: supabase functions deploy zawodtyper-proxy --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { attachKickoffChecks, Fixture, normaliseFeed, RawBet } from "./parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE = "https://zawodtyper.pl";
const AJAX = `${BASE}/wp-content/NP_ajax.php`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// The endpoint 400s without an endpoint key and expects a JSON body.
const callAjax = async <T>(payload: Record<string, unknown>): Promise<T> => {
  const res = await fetch(AJAX, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      "Accept": "application/json",
      "Accept-Language": "pl-PL,pl;q=0.9",
      "Origin": BASE,
      "Referer": `${BASE}/typy-dnia/`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${payload.endpoint}`);
  const json = await res.json();
  if (json?.success !== true) {
    throw new Error(
      `Upstream rejected ${payload.endpoint}: ${JSON.stringify(json?.data).slice(0, 120)}`,
    );
  }
  return json.data as T;
};

const todayInWarsaw = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

// --- independent fixture list, for verifying the tipster-typed kickoff -------
// zawodtyper's match_date is free-text, so it is checked against odds-api.io.
// The key is already public in the client bundle (useUpcomingMatches.ts); move
// it to a function secret to stop shipping it to browsers.
const ODDS_API_KEY =
  Deno.env.get("ODDS_API_KEY") ||
  "32bd7bdc9792fd0b5dd5fe53f7791410334554a3ff7e08746c0cfa470c3d1a2a";

// Our sport labels -> odds-api.io slugs. Speedway is deliberately absent: the
// provider does not carry it, and those tips stay unverified rather than being
// reported as "not found".
const ODDS_API_SPORTS: Record<string, string> = {
  Football: "football",
  Tennis: "tennis",
  Basketball: "basketball",
  Volleyball: "volleyball",
  Hockey: "ice-hockey",
  Handball: "handball",
  Baseball: "baseball",
  Darts: "darts",
  Snooker: "snooker",
  Esports: "esports",
  MMA: "mixed-martial-arts",
  Boxing: "boxing",
  "American Football": "american-football",
};

interface OddsApiEvent {
  home?: string;
  away?: string;
  date?: string;
  league?: { name?: string };
  status?: string;
}

// The API caps a response at 5000 events, so query a tight window around the
// requested day (Warsaw local midnight to midnight, expressed in UTC).
const fetchFixtures = async (sportSlug: string, date: string): Promise<Fixture[]> => {
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCHours(from.getUTCHours() - 3); // cover CET/CEST plus a margin
  const to = new Date(`${date}T23:59:00Z`);
  to.setUTCHours(to.getUTCHours() + 3);

  const url =
    `https://api.odds-api.io/v3/events?apiKey=${ODDS_API_KEY}` +
    `&sport=${sportSlug}` +
    `&from=${from.toISOString().slice(0, 19)}Z` +
    `&to=${to.toISOString().slice(0, 19)}Z`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`odds-api ${res.status} for ${sportSlug}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((e: OddsApiEvent) => e?.home && e?.away && e?.date)
    .map((e: OddsApiEvent) => ({
      home: String(e.home),
      away: String(e.away),
      dateUtc: String(e.date),
      league: String(e.league?.name || ""),
      status: String(e.status || ""),
    }));
};

// One request per sport actually present in the day's tips, in parallel.
// A provider outage must not fail the scrape, so failures degrade to "no
// fixture list for that sport" and the tips simply come back unverified.
const fetchFixturesForSports = async (
  sports: string[],
  date: string,
): Promise<Record<string, Fixture[]>> => {
  const wanted = sports.filter((s) => ODDS_API_SPORTS[s]);
  const results = await Promise.all(
    wanted.map(async (sport) => {
      try {
        return [sport, await fetchFixtures(ODDS_API_SPORTS[sport], date)] as const;
      } catch (e) {
        console.error(`[zawodtyper-proxy] fixtures for ${sport}:`, e);
        return [sport, null] as const;
      }
    }),
  );
  const out: Record<string, Fixture[]> = {};
  for (const [sport, fixtures] of results) {
    if (fixtures) out[sport] = fixtures;
  }
  return out;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "list";

    if (action !== "list") throw new Error(`Unknown action: ${action}`);

    const date: string = /^\d{4}-\d{2}-\d{2}$/.test(body?.date || "")
      ? body.date
      : todayInWarsaw();

    const postId = await callAjax<string>({
      endpoint: "api_get_td_post_id_by_date",
      daily_bets_date: `${date} 00:00:00`,
    });
    if (!postId) throw new Error(`No "typy dnia" post for ${date}`);

    const rows = await callAjax<RawBet[]>({
      endpoint: "api_get_bets_by_post_id",
      post_id: Number(postId),
      offset: 0,
      count: 500,
    });

    const matches = normaliseFeed(rows, date, String(postId));

    // Verify the tipster-typed kickoffs unless the caller opted out.
    let verified = matches;
    let verifiedSports: string[] = [];
    if (body?.verify !== false) {
      const sports = [...new Set(matches.map((m) => m.sport))];
      const fixtures = await fetchFixturesForSports(sports, date);
      verifiedSports = Object.keys(fixtures);
      verified = attachKickoffChecks(matches, fixtures);
    }

    return new Response(
      JSON.stringify({ date, postId: String(postId), matches: verified, verifiedSports }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[zawodtyper-proxy]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
