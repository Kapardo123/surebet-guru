-- Migration: engagement, history and server-side Gold masking
-- Run once in the Supabase SQL editor (safe to re-run).
--
-- Adds:
--   admins / is_admin()                 real admin accounts (replaces the hard-coded login)
--   has_gold() / can_see_tip()          who may see a members' pick
--   get_feed_tips() / get_feed_coupons() public feed with Gold picks masked server-side
--   tips_archive (+ trigger)            settled tips are archived before deletion
--   collected_cards / get_my_album()    a user's permanent card collection
--   get_track_record(days)              win rate and units over time
--   daily_opens / unlock_credits        daily streak; every 7th day earns a free card
--   record_daily_open() / redeem_credit()
--   weekend_passes                      $2.99 weekend pack
--   handle_new_user_trial (trigger)     3 days of Gold for every new account
--
-- NOTE: direct table access is NOT locked down here. Do that with
-- 20261118b_lockdown.sql after you've added yourself to `admins`.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read_self" ON public.admins;
CREATE POLICY "admins_read_self" ON public.admins FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Entitlements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekend_passes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('stripe', 'revenuecat', 'admin')),
  payment_ref TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_weekend_passes_user ON public.weekend_passes(user_id);
ALTER TABLE public.weekend_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekend_passes_select_own" ON public.weekend_passes;
CREATE POLICY "weekend_passes_select_own" ON public.weekend_passes FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Free cards earned (streak rewards, referrals) can be spent on tip_unlocks.
ALTER TABLE public.tip_unlocks DROP CONSTRAINT IF EXISTS tip_unlocks_source_check;
ALTER TABLE public.tip_unlocks ADD CONSTRAINT tip_unlocks_source_check
  CHECK (source IN ('stripe', 'revenuecat', 'admin', 'reward'));

CREATE OR REPLACE FUNCTION public.has_gold(uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT uid IS NOT NULL AND EXISTS (SELECT 1 FROM public.premium_access WHERE user_id = uid AND expires_at > now());
$$;

-- May the current user see the pick/odds/analysis of this tip?
CREATE OR REPLACE FUNCTION public.can_see_tip(p_id bigint, p_is_premium boolean, p_status text, p_kickoff text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  ko timestamptz;
BEGIN
  IF NOT COALESCE(p_is_premium, false) THEN RETURN true; END IF;
  IF COALESCE(p_status, 'upcoming') <> 'upcoming' THEN RETURN true; END IF; -- settled = public record
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.is_admin() OR public.has_gold(uid) THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.tip_unlocks WHERE user_id = uid AND tip_id = p_id) THEN RETURN true; END IF;
  BEGIN ko := p_kickoff::timestamptz; EXCEPTION WHEN others THEN ko := NULL; END;
  IF ko IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.weekend_passes WHERE user_id = uid AND ko >= starts_at AND ko < ends_at
  ) THEN RETURN true; END IF;
  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public feed with Gold content removed for those who can't see it
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_feed_tips()
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
           WHEN public.can_see_tip(t.id, t.is_premium, t.status, t.kickoff::text) THEN to_jsonb(t)
           ELSE to_jsonb(t) - 'prediction' - 'odds' - 'description' || jsonb_build_object('masked', true)
         END
  FROM public.tips t
  WHERE COALESCE(t.is_published, true) = true
  ORDER BY t.created_at DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.get_feed_tips() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_feed_coupons()
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
           WHEN NOT COALESCE(c.is_premium, false)
             OR COALESCE(c.status, 'active') IN ('won', 'lost')
             OR public.is_admin()
             OR public.has_gold(auth.uid())
           THEN to_jsonb(c)
           ELSE to_jsonb(c) - 'total_odds' || jsonb_build_object(
             'masked', true,
             'matches', COALESCE((SELECT jsonb_agg(m - 'prediction' - 'odds') FROM jsonb_array_elements(c.matches::jsonb) m), '[]'::jsonb)
           )
         END
  FROM public.coupons c
  ORDER BY c.created_at DESC
  LIMIT 30;
