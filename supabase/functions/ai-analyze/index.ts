// Supabase Edge Function: ai-analyze
// Writes the English tip copy for matches picked from the import sources
// (zawodtyper.pl, pewniaczki.pl, SportyTrader).
//
// This runs ON DEMAND ONLY — after the admin has selected which matches to keep,
// never during scraping, so no tokens are spent on the hundreds of tips fetched
// per day that are never imported.
//
// One advanced prompt answers the SPECIFIC tip and always consumes the analysis
// already attached to it when one exists:
//   prediction — the pick as a short English betting-market label (keeps the line)
//   league     — inferred from the teams when the source has no league field
//   analysis   — the published English copy, focused on that market
//   homeTeam / awayTeam — canonical English names for correct logo lookups
//
// With a source note the model FAITHFULLY translates it with a light copy-edit
// — it only strips bookmaker/promo filler and fixes spelling, adding nothing
// (mode "rewrite"). Without one — sources that publish only a pick — it writes
// the analysis from the market (+ web search) and is barred from inventing
// concrete facts (mode "generate").
//
// Input:  { mode?: "rewrite" | "generate",
//           matches: [{ homeTeam, awayTeam, sport, league, predictionRaw, odds, kickoff, analysisRaw }] }
// Output: { analyses: [{ prediction, league, analysis, homeTeam, awayTeam, ok }] }   (same order as input)
//
// Deploy: supabase functions deploy ai-analyze --no-verify-jwt
// Requires the OPENROUTER_API_KEY secret (already set for ai-rewrite).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";

// Ordered best-first; the first model that returns usable JSON wins.
//
// PRIMARY: DeepSeek V4.1 Flash — #1 model on OpenRouter by usage (Oct 2026),
// excellent Polish->English, cheap and fast.
// Fallbacks (only used when DeepSeek is down/rate-limited):
//   gemini-3-flash-preview — sharpest writing of the cheap tier.
//   glm-5.3-flash          — cheap backup with a 1M-token context.
// Pricing per 1M tokens (in/out), from the OpenRouter models API: DeepSeek
// 0.30/1.20 · Gemini 3 Flash 0.50/3.00 · GLM 5.3 Flash 0.15/0.50.
const MODELS = [
  "deepseek/deepseek-v4.1-flash",
  "google/gemini-3-flash-preview",
  "z-ai/glm-5.3-flash",
];

// Web grounding + reasoning are ON by default (the admin may switch them off to
// save cost). DeepSeek has no native search, so OpenRouter routes the web
// plugin through Exa: ~$0.007 per request plus the tokens of the injected
// result excerpts, and reasoning adds completion tokens. Budget roughly
// $0.008–0.012 per grounded analysis versus ~$0.0008 without.
const WEB_MAX_RESULTS = 5; // 5 results ≈ 2–4k extra prompt tokens (Exa highlights)
const REASONING_EFFORT = "medium"; // low | medium | high

// How many matches are analysed in parallel. Keeps a full 25-match batch
// comfortably inside the edge function's wall-clock limit without hammering
// OpenRouter hard enough to get rate limited.
const CONCURRENCY = 4;

interface MatchInput {
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  league?: string;
  predictionRaw?: string;
  odds?: number;
  kickoff?: string;
  analysisRaw?: string;
}

// "rewrite" (default): a tipster note exists and must be tidied up + translated.
// "generate": the source publishes only a short pick (e.g. pewniaczki.pl), so
// the analysis has to be written from the pick, the teams and the market.
type AnalyzeMode = "rewrite" | "generate";

interface AnalysisOutput {
  prediction: string;
  league: string;
  analysis: string;
  // Canonical English team names (English Wikipedia style), so the app displays
  // and logo-searches the same spelling the logo sources recognise. Absent or
  // empty = keep the raw Polish source name.
  homeTeam?: string;
  awayTeam?: string;
  // false when the model was unreachable and the caller is looking at the
  // untouched Polish source instead of a written analysis. The admin panel
  // flags these so raw source text cannot be published by accident.
  ok: boolean;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message: string };
}

