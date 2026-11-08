-- 20261104_harden_rls_free_premium.sql
--
-- Security hardening after an audit that found:
--   1) profiles was publicly readable  -> every user's email leaked to anon.
--   2) tips/coupons/featured_picks accepted writes from any role
--      (policies `TO public USING true` + anon held INSERT/UPDATE/DELETE),
--      so anyone with the public anon key could create/edit/delete content.
--
-- Applied live on 2026-11-04. Admin writes are now restricted to the operator
-- account (ADMIN_EMAIL = azden789@gmail.com) via the JWT email claim.
--
-- STAGE 2 (NOT applied yet — requires the next client release):
--   premium tips/coupons are still readable in full by anon through the base
--   tables. Closing that needs the app to read masked views, then revoking base
--   SELECT. See the commented block at the bottom. It must ship together with an
--   app update because the currently published clients read the base tables.

-- 1) profiles: stop exposing every user's email ---------------------------------
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- 2) tips writes: admin only, anon cannot write at all --------------------------
drop policy if exists "Allow authenticated insert tips" on public.tips;
drop policy if exists "Allow authenticated update tips" on public.tips;
drop policy if exists "Allow authenticated delete tips" on public.tips;
create policy "Admin insert tips" on public.tips for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
create policy "Admin update tips" on public.tips for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
create policy "Admin delete tips" on public.tips for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
revoke insert, update, delete, truncate on public.tips from anon;

-- 3) coupons writes: admin only -------------------------------------------------
drop policy if exists "Allow authenticated insert coupons" on public.coupons;
drop policy if exists "Allow authenticated update coupons" on public.coupons;
drop policy if exists "Allow authenticated delete coupons" on public.coupons;
create policy "Admin insert coupons" on public.coupons for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
create policy "Admin update coupons" on public.coupons for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
create policy "Admin delete coupons" on public.coupons for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
revoke insert, update, delete, truncate on public.coupons from anon;

-- 4) featured_picks writes: admin only (public hero read stays) -----------------
drop policy if exists "Allow authenticated insert featured_picks" on public.featured_picks;
drop policy if exists "Allow authenticated update featured_picks" on public.featured_picks;
drop policy if exists "Allow authenticated delete featured_picks" on public.featured_picks;
create policy "Admin insert featured_picks" on public.featured_picks for insert to authenticated
  with check (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
create policy "Admin update featured_picks" on public.featured_picks for update to authenticated
  using (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com')
  with check (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
create policy "Admin delete featured_picks" on public.featured_picks for delete to authenticated
  using (lower(auth.jwt() ->> 'email') = 'azden789@gmail.com');
revoke insert, update, delete, truncate on public.featured_picks from anon;

-- 5) purge_old_tips: not callable by guests ------------------------------------
revoke execute on function public.purge_old_tips(integer) from public;
grant execute on function public.purge_old_tips(integer) to authenticated;

-- ============================================================================
-- STAGE 2 — premium content masking (apply with the next app release)
-- ============================================================================
-- create or replace function public.has_premium(uid uuid)
-- returns boolean language sql stable security definer
-- set search_path = public, pg_temp as $$
--   select exists (
--     select 1 from public.premium_access pa
--     where pa.user_id = uid and pa.expires_at > now()
--   );
-- $$;
--
-- create or replace view public.tips_public as
-- select
--   t.id, t.sport, t.league, t.home_team, t.away_team,
--   case when t.is_premium and not public.has_premium(auth.uid())
--        then null else t.prediction end as prediction,
--   t.odds, t.kickoff, t.status, t.is_premium, t.is_published, t.queued,
--   t.home_team_logo, t.away_team_logo,
--   case when t.is_premium and not public.has_premium(auth.uid())
--        then null else t.description end as description,
--   t.likes_count, t.won_at, t.created_at
-- from public.tips t
-- where t.is_published = true and t.queued = false;
--
-- create or replace view public.coupons_public as
-- select
--   c.id, c.name,
--   case when c.is_premium and not public.has_premium(auth.uid()) then (
--     select coalesce(jsonb_agg(
--       jsonb_set(jsonb_set(leg, '{prediction}', to_jsonb('Premium pick'::text)),
--                 '{odds}', to_jsonb(1::numeric))
--     ), '[]'::jsonb)
--     from jsonb_array_elements(c.matches) as leg
--   ) else c.matches end as matches,
--   c.total_odds, c.stake, c.status, c.is_premium, c.queued, c.won_at, c.created_at
-- from public.coupons c
-- where coalesce(c.queued, false) = false;
--
-- grant select on public.tips_public, public.coupons_public to anon, authenticated;
--
-- -- After the new client is live on every platform:
-- revoke select on public.tips, public.coupons from anon;
--
-- TODO in the client before applying the revoke:
--   * loadTips()  -> from('tips_public')
--   * loadCoupons() -> from('coupons_public')
--   * the Daily Spin "free premium tip" reveal must come from the server
--     (daily-reward returns the chosen tip), because the masked view hides it.