$$;
GRANT EXECUTE ON FUNCTION public.get_feed_coupons() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- History: settled tips survive the 8-hour purge
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tips_archive (
  id             BIGINT PRIMARY KEY,
  sport          TEXT,
  league         TEXT,
  home_team      TEXT,
  away_team      TEXT,
  prediction     TEXT,
  odds           NUMERIC,
  kickoff        TEXT,
  status         TEXT NOT NULL,
  is_premium     BOOLEAN,
  home_team_logo TEXT,
  away_team_logo TEXT,
  won_at         TEXT,
  archived_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tips_archive_kickoff ON public.tips_archive(kickoff);
ALTER TABLE public.tips_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tips_archive_public_read" ON public.tips_archive;
CREATE POLICY "tips_archive_public_read" ON public.tips_archive FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.archive_settled_tip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb := to_jsonb(OLD);
BEGIN
  IF COALESCE(OLD.status, 'upcoming') IN ('won', 'lost', 'draw') THEN
    INSERT INTO public.tips_archive (id, sport, league, home_team, away_team, prediction, odds, kickoff, status,
                                     is_premium, home_team_logo, away_team_logo, won_at)
    VALUES (OLD.id, OLD.sport, OLD.league, OLD.home_team, OLD.away_team, OLD.prediction, OLD.odds, OLD.kickoff::text,
            OLD.status, OLD.is_premium, r->>'home_team_logo', r->>'away_team_logo', r->>'won_at')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, odds = EXCLUDED.odds, prediction = EXCLUDED.prediction;
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_archive_settled_tip ON public.tips;
CREATE TRIGGER trg_archive_settled_tip BEFORE DELETE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.archive_settled_tip();

-- Win rate and units (1 unit staked per tip) for the last p_days.
CREATE OR REPLACE FUNCTION public.get_track_record(p_days integer DEFAULT 30)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH settled AS (
    SELECT id, status, odds, kickoff FROM public.tips_archive
    UNION
    SELECT id, status, odds, kickoff::text FROM public.tips WHERE status IN ('won', 'lost', 'draw')
  ), recent AS (
    SELECT *, (kickoff::timestamptz)::date AS day,
           CASE status WHEN 'won' THEN odds - 1 WHEN 'lost' THEN -1 ELSE 0 END AS units
    FROM settled
    WHERE kickoff ~ '^\d{4}-' AND kickoff::timestamptz > now() - make_interval(days => p_days)
  ), daily AS (
    SELECT day, SUM(units) AS units, COUNT(*) AS n FROM recent GROUP BY day
  )
  SELECT jsonb_build_object(
    'days', p_days,
    'total', (SELECT COUNT(*) FROM recent),
    'won', (SELECT COUNT(*) FROM recent WHERE status = 'won'),
    'lost', (SELECT COUNT(*) FROM recent WHERE status = 'lost'),
    'draw', (SELECT COUNT(*) FROM recent WHERE status = 'draw'),
    'units', COALESCE((SELECT ROUND(SUM(units)::numeric, 2) FROM recent), 0),
    'series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'units', ROUND(cum::numeric, 2)) ORDER BY day)
      FROM (SELECT day, SUM(units) OVER (ORDER BY day) AS cum FROM daily) s
    ), '[]'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_track_record(integer) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Collection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collected_cards (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id       BIGINT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tip_id)
);
ALTER TABLE public.collected_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collected_select_own" ON public.collected_cards;
CREATE POLICY "collected_select_own" ON public.collected_cards FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "collected_insert_own" ON public.collected_cards;
CREATE POLICY "collected_insert_own" ON public.collected_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- The user's cards with current or archived data. Gold content still masked
-- for open tips the user can't see (inserting an id doesn't reveal a pick).
CREATE OR REPLACE FUNCTION public.get_my_album()
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH mine AS (SELECT tip_id, collected_at FROM public.collected_cards WHERE user_id = auth.uid()),
  rows AS (
    SELECT to_jsonb(t) AS j, t.id, t.is_premium, t.status, t.kickoff::text AS kickoff FROM public.tips t JOIN mine ON mine.tip_id = t.id
    UNION ALL
    SELECT to_jsonb(a), a.id, a.is_premium, a.status, a.kickoff FROM public.tips_archive a JOIN mine ON mine.tip_id = a.id
      WHERE NOT EXISTS (SELECT 1 FROM public.tips t WHERE t.id = a.id)
  )
  SELECT CASE WHEN public.can_see_tip(r.id, r.is_premium, r.status, r.kickoff) THEN r.j
              ELSE r.j - 'prediction' - 'odds' - 'description' || jsonb_build_object('masked', true) END
         || jsonb_build_object('collected_at', m.collected_at)
  FROM rows r JOIN mine m ON m.tip_id = r.id
  ORDER BY m.collected_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_album() TO authenticated;

