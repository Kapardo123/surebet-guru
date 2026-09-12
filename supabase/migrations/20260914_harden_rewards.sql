-- ============================================================================
-- Harden the reward / premium tables.
--
-- Before: `premium_access` had a public policy (`using/with_check = true`) that
-- let ANY client insert/update/delete ANY row (self-grant premium, wipe others),
-- and `daily_spins` had a public "allow all" policy. Both are now locked down:
-- clients can only read their own rows; every write happens server-side through
-- edge functions with the service role.
-- ============================================================================

-- ---- daily_spins: clean spin log for the server-side 24h cooldown ----------
-- (empty + unreferenced before this migration)
DROP TABLE IF EXISTS public.daily_spins;

CREATE TABLE public.daily_spins (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  device_id  text,
  spun_at    timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS daily_spins_user_spun_idx
  ON public.daily_spins (user_id, spun_at DESC);

ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_spins_select_own" ON public.daily_spins;
CREATE POLICY "daily_spins_select_own"
  ON public.daily_spins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.daily_spins TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.daily_spins FROM anon, authenticated;

-- ---- premium_access: read-only for clients ---------------------------------
-- Writes are done by trusted server code only:
--   • daily-reward        (wheel prize, server-side cooldown)
--   • grant-premium       (admin panel, ADMIN_EMAIL gated)
--   • revenuecat-webhook  (store purchases / renewals / expirations)
--   • verify-payment / referral (existing server flows)

DROP POLICY IF EXISTS "Admins can manage all premium access" ON public.premium_access;
DROP POLICY IF EXISTS "Users can view own premium status" ON public.premium_access;
DROP POLICY IF EXISTS "Users can view own premium access" ON public.premium_access;

CREATE POLICY "Users can view own premium access"
  ON public.premium_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.premium_access TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.premium_access FROM anon, authenticated;
