// Supabase Edge Function: ai-style
// Edits a match analysis into one tipster's voice (xGhost or Courtside).
//
// Input:  { text, tipster: "adam" | "peter", mode: "polish" | "rewrite" | "shorten" | "expand",
//           match?: { homeTeam, awayTeam, sport, league, prediction, odds, kickoff } }
// Output: { analysis, gaps: string[], removed: string[], model }
//
// Admins only: the caller's session must pass public.is_admin(), so the
// OpenRouter budget can't be spent by anyone else.
//
// Deploy: supabase functions deploy ai-style
// Requires the OPENROUTER_API_KEY secret (already set for ai-analyze).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  EditMode,
  FORBIDDEN,
  MatchContext,
  TipsterId,
  buildSystemPrompt,
  buildUserPrompt,
  lengthWindow,
} from "../_shared/tipsterStyle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_KEY = Deno.env.get("OPENROUTER_API_KEY") || "";
// Stronger writer first; the fallback keeps the feature up if it's down.
const MODELS = ["openai/gpt-4o-mini", "deepseek/deepseek-chat"];
const MAX_SOURCE = 4000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

const strings = (v: unknown, max = 3) =>
  (Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean).slice(0, max);

// Tidy what models tend to add: markdown, stray quotes, too many blank lines.
const clean = (t: string) =>
  t
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\*\*|__|^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const isAdmin = async (req: Request): Promise<boolean> => {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await client.rpc("is_admin");
  return !error && data === true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!(await isAdmin(req))) return json({ error: "Admins only." }, 403);
    if (!API_KEY) return json({ error: "OPENROUTER_API_KEY is not set." }, 500);

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, MAX_SOURCE);
    const tipster = body?.tipster as TipsterId;
    const mode = (body?.mode ?? "rewrite") as EditMode;
    const match = (body?.match ?? {}) as MatchContext;

    if (text.length < 30) return json({ error: "Write or import an analysis first (at least a sentence or two)." }, 400);
    if (tipster !== "adam" && tipster !== "peter") return json({ error: "Pick the tipster first." }, 400);
    if (!["polish", "rewrite", "shorten", "expand"].includes(mode)) return json({ error: `Unknown mode "${mode}".` }, 400);

    const system = buildSystemPrompt(tipster);
    const user = buildUserPrompt(text, mode, tipster, match);
    const [minLen, maxLen] = lengthWindow(text.length, mode);
    let lastProblem = "no answer";

    // Try each model; an answer that breaks a hard rule counts as a miss.
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://surebet.guru",
              "X-Title": "SureBet Guru",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
                // On a retry, say what went wrong the first time.
                ...(attempt > 0 ? [{ role: "user", content: `Your last answer was rejected: ${lastProblem}. Fix that and answer again.` }] : []),
              ],
              max_tokens: 1400,
              // Polishing should stay close to the source; rewriting can move more.
              temperature: mode === "polish" ? 0.3 : 0.6,
              response_format: { type: "json_object" },
            }),
          });
          const data = await res.json();
          if (data?.error) {
            lastProblem = String(data.error.message || "model error");
            break; // this model is failing; try the next one
          }
          const obj = parseJsonObject(String(data?.choices?.[0]?.message?.content ?? ""));
          if (!obj) {
            lastProblem = "it was not a JSON object";
            continue;
          }
          const analysis = clean(String(obj.analysis ?? ""));
          if (analysis.length < Math.min(minLen, 120)) {
            lastProblem = "the analysis was missing or far too short";
            continue;
          }
          if (FORBIDDEN.test(analysis)) {
            lastProblem = `it promised a result ("${analysis.match(FORBIDDEN)?.[0]}"), which is not allowed`;
            continue;
          }
          if (analysis.length > maxLen) {
            lastProblem = `it was too long (${analysis.length} characters, the limit for this mode is ${maxLen})`;
            continue;
          }
          return json({ analysis, gaps: strings(obj.gaps), removed: strings(obj.removed), model });
        } catch (e) {
          lastProblem = e instanceof Error ? e.message : "request failed";
        }
      }
    }
    return json({ error: `The AI couldn't produce a usable analysis (${lastProblem}). Try again or another mode.` }, 502);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[ai-style]", message);
    return json({ error: message }, 400);
  }
});