-- ---------------------------------------------------------------------------
-- Daily streak and free cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_opens (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day     DATE NOT NULL,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.daily_opens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_opens_select_own" ON public.daily_opens;
CREATE POLICY "daily_opens_select_own" ON public.daily_opens FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.unlock_credits (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits    INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unlock_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unlock_credits_select_own" ON public.unlock_credits;
CREATE POLICY "unlock_credits_select_own" ON public.unlock_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.add_unlock_credit(uid uuid, n integer DEFAULT 1)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.unlock_credits (user_id, credits) VALUES (uid, n)
  ON CONFLICT (user_id) DO UPDATE SET credits = public.unlock_credits.credits + n, updated_at = now();
$$;
REVOKE ALL ON FUNCTION public.add_unlock_credit(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_unlock_credit(uuid, integer) TO service_role;

-- Call when the user opens today's pack. Every 7th consecutive day = +1 free card.
CREATE OR REPLACE FUNCTION public.record_daily_open()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  is_new integer;
  d date := current_date;
  streak integer := 0;
  rewarded boolean := false;
  bal integer;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.daily_opens (user_id, day) VALUES (uid, current_date) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS is_new = ROW_COUNT;
  WHILE EXISTS (SELECT 1 FROM public.daily_opens WHERE user_id = uid AND day = d) LOOP
    streak := streak + 1;
    d := d - 1;
  END LOOP;
  IF is_new = 1 AND streak > 0 AND streak % 7 = 0 THEN
    PERFORM public.add_unlock_credit(uid, 1);
    rewarded := true;
  END IF;
  SELECT credits INTO bal FROM public.unlock_credits WHERE user_id = uid;
  RETURN jsonb_build_object('streak', streak, 'rewarded', rewarded, 'credits', COALESCE(bal, 0));
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_daily_open() TO authenticated;

-- Spend one free card on a Gold tip.
CREATE OR REPLACE FUNCTION public.redeem_credit(p_tip bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  t record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id, is_premium, status INTO t FROM public.tips WHERE id = p_tip;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tip not found'; END IF;
  IF NOT COALESCE(t.is_premium, false) THEN RAISE EXCEPTION 'This tip is already free'; END IF;
  IF EXISTS (SELECT 1 FROM public.tip_unlocks WHERE user_id = uid AND tip_id = p_tip) THEN RETURN true; END IF;
  UPDATE public.unlock_credits SET credits = credits - 1, updated_at = now() WHERE user_id = uid AND credits > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'No free cards left'; END IF;
  INSERT INTO public.tip_unlocks (user_id, tip_id, source, payment_ref)
  VALUES (uid, p_tip, 'reward', 'credit:' || uid || ':' || p_tip);
  RETURN true;
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_credit(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3-day Gold trial for every new account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_trial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.premium_access (user_id, expires_at, updated_at)
  VALUES (NEW.id, now() + interval '3 days', now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_new_user_trial ON auth.users;
CREATE TRIGGER trg_new_user_trial AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_trial();
