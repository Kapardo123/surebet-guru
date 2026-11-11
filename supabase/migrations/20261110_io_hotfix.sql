-- 20261110_io_hotfix.sql
--
-- Incident hotfix for Disk IO budget exhaustion.
--
-- Cause: the client called purge_old_tips()/purge_old_coupons() on EVERY
-- loadTips()/loadCoupons(). Both are SECURITY DEFINER DELETEs that scan the
-- tables (coupons also expands jsonb_array_elements per row). With enough
-- app opens this exhausted the Micro compute disk IO budget and the database
-- stopped answering.
--
-- Fix:
--   1. Keep the retention logic, but only the service role (daily
--      settle-results cron) may actually run it. Client calls become a fast
--      no-op and return 0, so the app's fallback path is not triggered.
--   2. Add the indexes needed by the app's hot read queries.
--
-- Apply in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) Guarded retention functions
-- ---------------------------------------------------------------------------
create or replace function public.purge_old_tips(expiry_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cutoff timestamptz := now() - make_interval(hours => expiry_hours);
  deep_cutoff timestamptz := now() - interval '7 days';
  deleted_count integer;
begin
  -- Retention is a maintenance job, not a read path. Only the cron/service
  -- role runs it; clients get an instant 0 (and skip their fallback).
  if coalesce(auth.role(), '') <> 'service_role' then
    return 0;
  end if;

  delete from public.tips t
  where t.is_published = true
    and (
      (t.status = 'won' and t.won_at is not null and t.won_at < cutoff)
      or (t.status is distinct from 'won'
         and t.kickoff is not null
         and t.kickoff::timestamptz < cutoff)
    )
    and (
      exists (
        select 1 from public.match_results mr
        where mr.source_type = 'tip' and mr.source_id = t.id
      )
      or t.kickoff::timestamptz < deep_cutoff
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.purge_old_tips(integer) from public;
grant execute on function public.purge_old_tips(integer) to anon, authenticated;

create or replace function public.purge_old_coupons(expiry_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cutoff timestamptz := now() - make_interval(hours => expiry_hours);
  deep_cutoff timestamptz := now() - interval '7 days';
  deleted_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    return 0;
  end if;

  delete from public.coupons c
  where coalesce(c.queued, false) = false
    and (
      (
        c.status in ('won', 'lost', 'void')
        and coalesce(c.won_at, c.created_at) < cutoff
      )
      or (
        c.status in ('active', 'pending')
        and coalesce(
          (
            select max(
              case
                when (leg ->> 'kickoff') ~ '^\d{4}-\d{2}-\d{2}'
                  then (leg ->> 'kickoff')::timestamptz
              end
            )
            from jsonb_array_elements(
              case when jsonb_typeof(c.matches) = 'array' then c.matches else '[]'::jsonb end
            ) as leg
          ),
          c.created_at
        ) < cutoff
      )
      or c.created_at < deep_cutoff
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.purge_old_coupons(integer) from public;
grant execute on function public.purge_old_coupons(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Indexes for the app's hot read paths
-- ---------------------------------------------------------------------------
create index if not exists tips_published_created_idx
  on public.tips (is_published, created_at desc);
create index if not exists tips_created_idx
  on public.tips (created_at desc);
create index if not exists tips_published_kickoff_idx
  on public.tips (is_published, kickoff);
create index if not exists tips_status_won_idx
  on public.tips (status, won_at);

create index if not exists coupons_queued_created_idx
  on public.coupons (queued, created_at desc);
create index if not exists coupons_created_idx
  on public.coupons (created_at desc);
create index if not exists coupons_status_won_idx
  on public.coupons (status, won_at);

create index if not exists featured_picks_created_idx
  on public.featured_picks (created_at desc);

-- ---------------------------------------------------------------------------
-- 3) Refresh planner statistics
-- ---------------------------------------------------------------------------
analyze public.tips;
analyze public.coupons;
analyze public.match_results;
analyze public.tip_translations;
analyze public.translation_jobs;
analyze public.featured_picks;