// Models like to wrap JSON in prose or ``` fences — dig the object back out.
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

// Returned only when the model could not be reached. The text stays Polish and
// unedited on purpose — it is a placeholder for the admin to look at, never
// something to publish, which is what ok:false signals.
const fallbackAnalysis = (m: MatchInput): AnalysisOutput => {
  const text = String(m.analysisRaw || "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    prediction: String(m.predictionRaw || "").trim(),
    league: "",
    analysis: text.length > 700 ? `${text.slice(0, 697).trimEnd()}...` : text,
    homeTeam: "",
    awayTeam: "",
    ok: false,
  };
};

// Long notes run to several thousand characters; cap the input so one rambling
// post cannot dominate the batch's cost or latency.
const MAX_NOTE_CHARS = 4000;

// ---------------------------------------------------------------------------
// One advanced prompt for every source.
//
// It always answers the SPECIFIC tip (the exact market + line), and it always
// uses the analysis already attached to the tip when there is one:
//   • hasNote  -> the tipster's note is the single source of facts; the model
//                 translates + tidies it and keeps every concrete detail.
//   • !hasNote -> sources like pewniaczki.pl ship only a pick, so the model
//                 WRITES the analysis from the market — forbidden from inventing
//                 specific facts.
// The market-focus paragraph ("what must happen for the pick to land") is the
// same in both cases, so the copy always reads as being about that tip.
// ---------------------------------------------------------------------------
const buildPrompt = (m: MatchInput, hasNote: boolean, grounded: boolean): string => {
  const fixture = m.awayTeam ? `${m.homeTeam} vs ${m.awayTeam}` : String(m.homeTeam || "");
  const note = String(m.analysisRaw || "");
  const trimmedNote = note.length > MAX_NOTE_CHARS
    ? `${note.slice(0, MAX_NOTE_CHARS)}…`
    : note;

  // A source note means "translate the tipster's own text faithfully, with a
  // light copy-edit" — NOT a rewrite. Only bookmaker/promo filler and remarks
  // about the tipster himself are stripped; nothing else is added or reworded.
  const sourceBlock = hasNote
    ? `## The analysis already attached to this tip (Polish)
"""
${trimmedNote}
"""
The published "analysis" must be based ALMOST ENTIRELY on this text. Treat it as a faithful translation with a light copy-edit, not a rewrite:
- Keep the tipster's own reasoning, sentences and order. Do not restructure, summarise, expand or re-argue the pick in your own words.
- Keep their first-person voice ("I expect", "I'm backing", "for me") and every fact they state (players, injuries, results, form, table position).
- Fix spelling, grammar, punctuation and obviously misspelled names. That is the only editing you do.
- Remove ONLY: bookmaker / promo / bonus / bet-slip wording, and filler about the tipster himself or other days (e.g. "wczoraj słabe typy", "dodaję to do swojej ligi typerów", "mój główny typ na jutro", "gram to na pewniaka").
- Add NOTHING of your own: no new stats, no new players, no outside facts, no extra reasoning.`
    : `## Source note
None — this source publishes only the short pick above. ${grounded ? "Write the analysis from the market, grounded in the web search results above (recent form, injuries, line-ups, table context). Do not invent facts that neither the search results nor the market give you." : "You must WRITE the analysis yourself from the market. Do not state specific results, recent form, injuries, suspensions, standings or head-to-head facts, because you have none."}`;

  const researchBlock = !grounded
    ? ""
    : hasNote
      ? `## Web search
Results may be attached. Use them ONLY to confirm the correct spelling of team, player and competition names (and to disambiguate who is who). Do NOT take any facts from them — the published analysis stays a faithful translation of the note above.

`
      : `## Live research (web search is ON)
Before writing, use the web search results already retrieved for this fixture to ground the analysis in FACTS: recent form, injuries and suspensions, probable line-ups, table context and late team news. Prefer reports from the last 14 days.
- Treat the search results as your source of match facts; weigh them and discard anything clearly unrelated to these two teams.
- NEVER output URLs, citation markers, bracketed references or markdown links — the "analysis" field is clean prose.
- If the results are empty or useless, fall back to the market reasoning rules below and invent nothing.

`;

  return `You are the lead football analyst for a premium English-language betting-tips app. You turn one tip into publication-ready copy that a paying subscriber reads right before placing a bet.

## The tip you are writing about
- Match: ${fixture}
- Sport: ${m.sport || "Football"}
- Competition: ${m.league || "unknown"}
- Kickoff: ${m.kickoff || "unknown"}
- Recommended pick (source language, Polish): ${m.predictionRaw || "unknown"}
- Decimal odds: ${m.odds || "unknown"}

${researchBlock}${sourceBlock}

## Output
Return ONLY one minified JSON object — no prose, no code fences, nothing before or after — with exactly these keys:
{
  "prediction": "",
  "league": "",
  "analysis": "",
  "homeTeamEn": "",
  "awayTeamEn": ""
}

## prediction
- Rewrite the pick as a crisp English betting-market label, at most 60 characters.
- Name the exact selection and keep any line the market implies: "Over 2.5 goals", "Double chance: away or draw", "Both teams to score", "Over 9.5 corners", "Home to win".

## league
- The competition in the form a UK bookmaker would print, in English (e.g. "Ekstraklasa", "La Liga", "Premier League"). Empty string only if you genuinely cannot place the fixture.

## analysis — how to write it
${hasNote ? `- This is a faithful translation of the note above, lightly copy-edited. Follow the tipster's sentences and paragraphs in order, keep their voice, and change nothing but spelling, grammar and punctuation.
- Drop only bookmaker/promo/bet-slip wording and remarks about the tipster himself or other days. If nothing needs removing, keep the whole note.
- Do NOT add facts, stats, scenarios or a "risk" of your own, and do not turn it into an article — just present their reasoning.` : `- Lead straight into the reasoning; no "in this article" openers.
- Be about THIS market: state what has to happen for ${m.predictionRaw || "the pick"} to land, then the two or three game scenarios that decide it, then one honest risk.
- Reason from how this kind of market behaves (e.g. double chance absorbs a narrow defeat; both-teams-to-score needs two willing attacks; an over line leans on early or open games). ${grounded ? "You may cite the concrete facts found by web search; do not add specifics beyond them." : "Where it is genuinely obvious you may note a league's general character, but never assert specific facts you were not given."}
- Confident, expert tone for paying subscribers. No hedging, no filler, no summary sentence at the end.
- Length: 3–5 sentences.`}
- Plain text only. One paragraph normally; if the pick has several legs, give each leg its own short paragraph separated by a blank line, in the same order as the pick.
- Fix spelling, grammar and punctuation. Expand cryptic codes ("3W 2D 1L" -> "three wins, two draws and a loss"; "GF/GA" -> "goals for and against").
- Delete: emoji, greetings and sign-offs, bookmaker/promo/bet-slip jargon, and throwaway openers.

## team names (homeTeamEn / awayTeamEn)
- Use the team's standard international English name — exactly the title of its English Wikipedia article (e.g. "Bayern Munich", "Legia Warsaw", "1. FC Köln", "Crvena zvezda"). Keep diacritics ("Malmö FF", "Lech Poznań").
- Resolve local abbreviations and nicknames to the full name ("Śląsk" -> "Śląsk Wrocław").
- If the given name is already correct, repeat it unchanged. If you cannot confidently identify a side, use an empty string — never invent a club.

## Never
- Mention the tipster, the source website, translation, any bookmaker, or any promo.
- Output anything other than the JSON object.`;
};

