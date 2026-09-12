// Supabase Edge Function: team-logo
// ----------------------------------------------------------------------------
// Server-side team logo resolver with a shared DB cache. Replaces the old
// 1200-line client-side fetcher that hammered Wikipedia/Commons from every
// device (429s) and had no shared cache.
//
// POST { team: string, fresh?: boolean }         -> { team, best, candidates, ... }
// POST { teams: string[], fresh?: boolean }      -> { results: [...] }
//
// Deploy: supabase functions deploy team-logo --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeQueries, normalizeSpaced } from "./matching.ts";
import {
  fetch365Scores,
  fetchFotmob,
  fetchSoccerWiki,
  fetchTransfermarkt,
} from "./providers.ts";
import type { RawCandidate } from "./providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const POSITIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const NEGATIVE_TTL_MS = 5 * 24 * 60 * 60 * 1000;  // 5 days
const MAX_CANDIDATES = 12;

interface Resolved {
  team: string;
  teamKey: string;
  best: string | null;
  source: string | null;
  score: number;
  candidates: RawCandidate[];
  cached: boolean;
  missing: boolean;
}

/** Turn a hanging provider into `[]` instead of blocking the whole response. */
const settle = async (p: Promise<RawCandidate[]>, ms: number): Promise<RawCandidate[]> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<RawCandidate[]>((resolve) => {
    timer = setTimeout(() => resolve([]), ms);
  });
  try {
    return await Promise.race([p.catch(() => []), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const dedupeSort = (candidates: RawCandidate[]): RawCandidate[] => {
  const seen = new Set<string>();
  const out: RawCandidate[] = [];
  for (const c of candidates) {
    if (!c?.url || seen.has(c.url)) continue;
    seen.add(c.url);
    out.push(c);
  }
  return out.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, MAX_CANDIDATES);
};

const emptyResolved = (team: string, teamKey: string): Resolved => ({
  team, teamKey, best: null, source: null, score: 0, candidates: [], cached: false, missing: true,
});

const runProviders = async (team: string, queries: string[]): Promise<RawCandidate[]> => {
  const settled = await Promise.all([
    settle(fetchTransfermarkt(team, queries), 9000),
    settle(fetchFotmob(team, queries), 8000),
    settle(fetchSoccerWiki(team, queries), 8500),
    settle(fetch365Scores(team, queries), 7000),
  ]);
  return dedupeSort(settled.flat());
};

const resolveTeam = async (
  supabase: any,
  team: string,
  fresh: boolean,
): Promise<Resolved> => {
  const trimmed = team.trim();
  const teamKey = normalizeSpaced(trimmed);
  if (!teamKey || teamKey.length < 2) return emptyResolved(trimmed, teamKey);

  // ---- cache lookup --------------------------------------------------------
  if (!fresh) {
    const { data } = await supabase
      .from("team_logos")
      .select("url, source, score, missing, candidates, updated_at")
      .eq("team_key", teamKey)
      .maybeSingle();

    if (data) {
      const age = Date.now() - new Date(data.updated_at).getTime();
      const ttl = data.missing ? NEGATIVE_TTL_MS : POSITIVE_TTL_MS;
      if (age < ttl) {
        return {
          team: trimmed,
          teamKey,
          best: data.url || null,
          source: data.source || null,
          score: data.score || 0,
          candidates: Array.isArray(data.candidates) ? data.candidates : [],
          cached: true,
          missing: !!data.missing,
        };
      }
    }
  }

  // ---- live resolution -----------------------------------------------------
  const queries = makeQueries(trimmed);
  const fromProviders = await runProviders(trimmed, queries);

  const merged = dedupeSort(fromProviders);

  const best = merged[0] || null;
  const missing = !best;

  // ---- persist -------------------------------------------------------------
  const { error: upsertError } = await supabase
    .from("team_logos")
    .upsert(
      {
        team_key: teamKey,
        team_name: trimmed,
        url: best?.url ?? null,
        source: best?.source ?? null,
        score: best?.score ?? 0,
        missing,
        candidates: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team_key" },
    );
  if (upsertError) {
    console.error("[team-logo] cache upsert failed:", upsertError.message);
  }

  return {
    team: trimmed,
    teamKey,
    best: best?.url ?? null,
    source: best?.source ?? null,
    score: best?.score ?? 0,
    candidates: merged,
    cached: false,
    missing,
  };
};

const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const fresh = body?.fresh === true;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Admin-only: wipe the shared logo cache so everything re-resolves.
    if (body?.action === "clear") {
      const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase();
      const authHeader = req.headers.get("Authorization") || "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const userClient = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!adminEmail || !user?.email || user.email.toLowerCase() !== adminEmail) {
        return new Response(JSON.stringify({ error: "Brak uprawnień administratora" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
      const { error } = await supabase.from("team_logos").delete().neq("team_key", "__none__");
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ cleared: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Bulk mode (optional prefetch)
    if (Array.isArray(body?.teams)) {
      const teams: string[] = body.teams
        .map((t: unknown) => String(t || "").trim())
        .filter((t: string) => t.length >= 2)
        .slice(0, 40);
      const results = await mapLimit(teams, 4, (t) => resolveTeam(supabase, t, fresh));
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const team = String(body?.team || "").trim();
    if (team.length < 2) {
      return new Response(JSON.stringify({ error: "Missing 'team'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const result = await resolveTeam(supabase, team, fresh);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[team-logo]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
