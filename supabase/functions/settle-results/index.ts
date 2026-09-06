// Supabase Edge Function: settle-results
// Rozstrzyga wczorajsze typy i kupony do archiwum `match_results`
// (zakładka "Yesterday's Results"), bo tabela `tips` jest czyszczona po 8h.
//
// Wyniki NIE pochodzą od AI — przychodzą z odds-api.io (ten sam dostawca,
// co weryfikacja terminarza w zawodtyper-proxy; eventy z przeszłości mają
// finalne `scores` i status settled/cancelled). Deterministycznie rozstrzygane
// są standardowe rynki (1X2, DC, DNB, over/under, BTTS); AI (OpenRouter)
// jest tylko fallbackiem dla nietypowych typów (betbuildery, handicapy...)
// i dostaje REALNY wynik meczu — interpretuje zakład, nie zgaduje wyniku.
//
// Przepływ w trzech fazach:
//   1. dopasowanie meczu + rozstrzygnięcie deterministyczne,
//   2. kolejka AI dla nogi nierozstrzygniętych (limit budżetu),
//   3. zapis do `tips`/`coupons` + archiwum `match_results`.
//
// Autoryzacja (pattern send-premium-push):
//   - cron: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//   - admin: zalogowany użytkownik JWT z e-mailem == ADMIN_EMAIL
//
// Input:  { date?: "YYYY-MM-DD" } (Europe/Warsaw; domyślnie wczoraj)
// Output: { ok, date, tips: {total, settled, won, lost, void, unresolved[]},
//           coupons: {settled, won, lost, void}, aiCalls }
//
// Deploy: supabase functions deploy settle-results --no-verify-jwt
// Sekrety: ODDS_API_KEY (opcjonalny), OPENROUTER_API_KEY (opcjonalny),
//          ADMIN_EMAIL (opcjonalny).

// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
// @ts-ignore
import { GoogleAuth } from "npm:google-auth-library@9.0.0";
import {
  aggregateCoupon,
  containment,
  describeIncidents,
  MATCH_THRESHOLD,
  matchEventForTip,
  settleTipAgainstEvent,
  teamTokens,
  yesterdayInWarsaw,
  type Fixture,
  type RawIncident,
  type SettleOutcome,
  type SettledStatus,
  type TipLike,
} from "./settle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Nasze etykiety sportów -> slugi odds-api.io (jak w zawodtyper-proxy).
// Speedway celowo go: dostawca go nie prowadzi, te typy zostają unresolved.
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

const ODDS_API_KEY =
  Deno.env.get("ODDS_API_KEY") ||
  "32bd7bdc9792fd0b5dd5fe53f7791410334554a3ff7e08746c0cfa470c3d1a2a";

const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const AI_MODELS = ["deepseek/deepseek-chat", "openai/gpt-4o-mini"];
const AI_BUDGET = 25; // twardy limit wywołań AI na jedno uruchomienie

const dateInWarsaw = (d: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(d);

// Odczyt eventów z odds-api.io z finalnymi wynikami. Okno: dzień warszawski
// ±3h (CET/CEST), jak w weryfikacji terminarza zawodtyper-proxy.
const fetchEvents = async (sportSlug: string, date: string): Promise<Fixture[]> => {
  const from = new Date(`${date}T00:00:00Z`);
  from.setUTCHours(from.getUTCHours() - 3);
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
    .filter((e: any) => e?.home && e?.away && e?.date)
    .map((e: any): Fixture => ({
      home: String(e.home),
      away: String(e.away),
      dateUtc: String(e.date),
      league: String(e.league?.name || ""),
      status: String(e.status || ""),
      scores: e.scores ?? null,
    }));
};

// Cache: sport + warszawska data. Jedno żądanie na parę na run.
class EventCache {
  private cache = new Map<string, Promise<Fixture[] | null>>();

  for(sport: string, date: string): Promise<Fixture[] | null> {
    const slug = ODDS_API_SPORTS[sport];
    if (!slug) return Promise.resolve(null);
    const key = `${slug}|${date}`;
    if (!this.cache.has(key)) {
      this.cache.set(
        key,
        fetchEvents(slug, date).catch((e) => {
          console.error(`[settle-results] events ${key}:`, e?.message || e);
          return null;
        }),
      );
    }
    return this.cache.get(key)!;
  }
}

// --- SofaScore incidents (best-effort) --------------------------------------
// Typy playerskie (strzelec gola, kartka, asysta) wymagają wiedzy, CO się
// wydarzyło, nie tylko wyniku. SofaScore udostępnia incydenty meczu; projekt
// już odpytuje api.sofascore.com z przeglądarki (loga), ale z serwera
// (datacenter IP) Cloudflare potrafi zwrócić 403 — wtedy zwracamy null
// i AI rozstrzyga wyłącznie rynki meczowe, a playerskie zostają unresolved.

const sofaJson = async (url: string): Promise<any | null> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        },
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
};

interface SofaSearchEvent {
  id?: number;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
}

const findSofaEvent = async (
  sportSlug: string,
  date: string,
  home: string,
  away: string,
): Promise<number | null> => {
  const json = await sofaJson(
    `https://api.sofascore.com/api/v1/sport/${sportSlug}/scheduled-events/${date}`,
  );
  const events: any[] = Array.isArray(json?.events) ? json.events : [];
  if (!events.length) return null;

  const tipHome = teamTokens(home);
  const tipAway = teamTokens(away);
  if (!tipHome.size || !tipAway.size) return null;

  for (const ev of events) {
    const evHome = teamTokens(String(ev?.homeTeam?.name || ""));
    const evAway = teamTokens(String(ev?.awayTeam?.name || ""));
    if (!evHome.size || !evAway.size) continue;
    // Ta sama reguła containment co przy dopasowaniu terminarza.
    const forward = Math.min(
      containment(tipHome, evHome),
      containment(tipAway, evAway),
    );
    if (forward >= MATCH_THRESHOLD) return Number(ev.id) || null;
  }
  return null;
};

