-- Migration: tip_unlocks
-- Description: Single members' tips bought one at a time ($0.99).
--              One row per (user, tip). Rows are only written by edge
--              functions (service role) after the payment is verified.
-- Used by: create-payment / verify-payment (Stripe, web) and
--          unlock-tip-native (RevenueCat, Android).

CREATE TABLE IF NOT EXISTS tip_unlocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id      BIGINT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('stripe', 'revenuecat', 'admin')),
  payment_ref TEXT NOT NULL UNIQUE,         -- Stripe session id or store transaction id
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tip_id)
);

CREATE INDEX IF NOT EXISTS idx_tip_unlocks_user ON tip_unlocks(user_id);

COMMENT ON TABLE tip_unlocks IS 'Members-only tips unlocked individually by a user.';

ALTER TABLE tip_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own unlocks. No client insert/update/delete policies:
-- writes go through edge functions with the service role key.
DROP POLICY IF EXISTS "tip_unlocks_select_own" ON tip_unlocks;
CREATE POLICY "tip_unlocks_select_own"
  ON tip_unlocks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
