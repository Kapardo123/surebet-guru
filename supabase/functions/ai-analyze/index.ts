// Supabase Edge Function: ai-analyze
// Writes the English tip copy for matches picked from zawodtyper.pl.
//
// This runs ON DEMAND ONLY — after the admin has selected which matches to keep,
// never during scraping. zawodtyper-proxy returns raw Polish source data and
// nothing else, so no tokens are spent on the ~115 tips fetched per day.
//
// For each match the model gets the Polish tipster note and returns:
//   prediction — the pick as a short English betting-market label
//   league     — inferred from the teams (the source has no league field)
//   analysis   — the tipster's own analysis, tidied up and translated
//
// "analysis" deliberately mirrors the source rather than summarising it: same
// argument in the same order, same level of detail, one paragraph per leg on
// multi-leg picks, first-person voice — with the spelling, punctuation, emoji,
// sign-offs and bookmaker jargon cleaned out. TipCard renders it with
// whitespace-pre-wrap, so paragraph breaks survive to the published tip.
//
// Input:  { matches: [{ homeTeam, awayTeam, sport, predictionRaw, odds, kickoff, analysisRaw }] }
// Output: { analyses: [{ prediction, league, analysis }] }   (same order as input)
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
const MODELS = ["deepseek/deepseek-chat", "openai/gpt-4o-mini"];

// How many matches are analysed in parallel. Keeps a full 25-match batch
// comfortably inside the edge function's wall-clock limit without hammering
// OpenRouter hard enough to get rate limited.
const CONCURRENCY = 4;

interface MatchInput {
  homeTeam?: string;
  awayTeam?: string;
  sport?: string;
  predictionRaw?: string;
  odds?: number;
  kickoff?: string;
  analysisRaw?: string;
}

interface AnalysisOutput {
  prediction: string;
  league: string;
  analysis: string;
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
    ok: false,
  };
};

// Long notes run to several thousand characters; cap the input so one rambling
// post cannot dominate the batch's cost or latency.
const MAX_NOTE_CHARS = 4000;

const buildPrompt = (m: MatchInput): string => {
  const fixture = m.awayTeam ? `${m.homeTeam} vs ${m.awayTeam}` : String(m.homeTeam || "");
  const note = String(m.analysisRaw || "");
  const trimmedNote = note.length > MAX_NOTE_CHARS
    ? `${note.slice(0, MAX_NOTE_CHARS)}…`
    : note;

  return `You are a betting editor. A Polish tipster posted the pick below. Rewrite their note as the analysis shown on an English-language tips app.

Your job is to preserve their analysis, not to replace it with your own: same argument, same order, same level of detail — only tidied up and translated.

Sport: ${m.sport || "Football"}
Match: ${fixture}
Kickoff: ${m.kickoff || "unknown"}
Tipster's pick (Polish): ${m.predictionRaw || "unknown"}
Odds: ${m.odds || "unknown"}
Tipster's note (Polish):
${trimmedNote || "(no note provided)"}

Return ONLY a JSON object, no prose and no code fences, with exactly these keys:
{
  "prediction": "the pick as a short English betting-market label, max 60 chars, e.g. 'Home win or draw + under 4.5 goals'",
  "league": "the competition these teams play in, in English, e.g. 'Ekstraklasa'. Empty string if you are not sure.",
  "analysis": "the tidied-up English version of the note"
}

Rules for "analysis" — keep it close to the original:
- Follow the tipster's reasoning in their order. Keep every concrete detail they give: player names, injuries, suspensions, transfers, recent form, head-to-head trends, table position.
- Match their length. A detailed note deserves a detailed analysis of roughly the same length; a two-line note gets a short one. Never pad a thin note to make it look fuller.
- If the pick has several legs, justify each leg in its own short paragraph, in the same order as the pick, separated by a blank line. That is how these notes are written.
- Keep the tipster's first-person voice ("I expect", "I'm backing", "for me").

Rules for "analysis" — but make it neat:
- Fix the spelling, grammar and punctuation. Break run-on sentences up.
- Use normal capitalisation: "Lech Poznań", never "LECH POZNAŃ".
- Write figures out in words where the note is cryptic. No abbreviations like W3, D3, L5, GF, GA.
- Delete: emoji, greetings and sign-offs, bookmaker names, promo or bet-slip jargon, and empty openers such as "not much to say here".
- Never mention the tipster, the source website, or that this was translated.
- Do not invent statistics, injuries or results that the note does not give you.`;
};

const analyseSingle = async (m: MatchInput): Promise<AnalysisOutput> => {
  if (!API_KEY) return fallbackAnalysis(m);

  const prompt = buildPrompt(m);

  for (const model of MODELS) {
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
          messages: [{ role: "user", content: prompt }],
          // Output tracks the source note's length (median ~650 chars, and
          // multi-leg picks run well past that), so leave real headroom.
          max_tokens: 1200,
          temperature: 0.5,
          response_format: { type: "json_object" },
        }),
      });

      const data: OpenRouterResponse = await res.json();
      if (data.error) continue;

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) continue;

      const obj = parseJsonObject(content);
      if (!obj) continue;

      const analysis = String(obj.analysis ?? "").trim();
      if (analysis.length < 40) continue;

      const fb = fallbackAnalysis(m);
      return {
        prediction: String(obj.prediction ?? "").trim() || fb.prediction,
        league: String(obj.league ?? "").trim(),
        analysis,
        ok: true,
      };
    } catch {
      continue;
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
    // client can zip the results back onto its selection.
    const analyses: AnalysisOutput[] = new Array(matches.length);
    let cursor = 0;
    const workers = new Array(Math.min(CONCURRENCY, matches.length))
      .fill(0)
      .map(async () => {
        while (cursor < matches.length) {
          const i = cursor++;
          try {
            analyses[i] = await analyseSingle(matches[i]);
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
