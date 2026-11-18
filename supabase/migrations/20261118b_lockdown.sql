-- Migration: lock down content tables (run AFTER 20261118_engagement.sql)
--
-- BEFORE running this:
--   1. Create your admin account in the app (Sign in -> Join), confirm the email.
--   2. Add it to the admins table:
--        INSERT INTO public.admins (user_id)
--        SELECT id FROM auth.users WHERE email = 'you@example.com';
--   3. Sign in to the admin panel with that account (triple-tap the footer).
--
-- After this, anonymous clients can no longer read or write tips/coupons
-- directly: the app reads through get_feed_tips()/get_feed_coupons(), which
-- strip Gold picks for users who haven't paid. Only admins can write.

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('tips', 'coupons', 'featured_picks')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_picks ENABLE ROW LEVEL SECURITY;

-- tips / coupons: admins only (everyone else uses the feed functions).
CREATE POLICY "tips_admin_all" ON public.tips FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "coupons_admin_all" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- featured_picks: the pick of the day stays publicly readable (it's unlocked
-- with an ad in the app); only admins can change it.
CREATE POLICY "featured_public_read" ON public.featured_picks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "featured_admin_write" ON public.featured_picks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- get_public_coupons() (older RPC) returned everything; route it through the masked feed.
DROP FUNCTION IF EXISTS public.get_public_coupons();
CREATE FUNCTION public.get_public_coupons()
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.get_feed_coupons();
$$;
