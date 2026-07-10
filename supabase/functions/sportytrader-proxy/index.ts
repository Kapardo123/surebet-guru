// Supabase Edge Function: sportytrader-proxy
// Scrapes betting tips from sportytrader.com (server-side to bypass CORS + 403 bot block).
//
// Actions:
//   { action: "list" }            -> [{ id, url, label }]  (all match links on the tips listing)
//   { action: "match", url }      -> parsed match: teams, sport, league, date, time,
//                                     prediction, odds, analysisRaw, hasOdds
//
// Deploy:  supabase functions deploy sportytrader-proxy --no-verify-jwt
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BASE = "https://www.sportytrader.com";
const LISTING = `${BASE}/en/betting-tips/`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const fetchHtml = async (url: string): Promise<string> => {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status} for ${url}`);
  return await res.text();
};

// --- small HTML helpers (regex-based; Deno edge has no DOM) ---
const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ");
const decode = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&rsquo;|&#8217;/g, "’")
    .replace(/&hellip;/g, "…");
const clean = (s: string) => decode(stripTags(s)).replace(/\s+/g, " ").trim();

const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

// ---------------- LIST ----------------
// Each match on the tips listing is a card that carries the recommended pick AND
// its odds (a <bet-now-light odd="X"> element) — for every market type
// (1X2, Over/Under, BTTS, handicaps, sets, points, props...). This is the only
// place the pick's odds exist in static HTML, so odds are taken from here.
const parseList = (html: string) => {
  const marker =
    /data-navigation-url-value="(\/en\/betting-tips\/([a-z0-9-]+-(\d+))\/)"/g;
  const starts: { idx: number; url: string; id: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = marker.exec(html)) !== null) {
    starts.push({ idx: m.index, url: `${BASE}${m[1]}`, id: m[3] });
  }

  const seen = new Set<string>();
  const out: {
    id: string; url: string; homeTeam: string; awayTeam: string;
    date: string; time: string; kickoff: string;
    prediction: string; odds: number | null;
    homeTeamLogo: string | null; awayTeamLogo: string | null;
  }[] = [];

  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    const card = html.slice(s.idx, i + 1 < starts.length ? starts[i + 1].idx : html.length);

    // date + time: "11 Jul 2026, 01:30"
    let date = "";
    let time = "";
    const dt = card.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4}),?\s*(\d{2}:\d{2})/);
    if (dt) {
      const mm = MONTHS[dt[2]] || "01";
      date = `${dt[3]}-${mm}-${dt[1].padStart(2, "0")}`;
      time = dt[4];
    }
    const kickoff = date ? `${date}${time ? " " + time : " 00:00"}` : "";

    // teams from the card title "X vs Y Prediction"
    let homeTeam = "";
    let awayTeam = "";
    const tt = card.match(/>([^<]+?)\s+vs\s+([^<]+?)\s+Prediction</i);
    if (tt) {
      homeTeam = clean(tt[1]);
      awayTeam = clean(tt[2]);
    }

    // pick: first meaningful text node after the title (skip "Odds", bonuses, pure numbers)
    let prediction = "";
    const te = card.search(/vs\s+[^<]+\s+Prediction</i);
    if (te !== -1) {
      const after = card.slice(te);
      for (const x of after.matchAll(/>([^<>]{2,60})</g)) {
        const t = clean(x[1]);
        const low = t.toLowerCase();
        if (!t || low === "odds" || low === "vs" || low === "-") continue;
        if (low.includes("bonus")) continue;
        if (!/[a-z]/i.test(t)) continue; // skip pure numbers / odds values
        prediction = t;
        break;
      }
    }

    // odds for the recommended pick
    let odds: number | null = null;
    // 1. <bet-now-light odd="X"> attribute (multi-line aware)
    const bnl = card.match(/<bet-now-light[\s\S]*?\bodd="([\d.]+)"/);
    if (bnl) {
      const v = parseFloat(bnl[1]);
      if (v > 0) odds = v;
    }
    // 2. <span class="font-bold tabular-nums tracking-tight">VALUE</span>
    if (odds === null) {
      const fb = card.match(/<span[^>]*\bfont-bold\b[^>]*>([\d.]+)<\/span>/);
      if (fb) {
        const v = parseFloat(fb[1]);
        if (v > 0) odds = v;
      }
    }
    // 3. "Odds" label followed by numeric span (catch-all)
    if (odds === null) {
      const lbl = card.match(/Odds<\/span>\s*<span[^>]*>([\d.]+)<\/span>/);
      if (lbl) {
        const v = parseFloat(lbl[1]);
        if (v > 0) odds = v;
      }
    }

    // team logos: two <img> under /teams/ (alt = team name). Upscale 30x30 -> 60x60.
    let homeTeamLogo: string | null = null;
    let awayTeamLogo: string | null = null;
    const teamImgs = [...card.matchAll(/<img[^>]+>/g)]
      .map((x) => x[0])
      .filter((t) => t.includes("/teams/"))
      .map((t) => ({
        src: (t.match(/src="([^"]+)"/)?.[1] || "").replace("/30x30/", "/60x60/"),
        alt: (t.match(/alt="([^"]*)"/)?.[1] || "").toLowerCase(),
      }));
    for (const p of teamImgs) {
      if (!p.src) continue;
      if (homeTeam && p.alt === homeTeam.toLowerCase()) homeTeamLogo = p.src;
      else if (awayTeam && p.alt === awayTeam.toLowerCase()) awayTeamLogo = p.src;
    }
    if (!homeTeamLogo && teamImgs[0]?.src) homeTeamLogo = teamImgs[0].src;
    if (!awayTeamLogo && teamImgs[1]?.src) awayTeamLogo = teamImgs[1].src;

    out.push({
      id: s.id, url: s.url, homeTeam, awayTeam, date, time, kickoff,
      prediction, odds, homeTeamLogo, awayTeamLogo,
    });
  }
  return out;
};

// ---------------- MATCH ----------------
const SPORT_MAP: Record<string, string> = {
  football: "Football",
  soccer: "Football",
  tennis: "Tennis",
  basketball: "Basketball",
  "ice hockey": "Hockey",
  hockey: "Hockey",
  baseball: "Baseball",
  mma: "MMA",
  ufc: "MMA",
  boxing: "MMA",
  esports: "Esports",
  "e-sports": "Esports",
  rugby: "Rugby",
};

const mapSport = (raw: string): string => {
  const key = raw.toLowerCase().replace(/\s*predictions?$/i, "").trim();
  return SPORT_MAP[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "Football");
};

const PROMO_RE =
  /(sportytrader|bet365|betsson|888starz|1xbet|bwin|unibet|winamax|parions|betway|betfair|promo code|welcome (package|bonus)|free bets?|open(ing)? (an|your)? ?account|qualifying bet|try your luck|your luck|sign up|our prediction for the|our algorithm|according to our|probabilit|odds movement|opening odds|pre-match odds|best odds|published on|modified on|about us|copyright|conditions of use|gambling|editorial policy|[€£$]\s?\d)/i;

const parseMatch = (html: string, id: string, url: string) => {
  // breadcrumb depth varies: 5 items (Home, Betting tips, <Sport> Predictions,
  // <Competition>, Home - Away) for some, 4 items (no separate competition) for
  // others. The team pair is always the LAST item containing " - ".
  const ldMatch = html.match(/BreadcrumbList[\s\S]*?<\/script>/);
  let sportRaw = "";
  let league = "";
  let pair = "";
  if (ldMatch) {
    const names = [...ldMatch[0].matchAll(/"name":\s*"([^"]+)"/g)].map((x) =>
      decode(x[1]),
    );
    sportRaw = names[2] || "";
    for (let i = names.length - 1; i >= 0; i--) {
      if (names[i].includes(" - ")) {
        pair = names[i];
        break;
      }
    }
    if (names.length >= 5) league = names[3] || "";
  }

  // h1: "{Home} vs {Away} Prediction & Betting Tips - {League}"
  const h1 = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || "");

  // teams: from the breadcrumb pair, fallback to the h1 "X vs Y Prediction"
  let homeTeam = "";
  let awayTeam = "";
  if (pair.includes(" - ")) {
    const p = pair.split(" - ");
    homeTeam = p[0].trim();
    awayTeam = p[1].trim();
  }
  if (!homeTeam || !awayTeam) {
    const vs = h1.match(/^(.*?)\s+vs\s+(.*?)\s+Prediction/i);
    if (vs) {
      homeTeam = vs[1].trim();
      awayTeam = vs[2].trim();
    }
  }

  // league: from breadcrumb when present, otherwise the h1 suffix after " - "
  if (!league) {
    const lm = h1.match(/-\s*([^-]+?)\s*$/);
    if (lm) league = lm[1].trim();
  }

  const sport = mapSport(sportRaw);

  // date from meta description: "... on 10/07/2026 ..."
  let date = "";
  const desc = html.match(/name="description"\s+content="([^"]+)"/i);
  const dm = (desc?.[1] || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dm) date = `${dm[3]}-${dm[2]}-${dm[1]}`; // YYYY-MM-DD

  // time: <span class="text-center  font-semibold">21:00</span> (note: variable spacing in class)
  let time = "";
  const tm =
    html.match(/text-center\s+font-semibold[^>]*>\s*(\d{1,2}:\d{2})\s*</) ||
    html.match(/>\s*(\d{1,2}:\d{2})\s*<\/span>/);
  if (tm) time = tm[1];

  const kickoff = date ? `${date}${time ? " " + time : " 00:00"}` : "";

  // prediction: "... is: </span><span class="font-semibold">Spain wins.</span>"
  let prediction = "";
  const predM = html.match(
    /prediction for the[\s\S]{0,120}?is:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/i,
  );
  if (predM) prediction = clean(predM[1]).replace(/\.$/, "");

  // odds: try multiple strategies
  let odds: number | null = null;
  // 1. bet-now-light (multi-line) or bet-now-large
  const bnl = html.match(/<bet-now-(?:light|large)[\s\S]*?\bodd="([\d.]+)"/);
  if (bnl) {
    const v = parseFloat(bnl[1]);
    if (v > 0) odds = v;
  }
  // 2. font-bold span (same as listing cards)
  if (odds === null) {
    const fb = html.match(/<span[^>]*\bfont-bold\b[^>]*>([\d.]+)<\/span>/);
    if (fb) {
      const v = parseFloat(fb[1]);
      if (v > 0) odds = v;
    }
  }
  // 3. Bookmaker odds table: <span class="...pastille--cotes...">ODDS</span>
  // The first row's three odds are 1X2 (home/draw/away). Pick the lowest
  // (most likely favourite) as a sensible default for the recommended bet.
  if (odds === null) {
    const pastille = [...html.matchAll(/<span[^>]*\bpastille--cotes\b[^>]*>([\d.]+)<\/span>/g)];
    if (pastille.length > 0) {
      const vals = pastille.map((x) => parseFloat(x[1])).filter((v) => v > 0);
      if (vals.length > 0) {
        // Use lowest odds from first bookmaker row (favourite)
        const firstRow = vals.slice(0, 3);
        odds = Math.min(...firstRow);
      }
    }
  }
  // 4. Prose: "odds of X.XX at Bookmaker"
  if (odds === null) {
    const prose = html.match(/\bodds of ([\d.]+)\b/i);
    if (prose) {
      const v = parseFloat(prose[1]);
      if (v > 0) odds = v;
    }
  }

  // analysis: prose <p> paragraphs, minus promo/meta/probability lines
  const proses = [...html.matchAll(/<div class="prose[^"]*">([\s\S]*?)<\/div>/g)].map(
    (x) => x[1],
  );
  const paras: string[] = [];
  for (const block of proses) {
    for (const pm of block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
      const txt = clean(pm[1]);
      if (txt.length < 60) continue;
      if (PROMO_RE.test(txt)) continue;
      paras.push(txt);
    }
  }
  const analysisRaw = paras.join("\n\n");

  return {
    id,
    url,
    homeTeam,
    awayTeam,
    sport,
    league,
    date,
    time,
    kickoff,
    prediction,
    odds,
    analysisRaw,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action || "list";

    if (action === "list") {
      const html = await fetchHtml(LISTING);
      const matches = parseList(html);
      return new Response(JSON.stringify({ matches }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (action === "match") {
      const url: string = body?.url;
      if (!url || !url.startsWith(`${BASE}/en/betting-tips/`)) {
        throw new Error("Invalid or missing match url");
      }
      const idMatch = url.match(/-(\d+)\/?$/);
      const id = idMatch ? idMatch[1] : url;
      const html = await fetchHtml(url);
      const match = parseMatch(html, id, url);
      return new Response(JSON.stringify({ match }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[sportytrader-proxy]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
