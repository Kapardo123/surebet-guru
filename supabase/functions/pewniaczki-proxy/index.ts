// Supabase Edge Function: pewniaczki-proxy
// Fetches daily betting tips from pewniaczki.pl (server-side: the site sends no
// CORS headers, so the browser cannot call it directly).
//
// Unlike zawodtyper-proxy (JSON API) this scrapes HTML. The hub pages render
// every tip server-side inside <div class="pw-hub__row"> blocks, so a plain GET
// with a browser User-Agent is enough — no headless browser needed.
//
// Actions:
//   { action: "list", day?: "today" | "tomorrow", analysis?: boolean }
//     -> { day, url, date, withNotes, matches: PewniakMatch[] }
//   `analysis` defaults to true: each match's own page is fetched to fill in
//   analysisRaw (the hub row itself carries only the short pick). Pass
//   { analysis: false } for a fast, list-only fetch.
//
// NOTE: no AI runs here. Analyses are translated/rewritten by the ai-analyze
// function, and only for the matches the admin actually selects.
//
// Parsing rules live in ./parse.ts so they can be unit-tested from the app's
// vitest suite (src/lib/pewniaczkiParse.test.ts).
//
// Deploy: supabase functions deploy pewniaczki-proxy --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { BASE, extractAnalysis, parseHubPage, PewniakMatch } from "./parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGES: Record<string, string> = {
  today: "/typy-na-dzis/",
  tomorrow: "/typy-na-jutro/",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Fallback date when a row carries no data-ts. day is resolved in Europe/Warsaw
// so the result matches the page's own "Terminarz na ..." heading.
const warsawDate = (offsetDays: number): string => {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const fetchPage = async (url: string): Promise<string> => {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pl-PL,pl;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  return await res.text();
};

// Fetch one match page and pull the written analysis out of it. A failure must
// not break the whole scrape — the row simply has no note, and the AI step then
// falls back to writing from the market.
const fetchAnalysis = async (url: string): Promise<string> => {
  if (!url || !/^https?:\/\//.test(url)) return "";
  try {
    return extractAnalysis(await fetchPage(url));
  } catch (e) {
    console.error("[pewniaczki-proxy] analysis", url, e);
    return "";
  }
};

// Match pages are fetched a few at a time: one request per tip, so a 19-tip day
// is 19 pages. Parallel but bounded so we stay polite and fast.
const ANALYSIS_CONCURRENCY = 5;

const enrichWithAnalysis = async (matches: PewniakMatch[]): Promise<void> => {
  let cursor = 0;
  const workers = new Array(Math.min(ANALYSIS_CONCURRENCY, matches.length))
    .fill(0)
    .map(async () => {
      while (cursor < matches.length) {
        const i = cursor++;
        matches[i].analysisRaw = await fetchAnalysis(matches[i].url);
      }
    });
  await Promise.all(workers);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "list";
    if (action !== "list") throw new Error(`Unknown action: ${action}`);

    const day: "today" | "tomorrow" = body?.day === "tomorrow" ? "tomorrow" : "today";
    const path = PAGES[day];
    const url = `${BASE}${path}`;
    const fallbackDate = warsawDate(day === "tomorrow" ? 1 : 0);

    const html = await fetchPage(url);
    const matches = parseHubPage(html, fallbackDate);

    // The hub shows only the short pick, so pull each match's own analysis from
    // its detail page. Opt out with { analysis: false } for a fast list-only
    // fetch (no per-match requests).
    let withNotes = 0;
    if (body?.analysis !== false) {
      await enrichWithAnalysis(matches);
      withNotes = matches.filter((m) => m.analysisRaw).length;
    }

    return new Response(
      JSON.stringify({ day, url, date: fallbackDate, withNotes, matches }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[pewniaczki-proxy]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
