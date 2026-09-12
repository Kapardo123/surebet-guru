-- ============================================================================
-- Team logo system v2
-- Replaces the dead/legacy `team_logos_cache` table with a real, shared
-- server-side cache used by the `team-logo` edge function.
-- ============================================================================

-- 1) Remove the legacy cache table (never populated by the old client code).
DROP TABLE IF EXISTS public.team_logos_cache;

-- 2) New shared cache: one row per normalized team name.
CREATE TABLE IF NOT EXISTS public.team_logos (
  team_key    text        PRIMARY KEY,               -- normalized name, e.g. "legia warszawa"
  team_name   text        NOT NULL,                  -- display name as requested
  url         text,                                  -- best logo URL (NULL when missing)
  source      text,                                  -- provider that supplied `url`
  score       integer     NOT NULL DEFAULT 0,
  missing     boolean     NOT NULL DEFAULT false,    -- negative cache entry
  candidates  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  hit_count   integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_logos_updated_at_idx ON public.team_logos (updated_at DESC);
CREATE INDEX IF NOT EXISTS team_logos_missing_idx ON public.team_logos (missing) WHERE missing;

-- 3) Row Level Security: everyone may read (public logos), only the service
--    role (edge function) writes — no INSERT/UPDATE/DELETE policies on purpose.
ALTER TABLE public.team_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_logos public read" ON public.team_logos;
CREATE POLICY "team_logos public read"
  ON public.team_logos FOR SELECT
  USING (true);

-- service_role bypasses RLS, so the edge function can upsert freely.
GRANT SELECT ON public.team_logos TO anon, authenticated;
GRANT ALL    ON public.team_logos TO service_role;