const fetchSofaIncidents = async (
  sportSlug: string,
  date: string,
  home: string,
  away: string,
): Promise<string | null> => {
  try {
    const eventId = await findSofaEvent(sportSlug, date, home, away);
    if (!eventId) return null;
    const json = await sofaJson(
      `https://api.sofascore.com/api/v1/event/${eventId}/incidents`,
    );
    const incidents: RawIncident[] = Array.isArray(json?.incidents) ? json.incidents : [];
    return describeIncidents(incidents);
  } catch {
    return null;
  }
};

// Incydenty cache'ujemy per mecz (id tylko zależny od par + dnia).
class IncidentsCache {
  private cache = new Map<string, Promise<string | null>>();

  for(sportSlug: string, date: string, home: string, away: string): Promise<string | null> {
    const key = `${sportSlug}|${date}|${home}|${away}`;
    if (!this.cache.has(key)) {
      this.cache.set(key, fetchSofaIncidents(sportSlug, date, home, away));
    }
    return this.cache.get(key)!;
  }
}

interface CouponLeg extends TipLike {
  prediction: string;
  odds: number;
  league: string;
}

interface LegEval {
  status: SettleOutcome;
  finalScore: string | null;
  reason?: string;
  // Uzupełniane, gdy deterministyczna logika nie zna rynku, a mecz się skończył
  // — wtedy decyzję podejmuje AI na podstawie realnego wyniku.
  aiCtx?: {
    sport: string;
    league: string;
    prediction: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
    // Zdarzenia meczu (strzelcy, kartki, asysty) — null, gdy SofaScore jest
    // nieosiągalny; typy playerskie zostają wtedy unresolved (bez zgadywania).
    incidents?: string | null;
  };
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message: string };
}

const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
};

// Fallback AI: dostaje realny wynik (+ zdarzenia meczu, gdy udało się je
// pobrać) i interpretuje zakład. void tylko wtedy, gdy stawka powinna wrócić
// — nigdy dlatego, że typ przegrał. "unknown" = brak danych do decyzji.
const aiSettle = async (ctx: NonNullable<LegEval["aiCtx"]>): Promise<SettleOutcome> => {
  if (!OPENROUTER_API_KEY) return "unresolved";
  const hasIncidents = !!ctx.incidents;
  const prompt = `You are a betting settlement engine. Decide whether the bet WON, LOST, must be VOID, or UNKNOWN (cannot be decided from the given data).

Sport: ${ctx.sport}
Match: ${ctx.homeTeam} vs ${ctx.awayTeam}
${ctx.league ? `League: ${ctx.league}\n` : ""}Bet prediction: "${ctx.prediction}"
Final score: ${ctx.score} (home listed first)
${hasIncidents ? `\nMatch events (chronological):\n${ctx.incidents}\n` : ""}
Rules:
- Settle against the FINAL score and events given. Do not use outside knowledge.
- VOID only when the stake would be returned: the pick cannot win or lose on this result (e.g. an exact whole-number over/under push), the referenced player did not take part, or the prediction does not describe a settable market for this sport.
- Never VOID merely because the bet is losing.
- Player-related bets (scorer, assist, card, shots, fouls...): settle them against the match events list${hasIncidents ? "" : ", which is NOT available"}. ${hasIncidents
    ? "If the named player is not among the listed scorers/carded players, that bet LOST (they did not do it). If the events list does not plausibly cover what the bet needs, return UNKNOWN."
    : "Without the events list you cannot settle them — return UNKNOWN. Only match-level bets (handicaps, races, combined result markets) can be settled from the score alone."}
- Combine rules exactly as written ("A to score & team to win" needs BOTH legs).

Return ONLY a JSON object: {"result":"won"|"lost"|"void"|"unknown","reason":"max 12 words"}`;

  for (const model of AI_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://surebet.guru",
          "X-Title": "SureBet Guru",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
          temperature: 0,
          response_format: { type: "json_object" },
        }),
      });
      const data: OpenRouterResponse = await res.json();
      if (data.error) continue;
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;
      const obj = parseJsonObject(content);
      if (!obj) continue;
      const result = String(obj.result ?? "").toLowerCase();
      if (result === "won" || result === "lost" || result === "void") return result;
      if (result === "unknown") return "unresolved";
    } catch {
      continue;
    }
  }
  return "unresolved";
};

const toCouponLegs = (raw: any): CouponLeg[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m: any) => m && typeof m.homeTeam === "string" && typeof m.awayTeam === "string")
    .map((m: any) => ({
      homeTeam: String(m.homeTeam),
      awayTeam: String(m.awayTeam),
      kickoff: String(m.kickoff || ""),
      sport: String(m.sport || "Football"),
      prediction: String(m.prediction || ""),
      odds: Number(m.odds) || 0,
      league: String(m.league || ""),
    }));
};

// --- Poczekalnia: publikacja + JEDNO zbiorcze powiadomienie ------------------
// Tipy z queued=true są niewidoczne (is_published=false). Release ustawia
// is_published=true i wysyła POJEDYNCZY push do premium — zamiast pusha przy
// każdym dodaniu typu/kuponu.

interface ReleaseResult {
  released: number;
  push: { attempted: number; success: number; skipped?: string };
  coupons?: number;
  heroPicks?: number;
}

