-- Migration: imported_matches
-- Description: Tracks matches already imported from SportyTrader so they are not
--              scraped/imported again. Keyed by the SportyTrader match id.
-- Used by: sportytrader-proxy import flow in the Admin panel.

CREATE TABLE IF NOT EXISTS imported_matches (
  source_id   TEXT PRIMARY KEY,           -- SportyTrader numeric match id (e.g. "358004")
  home_team   TEXT,
  away_team   TEXT,
  target      TEXT,                        -- where it was routed: 'tip' | 'hero' | 'coupon'
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imported_matches_imported_at
  ON imported_matches(imported_at DESC);

COMMENT ON TABLE imported_matches IS 'SportyTrader match ids already imported, to skip on re-scrape.';

-- Row Level Security: only authenticated users (admins log in) may read/insert.
ALTER TABLE imported_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imported_matches_select_auth" ON imported_matches;
CREATE POLICY "imported_matches_select_auth"
  ON imported_matches FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "imported_matches_insert_auth" ON imported_matches;
CREATE POLICY "imported_matches_insert_auth"
  ON imported_matches FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "imported_matches_delete_auth" ON imported_matches;
CREATE POLICY "imported_matches_delete_auth"
  ON imported_matches FOR DELETE
  TO authenticated
  USING (true);