const analyseSingle = async (
  m: MatchInput,
  mode: AnalyzeMode = "rewrite",
  grounded = true,
): Promise<AnalysisOutput> => {
  if (!API_KEY) return fallbackAnalysis(m);

  // A meaningful note turns this into a rewrite; an empty one means generate.
  // mode:"generate" forces the generate path even if a stray note is present.
  const hasNote = mode !== "generate" && String(m.analysisRaw || "").trim().length >= 40;
  const prompt = buildPrompt(m, hasNote, grounded);

  // Grounded runs enable OpenRouter's web plugin (Exa for DeepSeek, since it has
  // no native search) and reasoning; both add cost, so they toggle per request.
  const requestExtras: Record<string, unknown> = grounded
    ? {
        reasoning: { effort: REASONING_EFFORT },
        plugins: [{ id: "web", max_results: WEB_MAX_RESULTS }],
      }
    : { reasoning: { enabled: false } };

  const tryModel = async (model: string): Promise<AnalysisOutput | null> => {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://surebet.guru",
          "X-Title": "SureBet Guru",
        },
        body: JSON.stringify({
          model,
          ...requestExtras,
          messages: [{ role: "user", content: prompt }],
          // Grounded runs carry web excerpts and reasoning tokens, so they need a
          // larger ceiling than a plain rewrite.
          max_tokens: grounded ? 2400 : 1200,
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
      });

      const data: OpenRouterResponse = await res.json();
      if (data.error) return null;

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) return null;

      const obj = parseJsonObject(content);
      if (!obj) return null;

      const analysis = String(obj.analysis ?? "").trim();
      if (analysis.length < 40) return null;

      const fb = fallbackAnalysis(m);
      return {
        prediction: String(obj.prediction ?? "").trim() || fb.prediction,
        league: String(obj.league ?? "").trim(),
        analysis,
        // A missing or empty canonical name keeps the raw source name — the
        // client only overwrites what the model was confident about.
        homeTeam: String(obj.homeTeamEn ?? "").trim(),
        awayTeam: m.awayTeam ? String(obj.awayTeamEn ?? "").trim() : "",
        ok: true,
      };
    } catch {
      return null;
    }
  };

  // Try each model, retrying each once: a grounded (web + reasoning) call
  // occasionally fails upstream and succeeds on the second attempt. Failed
  // generations are not billed, so the retry is free.
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await tryModel(model);
      if (out) return out;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return fallbackAnalysis(m);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const matches: MatchInput[] = body?.matches || [];
    const mode: AnalyzeMode = body?.mode === "generate" ? "generate" : "rewrite";
    // Web grounding + reasoning are on unless the caller explicitly opts out
    // (grounded === false) to save cost.
    const grounded = body?.grounded !== false;
    if (!Array.isArray(matches) || matches.length === 0) {
      throw new Error("Missing or invalid 'matches' array");
    }
    // Guard against a runaway selection burning the OpenRouter budget.
    if (matches.length > 25) {
      throw new Error(`Too many matches at once (${matches.length}); select 25 or fewer`);
    }

    // Run a few at a time. Sequentially, a full batch of long multi-leg notes
    // would sit well past the edge function's wall-clock limit; unbounded, it
    // would trip OpenRouter's rate limit. Order is preserved by index so the
    // client can zip the results back onto its selection. Grounded runs cost
    // more wall-clock per call (web search + reasoning), so they run a bit less
    // parallel to keep a 25-tip batch inside the function's time limit.
    const concurrency = grounded ? 3 : CONCURRENCY;
    const analyses: AnalysisOutput[] = new Array(matches.length);
    let cursor = 0;
    const workers = new Array(Math.min(concurrency, matches.length))
      .fill(0)
      .map(async () => {
        while (cursor < matches.length) {
          const i = cursor++;
          try {
            analyses[i] = await analyseSingle(matches[i], mode, grounded);
          } catch {
            analyses[i] = fallbackAnalysis(matches[i]);
          }
        }
      });
    await Promise.all(workers);

    return new Response(JSON.stringify({ analyses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ai-analyze]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