const sendNewTipsPush = async (
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<ReleaseResult["push"]> => {
  const serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    return { attempted: 0, success: 0, skipped: "Brak sekretu FCM_SERVICE_ACCOUNT" };
  }
  let serviceAccount: any;
  try {
    let cleanJson = serviceAccountJson.trim();
    if (cleanJson.startsWith("'") && cleanJson.endsWith("'")) {
      cleanJson = cleanJson.substring(1, cleanJson.length - 1);
    }
    serviceAccount = JSON.parse(cleanJson);
  } catch (e: any) {
    return { attempted: 0, success: 0, skipped: `Zły format FCM_SERVICE_ACCOUNT: ${e.message}` };
  }

  try {
    const db = createClient(supabaseUrl, serviceRoleKey);
    const nowIso = new Date().toISOString();
    const { data: premiumUsers } = await db
      .from("premium_access")
      .select("user_id")
      .gt("expires_at", nowIso);
    const userIds = premiumUsers?.map((u: any) => u.user_id).filter(Boolean) || [];
    if (!userIds.length) {
      return { attempted: 0, success: 0, skipped: "Brak aktywnych premium" };
    }

    const { data: pushTokens } = await db
      .from("push_tokens")
      .select("token")
      .eq("enabled", true)
      .in("user_id", userIds);
    const tokens = pushTokens?.map((t: any) => t.token).filter(Boolean) || [];
    if (!tokens.length) {
      return { attempted: 0, success: 0, skipped: "Brak włączonych powiadomień" };
    }

    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const accessToken = (await (await auth.getClient()).getAccessToken()).token;

    const title = "New tips just dropped! 🔥";
    const message = "Fresh tips are waiting for you in the app — check them now.";

    let success = 0;
    for (const token of tokens) {
      try {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({
              message: {
                token,
                notification: { title, body: message },
                data: { title, body: message, click_action: "FCM_PLUGIN_ACTIVITY" },
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                    click_action: "FCM_PLUGIN_ACTIVITY",
                    channel_id: "fcm_default_channel",
                  },
                },
                apns: { payload: { aps: { sound: "default", badge: 1 } } },
              },
            }),
          },
        );
        if (res.ok) success++;
      } catch {
        // pojedynczy token nie może wywrócić całej wysyłki
      }
    }
    return { attempted: tokens.length, success };
  } catch (e: any) {
    return { attempted: 0, success: 0, skipped: e?.message || "push failed" };
  }
};

