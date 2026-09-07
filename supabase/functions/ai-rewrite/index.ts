// Supabase Edge Function: ai-rewrite
// Rewrites scraped analysis text via OpenRouter to avoid duplicate content
// and produce a professional betting-analyst style writeup.
//
// Input:  { matches: [{ text, homeTeam, awayTeam, league, prediction, odds }] }
//         (backward compatible: { texts: string[] })
// Output: { rewritten: string[] }
//
// Deploy: supabase functions deploy ai-rewrite --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
const MODELS = [
  "deepseek/deepseek-chat",
  "openai/gpt-4o-mini",
];

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message: string };
}

interface MatchInput {
  text: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  prediction?: string;
  odds?: number | string;
}

const rewriteSingle = async (m: MatchInput): Promise<string> => {
  const text = m.text || "";
  if (text.length < 50) return text;

  const fixture = [m.homeTeam, m.awayTeam].filter(Boolean).join(" vs ");
  const context = [
    fixture ? `Match: ${fixture}` : "",
    m.league ? `League: ${m.league}` : "",
    m.prediction ? `Tip: ${m.prediction}` : "",
    m.odds ? `Odds: ${m.odds}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `You are a professional football betting analyst writing for a premium tips service. Your audience expects sharp, confident, data-driven analysis — like what you'd read from a top tipster on a paid platform.

${context}

Original analysis from SportyTrader (the scout's notes for THIS match — this is your ONLY source of facts):
"""
${text}
"""

Rewrite the original analysis as a polished English writeup (4-6 sentences, one paragraph). CRITICAL RULES:
- The original analysis above is your ONLY source of facts. Every claim in your output MUST come from it — form, results, players, injuries, head-to-head, home/away dynamics, motivation. Do NOT invent or add anything that is not there.
- Preserve the original argument in the original order: same reasoning, same emphasis, same level of detail. If the scout focused on home form and a key striker, your analysis must too.
- Fix the spelling, grammar and punctuation. Expand abbreviations into words ("3W 2D 1L" → "3 wins, 2 draws and 1 loss"; "GF/GA" → "goals for/against").
- Confident professional tone — like an expert speaking to paying subscribers. No hedging.
- End with a clear recommendation restating the tip${m.odds ? ` and mentioning the odds of ${m.odds}` : ""}.
- Do NOT mention: SportyTrader, the scout, the source website, bookmakers, promo codes, or that this was rewritten/translated.
- Plain text only. No markdown, no emoji, no headers.`;

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
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      const data: OpenRouterResponse = await res.json();
      if (data.error) continue;
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content && content.length > 40 && content !== text) {
        return content;
      }
    } catch {
      continue;
    }
  }
  return text;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json().catch(() => ({}));

    // New format: matches with context
    let inputs: MatchInput[] = [];
    if (Array.isArray(body?.matches)) {
      inputs = body.matches.map((m: any) => ({
        text: String(m?.text || m?.analysisRaw || ""),
        homeTeam: m?.homeTeam ? String(m.homeTeam) : undefined,
        awayTeam: m?.awayTeam ? String(m.awayTeam) : undefined,
        league: m?.league ? String(m.league) : undefined,
        prediction: m?.prediction ? String(m.prediction) : undefined,
        odds: m?.odds ?? undefined,
      }));
    } else if (Array.isArray(body?.texts)) {
      // Backward compat
      inputs = body.texts.map((t: string) => ({ text: String(t) }));
    }

    if (inputs.length === 0) {
      throw new Error("Missing 'matches' or 'texts' array");
    }

    const rewritten: string[] = [];
    for (const input of inputs) {
      try {
        rewritten.push(await rewriteSingle(input));
      } catch {
        rewritten.push(input.text);
      }
    }

    return new Response(JSON.stringify({ rewritten }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ai-rewrite]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});