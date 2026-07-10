// Supabase Edge Function: ai-rewrite
// Rewrites scraped analysis text via OpenRouter to avoid duplicate content.
//
// Input:  { texts: string[] }
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

const rewriteSingle = async (text: string): Promise<string> => {
  if (!text || text.length < 50) return text;

  const prompt = `Summarize this betting analysis in natural, flowing sentences.
Write ONLY the key facts supporting the prediction: team form, key players/injuries, head-to-head, final bet.
Target 4-5 sentences. Keep it tight. NO history, NO filler, NO bookmakers.
IMPORTANT: Write in FULL sentences. Do NOT use abbreviations like W3, D3, L5, GF, GA, etc.
Instead write "3 wins, 3 draws, 5 losses" or similar natural language.

Match:
${text}`;

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
          max_tokens: 300,
          temperature: 0.8,
        }),
      });

      const data: OpenRouterResponse = await res.json();
      if (data.error) continue;
      const content = data.choices?.[0]?.message?.content?.trim();
      if (content && content.length > 20 && content !== text) {
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
    const texts: string[] = body?.texts || [];
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error("Missing or invalid 'texts' array");
    }

    const rewritten: string[] = [];
    for (const text of texts) {
      try {
        rewritten.push(await rewriteSingle(text));
      } catch {
        rewritten.push(text);
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