const releaseWaitingRoom = async (
  db: any,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<ReleaseResult> => {
  // --- TIPS ---------------------------------------------------------------
  const { data: queuedRows, error: loadError } = await db
    .from("tips")
    .select("id")
    .eq("queued", true)
    .limit(200);
  if (loadError) throw new Error(`queued load: ${loadError.message}`);

  const queued = queuedRows || [];
  let releasedTips = 0;
  if (queued.length) {
    const { error: updateError } = await db
      .from("tips")
      .update({ queued: false, is_published: true })
      .eq("queued", true);
    if (updateError) throw new Error(`release update: ${updateError.message}`);
    releasedTips = queued.length;
  }

  // --- COUPONS ------------------------------------------------------------
  const { data: queuedCouponRows, error: couponLoadError } = await db
    .from("coupons")
    .select("id")
    .eq("queued", true)
    .limit(100);
  if (couponLoadError) throw new Error(`queued coupons load: ${couponLoadError.message}`);
  let releasedCoupons = 0;
  if (queuedCouponRows?.length) {
    const { error } = await db
      .from("coupons")
      .update({ queued: false })
      .eq("queued", true);
    if (error) throw new Error(`coupon release: ${error.message}`);
    releasedCoupons = queuedCouponRows.length;
  }

  // --- HERO PICKS ---------------------------------------------------------
  // Model "ostatni wiersz = aktywny hero": publikowany wiersz przestaje być
  // queued, wszystkie inne usuwamy (także dotychczasowy aktywny).
  const { data: queuedHeroRows, error: heroLoadError } = await db
    .from("featured_picks")
    .select("id")
    .eq("queued", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (heroLoadError) throw new Error(`queued hero load: ${heroLoadError.message}`);
  let releasedHero = 0;
  const newestHero = queuedHeroRows?.[0];
  if (newestHero?.id) {
    const { error: delError } = await db
      .from("featured_picks")
      .delete()
      .neq("id", newestHero.id);
    if (delError) {
      console.error(`[settle-results] hero cleanup: ${delError.message}`);
    }
    const { error } = await db
      .from("featured_picks")
      .update({ queued: false })
      .eq("id", newestHero.id);
    if (error) throw new Error(`hero release: ${error.message}`);
    releasedHero = 1;
  }

  const total = releasedTips + releasedCoupons + releasedHero;
  const push = total > 0
    ? await sendNewTipsPush(supabaseUrl, serviceRoleKey)
    : { attempted: 0, success: 0, skipped: "Kolejka pusta" };
  return { released: total, coupons: releasedCoupons, heroPicks: releasedHero, push };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();

    // --- autoryzacja: service role (cron vault), klucz cron albo konto admina
    const cronKey = Deno.env.get("SETTLE_CRON_KEY") ?? "";
    const isCronKey = !!cronKey && req.headers.get("x-settle-key") === cronKey;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const isServiceRole = !!serviceRoleKey && token === serviceRoleKey;

    if (!isServiceRole && !isCronKey) {
      if (!token) {
        return new Response(JSON.stringify({ error: "Brak nagłówka Authorization." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Sesja wygasła. Zaloguj się ponownie." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (adminEmail && user.email?.toLowerCase() !== adminEmail) {
        return new Response(JSON.stringify({ error: `Brak uprawnień admina. Zalogowany jako: ${user.email}` }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const date: string = /^\d{4}-\d{2}-\d{2}$/.test(body?.date || "")
      ? body.date
      : yesterdayInWarsaw();

    const db = createClient(supabaseUrl, serviceRoleKey);
    const events = new EventCache();
    const incidentsCache = new IncidentsCache();
    const unresolved: { kind: string; id: number | string; teams: string; reason: string }[] = [];
    let heroUnresolvedReason: string | undefined;

    // Ręczny release z panelu admina: tylko poczekalnia + push, bez settle.
    if (body?.action === "release") {
      const result = await releaseWaitingRoom(db, supabaseUrl, serviceRoleKey);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    // Cron może poprosić o release razem z settle (body.release = true).
    const releaseRequested = body?.release === true;

    // ---------------- FAZA 1: dopasowanie + deterministyczne decyzje ---------

    const evaluateLeg = async (
      leg: TipLike,
      prediction: string,
    ): Promise<LegEval> => {
      if (!leg.homeTeam || !leg.awayTeam) {
        return { status: "unresolved", finalScore: null, reason: "brak nazw drużyn" };
      }
      const kickoffDate = new Date(leg.kickoff);
      if (isNaN(kickoffDate.getTime())) {
        return { status: "unresolved", finalScore: null, reason: "brak czytalnego terminu meczu" };
      }

      const eventsList = await events.for(leg.sport, dateInWarsaw(kickoffDate));
      if (!eventsList) {
        return { status: "unresolved", finalScore: null, reason: `brak terminarza dla ${leg.sport}` };
      }

      const match = matchEventForTip(leg, eventsList);
      if (!match) {
        return { status: "unresolved", finalScore: null, reason: "nie dopasowano meczu do terminarza" };
      }

      const res = settleTipAgainstEvent(leg, prediction, match);
      if (res.status !== "unresolved") {
        return { status: res.status, finalScore: res.finalScore };
      }

      // AI fallback tylko dla meczów, które naprawdę się skończyły i mają wynik.
      if (match.event.status === "settled" && res.finalScore) {
        // Zdarzenia meczu (strzelcy/kartki) — best-effort; null gdy SofaScore
        // nieosiągalny, wtedy typy playerskie zostaną unresolved.
        const sportSlug = ODDS_API_SPORTS[leg.sport];
        const incidents = sportSlug
          ? await incidentsCache.for(sportSlug, dateInWarsaw(kickoffDate), match.event.home, match.event.away)
          : null;
        return {
          status: "unresolved",
          finalScore: res.finalScore,
          aiCtx: {
            sport: leg.sport,
            league: match.event.league,
            prediction,
            homeTeam: match.event.home,
            awayTeam: match.event.away,
            score: res.finalScore,
            incidents,
          },
        };
      }
      return {
        status: "unresolved",
        finalScore: res.finalScore,
        reason: `mecz bez finalnego wyniku (status: ${match.event.status || "?"})`,
      };
    };

    const { data: tipRows } = await db
      .from("tips")
      .select("*")
      .eq("is_published", true)
      .eq("status", "upcoming")
      .limit(300);

    const dayTips = (tipRows || []).filter((t: any) => {
      const k = new Date(t.kickoff || "").getTime();
      return !isNaN(k) && dateInWarsaw(new Date(k)) === date;
    });

    // Zapasy: starsze tipy (kickoff < target dnia) wciaz "upcoming" — rozstrzyga
    // ten sam run, nic nie zostaje wisiec w bazie przed purgem.
    const { data: staleRows } = await db
      .from("tips")
      .select("*")
      .eq("is_published", true)
      .eq("status", "upcoming")
      .lt("kickoff", `${date}T00:00:00`)
      .neq("kickoff", "")
      .limit(200);
    const staleTips = (staleRows || []).filter((t: any) => {
      const k = new Date(t.kickoff || "").getTime();
      return !isNaN(k) && dateInWarsaw(new Date(k)) < date;
    });
    const seenTipIds = new Set(dayTips.map((t: any) => t.id));
    const allTips = [...dayTips, ...staleTips.filter((t: any) => !seenTipIds.has(t.id))];

    interface TipJob {
      tip: any;
      eval: LegEval;
      aiKey?: string;
    }
    const tipJobs: TipJob[] = [];
    const aiDecisions = new Map<string, SettleOutcome>();
    let aiSeq = 0;

    for (const tip of allTips) {
      const leg: TipLike = {
        homeTeam: String(tip.home_team || ""),
        awayTeam: String(tip.away_team || ""),
        kickoff: String(tip.kickoff || ""),
        sport: String(tip.sport || "Football"),
      };
      const evaluation = await evaluateLeg(leg, String(tip.prediction || ""));
      tipJobs.push({ tip, eval: evaluation });
    }

    interface CouponJob {
      coupon: any;
      legs: CouponLeg[];
      evals: LegEval[];
      aiKeys: (string | undefined)[];
      usedAi: boolean;
    }
    const couponJobs: CouponJob[] = [];

    // ---------------- HERO (aktywny, queued=false) ---------------------------
    // Rozstrzygany jak tip: odds-api + AI fallback, archiwum match_results
    // (source_type 'hero'). Tylko gdy jego kickoff wypada w rozstrzyganym dniu.
    interface HeroJob {
      hero: any;
      eval: LegEval;
      aiKey?: string;
    }
    let heroJob: HeroJob | null = null;

    const { data: heroRows } = await db
      .from("featured_picks")
      .select("*")
      .eq("queued", false)
      .order("created_at", { ascending: false })
      .limit(1);
    const activeHero = heroRows?.[0];
    if (activeHero && activeHero.status === "upcoming") {
      const hk = new Date(activeHero.kickoff || "");
      if (!isNaN(hk.getTime()) && dateInWarsaw(hk) === date) {
        const heroLeg: TipLike = {
          homeTeam: String(activeHero.home_team || ""),
          awayTeam: String(activeHero.away_team || ""),
          kickoff: String(activeHero.kickoff || ""),
          sport: String(activeHero.sport || "Football"),
        };
        const heroEval = await evaluateLeg(heroLeg, String(activeHero.prediction || ""));
        heroJob = { hero: activeHero, eval: heroEval };
      }
    }

    const { data: couponRows } = await db
      .from("coupons")
      .select("*")
      .in("status", ["active", "pending"])
      .limit(100);

    for (const coupon of couponRows || []) {
      const legs = toCouponLegs(coupon.matches);
      if (!legs.length) continue;
      // Kupon rozstrzygamy dopiero, gdy wszystkie jego mecze się rozpoczęły
      // i przynajmniej jeden należy do rozstrzyganego okna.
      const allStarted = legs.every((m) => {
        const k = new Date(m.kickoff).getTime();
        return !isNaN(k) && k < Date.now();
      });
      const inWindow = legs.some((m) => dateInWarsaw(new Date(m.kickoff)) === date);
      if (!allStarted || !inWindow) continue;

      const evals: LegEval[] = [];
      const aiKeys: (string | undefined)[] = [];
      for (const leg of legs) {
        const evaluation = await evaluateLeg(leg, leg.prediction);
        evals.push(evaluation);
        aiKeys.push(undefined);
      }
      couponJobs.push({ coupon, legs, evals, aiKeys, usedAi: false });
    }

    // ---------------- FAZA 2: kolejka AI (limit budżetu i równoległości) ----

    // Zlecenia AI trafiają do kolejki; realne wywołania startują w drain()
    // z równoległością 4 (konwencja z ai-analyze), dzięki czemu pętla wyżej
    // nigdy na nie nie czeka — brak deadlocka, a OpenRouter nie jest zalewany.
    const aiQueue: (() => Promise<void>)[] = [];

    const enqueueAi = (evaluation: LegEval): string | undefined => {
      if (!evaluation.aiCtx) return undefined;
      if (aiDecisions.size >= AI_BUDGET) return undefined;
      const key = `ai-${++aiSeq}`;
      aiDecisions.set(key, "unresolved"); // placeholder do skutku
      aiQueue.push(async () => {
        const decided = await aiSettle(evaluation.aiCtx!);
        aiDecisions.set(key, decided);
      });
      return key;
    };

    for (const job of tipJobs) {
      job.aiKey = enqueueAi(job.eval);
    }
    if (heroJob) {
      heroJob.aiKey = enqueueAi(heroJob.eval);
    }
    for (const job of couponJobs) {
      job.evals.forEach((evaluation, i) => {
        job.aiKeys[i] = enqueueAi(evaluation);
      });
    }

    let aiCursor = 0;
    let aiCalls = 0;
    const aiWorkers = Array.from(
      { length: Math.min(4, aiQueue.length) },
      async () => {
        while (aiCursor < aiQueue.length) {
          const task = aiQueue[aiCursor++];
          aiCalls++;
          try {
            await task();
          } catch {
            // zostaje "unresolved" — noga trafi do raportu dla admina
          }
        }
      },
    );
    await Promise.all(aiWorkers);

    // ---------------- FAZA 3: zapis wyników ---------------------------------

    const nowIso = new Date().toISOString();
    const tipStats = { settled: 0, won: 0, lost: 0, void: 0 };

    for (const job of tipJobs) {
      const teams = `${job.tip.home_team} vs ${job.tip.away_team}`;
      let evaluation = job.eval;
      if (job.aiKey) {
        const decided = aiDecisions.get(job.aiKey);
        if (decided && decided !== "unresolved") {
          evaluation = { status: decided, finalScore: evaluation.finalScore };
        }
      }

      if (evaluation.status === "unresolved") {
        unresolved.push({
          kind: "tip", id: job.tip.id, teams,
          reason: evaluation.reason
            || (job.aiKey ? "AI nie rozstrzygnęło (nietypowy rynek)" : "nieznany powód"),
        });
        continue;
      }

      const status = evaluation.status as SettledStatus;
      const wonAt = status === "won" ? nowIso : job.tip.won_at || null;
      const { error } = await db
        .from("tips")
        .update({ status, won_at: wonAt })
        .eq("id", job.tip.id);
      if (error) {
        console.error(`[settle-results] tips update ${job.tip.id}:`, error.message);
        unresolved.push({ kind: "tip", id: job.tip.id, teams, reason: `błąd zapisu: ${error.message}` });
        continue;
      }

      tipStats.settled++;
      tipStats[status]++;

      const { error: archError } = await db.from("match_results").upsert({
        source_type: "tip",
        source_id: job.tip.id,
        result_status: status,
        final_score: evaluation.finalScore,
        settled_at: nowIso,
        settled_method: job.aiKey ? "ai" : "auto",
        payload: {
          sport: job.tip.sport,
          league: job.tip.league,
          homeTeam: job.tip.home_team,
          awayTeam: job.tip.away_team,
          prediction: job.tip.prediction,
          odds: Number(job.tip.odds) || 0,
          kickoff: job.tip.kickoff,
          description: job.tip.description ?? null,
          homeTeamLogo: job.tip.home_team_logo ?? null,
          awayTeamLogo: job.tip.away_team_logo ?? null,
          isPremium: !!job.tip.is_premium,
        },
      }, { onConflict: "source_type,source_id" });
      if (archError) {
        console.error(`[settle-results] archive tip ${job.tip.id}:`, archError.message);
      }
    }

    const couponStats = { settled: 0, won: 0, lost: 0, void: 0 };

    // ---------------- HERO: zapis -------------------------------------------
    let heroSettled: { status: SettledStatus; finalScore: string | null } | null = null;
    if (heroJob) {
      let evaluation = heroJob.eval;
      if (heroJob.aiKey) {
        const decided = aiDecisions.get(heroJob.aiKey);
        if (decided && decided !== "unresolved") {
          evaluation = { status: decided, finalScore: evaluation.finalScore };
        }
      }

      if (evaluation.status === "unresolved") {
        // Hero zostaje upcoming — admin widzi powód w odpowiedzi funkcji.
        heroUnresolvedReason = evaluation.reason || (heroJob.aiKey ? "AI nie rozstrzygnęło" : "nieznany powód");
      } else {
        const status = evaluation.status as SettledStatus;
        // status kolumny featured_picks to tekst — 'void' mapujemy na 'draw'
        // (HeroSection/TodayHotTip znają upcoming/won/lost/draw).
        const heroStatus = status === "void" ? "draw" : status;
        const { error: heroErr } = await db
          .from("featured_picks")
          .update({ status: heroStatus, won_at: status === "won" ? nowIso : null })
          .eq("id", heroJob.hero.id);
        if (heroErr) {
          console.error(`[settle-results] hero update ${heroJob.hero.id}:`, heroErr.message);
          heroUnresolvedReason = `błąd zapisu: ${heroErr.message}`;
        } else {
          heroSettled = { status, finalScore: evaluation.finalScore };
          const { error: archError } = await db.from("match_results").upsert({
            source_type: "hero",
            source_id: heroJob.hero.id,
            result_status: status,
            final_score: evaluation.finalScore,
            settled_at: nowIso,
            settled_method: heroJob.aiKey ? "ai" : "auto",
            payload: {
              sport: heroJob.hero.sport,
              league: heroJob.hero.league,
              homeTeam: heroJob.hero.home_team,
              awayTeam: heroJob.hero.away_team,
              prediction: heroJob.hero.prediction,
              odds: Number(heroJob.hero.odds) || 0,
              kickoff: heroJob.hero.kickoff,
              description: heroJob.hero.description ?? null,
              homeTeamLogo: heroJob.hero.home_team_logo ?? null,
              awayTeamLogo: heroJob.hero.away_team_logo ?? null,
              confidence: heroJob.hero.confidence ?? null,
              isPremium: false,
            },
          }, { onConflict: "source_type,source_id" });
          if (archError) {
            console.error(`[settle-results] archive hero ${heroJob.hero.id}:`, archError.message);
          }
        }
      }
    }

    for (const job of couponJobs) {
      const statuses: (SettledStatus | null)[] = job.evals.map((evaluation, i) => {
        const key = job.aiKeys[i];
        if (key) {
          const decided = aiDecisions.get(key);
          if (decided && decided !== "unresolved") return decided;
          return null;
        }
        return evaluation.status === "unresolved" ? null : (evaluation.status as SettledStatus);
      });

      const aggregated = aggregateCoupon(statuses);
      if (!aggregated) {
        job.evals.forEach((evaluation, i) => {
          if (statuses[i] === null) {
            const leg = job.legs[i];
            unresolved.push({
              kind: "coupon", id: `${job.coupon.id}:${leg.homeTeam}`,
              teams: `${leg.homeTeam} vs ${leg.awayTeam}`,
              reason: evaluation.reason || (job.aiKeys[i] ? "AI nie rozstrzygnęło (nietypowy rynek)" : "nieznany powód"),
            });
          }
        });
        continue;
      }

      const usedAi = job.aiKeys.some(Boolean);
      const { error } = await db
        .from("coupons")
        .update({
          status: aggregated,
          won_at: aggregated === "won" ? nowIso : job.coupon.won_at || null,
        })
        .eq("id", job.coupon.id);
      if (error) {
        console.error(`[settle-results] coupons update ${job.coupon.id}:`, error.message);
        continue;
      }

      couponStats.settled++;
      couponStats[aggregated]++;

      // Status per-noga (won/lost/void) + wynik FT każdej nogi — CouponCard
      // pokazuje go przy każdym typie w kuponie.
      const legOutcomes: Record<string, { status: SettledStatus; finalScore: string | null }> = {};
      job.evals.forEach((evaluation, i) => {
        let st: SettledStatus | null = statuses[i];
        if (!st && job.aiKeys[i]) {
          const decided = aiDecisions.get(job.aiKeys[i]!);
          if (decided && decided !== "unresolved") st = decided;
        }
        if (st) {
          legOutcomes[String(i)] = {
            status: st,
            finalScore: job.evals[i]?.finalScore ?? null,
          };
        }
      });

      const { error: archError } = await db.from("match_results").upsert({
        source_type: "coupon",
        source_id: job.coupon.id,
        result_status: aggregated,
        final_score: null,
        settled_at: nowIso,
        settled_method: usedAi ? "ai" : "auto",
        payload: {
          name: job.coupon.name,
          matches: job.legs.map((m, i) => ({
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            prediction: m.prediction,
            odds: m.odds,
            league: m.league,
            sport: m.sport,
            kickoff: m.kickoff,
            // Status + wynik nogi (null gdy noga nierozstrzygnięta)
            legStatus: legOutcomes[String(i)]?.status ?? null,
            finalScore: legOutcomes[String(i)]?.finalScore ?? null,
          })),
          totalOdds: Number(job.coupon.total_odds) || 0,
          stake: job.coupon.stake ?? null,
          isPremium: !!job.coupon.is_premium,
          createdAt: job.coupon.created_at || null,
        },
      }, { onConflict: "source_type,source_id" });
      if (archError) {
        console.error(`[settle-results] archive coupon ${job.coupon.id}:`, archError.message);
      }
    }

    // ---------------- FAZA 3b: backfill archiwum -----------------------------
    // Tipy oznaczone RECZNIE (won/lost/void/draw) nie przechodza przez settle,
    // wiec bez tego nigdy nie trafilyby do zakladki Yesterday's Results.
    // purge_old_tips usuwa tylko zarchiwizowane wiersze — to gwarantuje, ze
    // wszystko rozstrzygniete ma swoj snapshot w archiwum.
    try {
      const weekAgoIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: settledRows } = await db
        .from("tips")
        .select("*")
        .eq("is_published", true)
        .in("status", ["won", "lost", "void", "draw"])
        .gte("kickoff", weekAgoIso)
        .limit(300);
      const { data: archivedRows } = await db
        .from("match_results")
        .select("source_id")
        .eq("source_type", "tip")
        .limit(5000);
      const archivedIds = new Set((archivedRows || []).map((r: any) => Number(r.source_id)));
      let backfilled = 0;
      for (const tip of settledRows || []) {
        if (archivedIds.has(Number(tip.id))) continue;
        const resultStatus = tip.status === "won" || tip.status === "lost"
          ? tip.status
          : "void"; // legacy 'draw' = nierostrzygniety
        const { error: archError } = await db.from("match_results").upsert({
          source_type: "tip",
          source_id: tip.id,
          result_status: resultStatus,
          final_score: null,
          settled_at: tip.won_at || nowIso,
          settled_method: "manual",
          payload: {
            sport: tip.sport,
            league: tip.league,
            homeTeam: tip.home_team,
            awayTeam: tip.away_team,
            prediction: tip.prediction,
            odds: Number(tip.odds) || 0,
            kickoff: tip.kickoff,
            description: tip.description ?? null,
            homeTeamLogo: tip.home_team_logo ?? null,
            awayTeamLogo: tip.away_team_logo ?? null,
            isPremium: !!tip.is_premium,
          },
        }, { onConflict: "source_type,source_id" });
        if (archError) {
          console.error(`[settle-results] backfill tip ${tip.id}:`, archError.message);
        } else {
          backfilled++;
        }
      }
      if (backfilled) console.log(`[settle-results] backfilled ${backfilled} manually settled tips`);
    } catch (e) {
      console.error("[settle-results] backfill failed:", e?.message || e);
    }

    // ---------------- FAZA 3c: web AI fallback dla nierozstrzygniętych ------
    // Gdy odds-api nie zna ligi/drużyny (mało znane ligi, youth, esports),
    // AI z dostępem do sieci (OpenRouter :online) szuka finalnego wyniku.
    // Werdykt liczymy deterministycznie z pełnym wyniku (settleMarket),
    // AI służy tylko do ZNALEZIENIA wyniku — bez zgadywania typów.
    let webCalls = 0;
    try {
      const cutoff = Date.now() - 2 * 3600 * 1000; // mecz musiał się skończyć
      const WEB_BUDGET = 10;

      interface WebJob {
        key: string;
        ctx: { homeTeam: string; awayTeam: string; kickoff: string; sport: string; league: string; prediction: string };
        // AI z web searchem rozstrzyga KONKRETNY zakład (nie tylko wynik meczu):
        // gole zawodników, kartki, BTTS, handicapy itd.
        apply: (verdict: SettleOutcome, score: string | null) => Promise<void>;
      }
      const webJobs: WebJob[] = [];

      const addWebJob = (key: string, ctx: WebJob["ctx"], apply: WebJob["apply"]) => {
        if (webJobs.length < WEB_BUDGET) webJobs.push({ key, ctx, apply });
      };

      // Tip leftovers
      for (const job of tipJobs) {
        if (job.eval.status !== "unresolved") continue;
        const ko = new Date(job.tip.kickoff || "").getTime();
        if (isNaN(ko) || ko > cutoff) continue;
        addWebJob(`web-tip-${job.tip.id}`, {
          homeTeam: job.tip.home_team, awayTeam: job.tip.away_team,
          kickoff: job.tip.kickoff, sport: job.tip.sport || "Football",
          league: job.tip.league || "", prediction: job.tip.prediction || "",
        }, async (verdict, fs) => {
          if (verdict !== "won" && verdict !== "lost" && verdict !== "void") return;
          const status = verdict as SettledStatus;
          await db.from("tips").update({ status, won_at: status === "won" ? nowIso : job.tip.won_at || null }).eq("id", job.tip.id);
          await db.from("match_results").upsert({
            source_type: "tip", source_id: job.tip.id, result_status: status,
            final_score: fs, settled_at: nowIso, settled_method: "ai",
            payload: { sport: job.tip.sport, league: job.tip.league, homeTeam: job.tip.home_team, awayTeam: job.tip.away_team, prediction: job.tip.prediction, odds: Number(job.tip.odds) || 0, kickoff: job.tip.kickoff, description: job.tip.description ?? null, homeTeamLogo: job.tip.home_team_logo ?? null, awayTeamLogo: job.tip.away_team_logo ?? null, isPremium: !!job.tip.is_premium },
          }, { onConflict: "source_type,source_id" });
          tipStats.settled++;
          tipStats[status]++;
          for (let i = unresolved.length - 1; i >= 0; i--) {
            if (unresolved[i].kind === "tip" && unresolved[i].id === job.tip.id) unresolved.splice(i, 1);
          }
        });
      }

      // Hero leftover
      if (heroJob && heroJob.eval.status === "unresolved") {
        const ko = new Date(heroJob.hero.kickoff || "").getTime();
        if (!isNaN(ko) && ko <= cutoff) {
          addWebJob("web-hero", {
            homeTeam: heroJob.hero.home_team, awayTeam: heroJob.hero.away_team,
            kickoff: heroJob.hero.kickoff, sport: heroJob.hero.sport || "Football",
            league: heroJob.hero.league || "", prediction: heroJob.hero.prediction || "",
          }, async (verdict, fs) => {
            if (verdict !== "won" && verdict !== "lost" && verdict !== "void") return;
            const status = verdict as SettledStatus;
            await db.from("featured_picks").update({ status: status === "void" ? "draw" : status, won_at: status === "won" ? nowIso : null }).eq("id", heroJob!.hero.id);
            await db.from("match_results").upsert({
              source_type: "hero", source_id: heroJob!.hero.id, result_status: status,
              final_score: fs, settled_at: nowIso, settled_method: "ai",
              payload: { sport: heroJob!.hero.sport, league: heroJob!.hero.league, homeTeam: heroJob!.hero.home_team, awayTeam: heroJob!.hero.away_team, prediction: heroJob!.hero.prediction, odds: Number(heroJob!.hero.odds) || 0, kickoff: heroJob!.hero.kickoff, description: heroJob!.hero.description ?? null, homeTeamLogo: heroJob!.hero.home_team_logo ?? null, awayTeamLogo: heroJob!.hero.away_team_logo ?? null, confidence: heroJob!.hero.confidence ?? null, isPremium: false },
            }, { onConflict: "source_type,source_id" });
          });
        }
      }

      // Coupon leg leftovers — AI rozstrzyga każdą pending nogę osobno
      for (const job of couponJobs) {
        if (aggregateCoupon(job.evals.map((ev) => (ev.status === "unresolved" ? null : (ev.status as SettledStatus))))) continue; // już rozstrzygnięty
        job.evals.forEach((ev, i) => {
          if (ev.status !== "unresolved") return;
          const leg = job.legs[i];
          const ko = new Date(leg.kickoff).getTime();
          if (isNaN(ko) || ko > cutoff) return;
          if (webJobs.length >= WEB_BUDGET) return;
          addWebJob(`web-coupon-${job.coupon.id}-${i}`, {
            homeTeam: leg.homeTeam, awayTeam: leg.awayTeam,
            kickoff: leg.kickoff, sport: leg.sport || "Football",
            league: leg.league || "", prediction: leg.prediction || "",
          }, async (verdict, fs) => {
            if (verdict !== "won" && verdict !== "lost" && verdict !== "void") return;
            job.evals[i] = { status: verdict, finalScore: fs };
            const statuses: (SettledStatus | null)[] = job.evals.map((ev) => (ev.status === "unresolved" ? null : (ev.status as SettledStatus)));
            const aggregated = aggregateCoupon(statuses);
            if (aggregated) {
              const usedAi = job.aiKeys.some(Boolean);
              await db.from("coupons").update({ status: aggregated, won_at: aggregated === "won" ? nowIso : job.coupon.won_at || null }).eq("id", job.coupon.id);
              couponStats.settled++;
              couponStats[aggregated]++;
              await db.from("match_results").upsert({
                source_type: "coupon", source_id: job.coupon.id, result_status: aggregated, final_score: null,
                settled_at: nowIso, settled_method: usedAi ? "ai" : "auto",
                payload: { name: job.coupon.name, matches: job.legs.map((m, j) => ({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, prediction: m.prediction, odds: m.odds, league: m.league, sport: m.sport, kickoff: m.kickoff, legStatus: statuses[j], finalScore: job.evals[j]?.finalScore ?? null })), totalOdds: Number(job.coupon.total_odds) || 0, stake: job.coupon.stake ?? null, isPremium: !!job.coupon.is_premium, createdAt: job.coupon.created_at || null },
              }, { onConflict: "source_type,source_id" });
              for (let u = unresolved.length - 1; u >= 0; u--) {
                if (unresolved[u].kind === "coupon" && String(unresolved[u].id).startsWith(`${job.coupon.id}:`)) unresolved.splice(u, 1);
              }
            }
          });
        });
      }

      // Wykonanie web lookups (równolegle, budżet)
      if (webJobs.length) {
        const WEB_MODELS = ["openai/gpt-4o-mini:online", "openai/gpt-4.1-mini:online"];
        // AI z web searchem rozstrzyga KONKRETNY zakład — wyszukuje to, co
        // potrzebne: finalny wynik, strzelców, kartki, statystyki zawodników.
        const webLookup = async (ctx: WebJob["ctx"]): Promise<{ verdict: SettleOutcome; score: string | null } | null> => {
          if (!OPENROUTER_API_KEY) return null;
          const prompt = `You are a betting settlement engine with web search. Settle this specific bet:

Bet: "${ctx.prediction}"
Match: ${ctx.homeTeam} vs ${ctx.awayTeam} (${ctx.sport}${ctx.league ? `, ${ctx.league}` : ""})
Kickoff date: ${ctx.kickoff.slice(0, 10)}

Search the web for the official match data — final score, goalscorers, cards, player stats, whatever this specific bet requires (e.g. player goals need the scorer list, card bets need booking stats, half-time bets need HT score).

Rules:
- WON if the bet clearly succeeded based on real match data.
- LOST if it clearly failed.
- VOID only if the stake would be returned (match cancelled/postponed, or the bet cannot be evaluated at all).
- If you cannot find RELIABLE evidence for this specific bet, respond {"verdict":null} — do NOT guess.

Respond ONLY with JSON: {"verdict":"won"|"lost"|"void"|null, "score":"H:A"|null, "evidence":"max 15 words citing what you found"}.`;

          for (const model of WEB_MODELS) {
            try {
              const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://surebet.guru", "X-Title": "SureBet Guru" },
                body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0, plugins: [{ id: "web" }] }),
              });
              const data: OpenRouterResponse = await res.json();
              if (data.error) continue;
              const content = data.choices?.[0]?.message?.content?.trim();
              if (!content) continue;
              const obj = parseJsonObject(content);
              if (!obj) continue;
              const verdictRaw = String(obj.verdict ?? "").toLowerCase();
              const score = obj.score ? String(obj.score) : null;
              if (verdictRaw === "won" || verdictRaw === "lost" || verdictRaw === "void") {
                return { verdict: verdictRaw as SettleOutcome, score };
              }
              if (verdictRaw === "unknown" || verdictRaw === "null") return null;
            } catch { continue; }
          }
          return null;
        };

        const webCursor = { i: 0 };
        const webWorkers = Array.from({ length: Math.min(4, webJobs.length) }, async () => {
          while (webCursor.i < webJobs.length) {
            const job = webJobs[webCursor.i++];
            webCalls++;
            try {
              const out = await webLookup(job.ctx);
              if (out && out.verdict !== "unresolved") await job.apply(out.verdict, out.score);
            } catch (e: any) {
              console.error(`[settle-results] web ${job.key}:`, e?.message || e);
            }
          }
        });
        await Promise.all(webWorkers);
      }
    } catch (e: any) {
      console.error("[settle-results] web fallback failed:", e?.message || e);
    }

    // ---------------- FAZA 4: poczekalnia (cron o 3:00) ---------------------

    let release: ReleaseResult | null = null;
    if (releaseRequested) {
      try {
        release = await releaseWaitingRoom(db, supabaseUrl, serviceRoleKey);
      } catch (e: any) {
        console.error("[settle-results] release failed:", e?.message || e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      date,
      tips: { total: allTips.length, ...tipStats, unresolved },
      coupons: couponStats,
      hero: heroSettled ? { status: heroSettled.status, finalScore: heroSettled.finalScore } : (heroUnresolvedReason ? { unresolved: heroUnresolvedReason } : null),
      aiCalls,
      webCalls,
      released: release?.released ?? null,
      push: release?.push ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[settle-results]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
