-- 20261105_purge_old_coupons.sql
--
-- Coupons used to accumulate forever. Mirror the tips retention (purge_old_tips):
--   • won/lost/void coupons are removed `expiry_hours` after won_at (or created_at)
--   • active/pending coupons are removed `expiry_hours` after their last kick-off
--   • anything older than 7 days is removed regardless (deep cutoff)
-- Queued (unpublished) coupons are never touched.
--
-- Called from the client on loadCoupons() and by the daily settle-results cron.
-- SECURITY DEFINER so it works regardless of the admin-only DELETE policy.

create or replace function public.purge_old_coupons(expiry_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  cutoff timestamptz := now() - make_interval(hours => expiry_hours);
  deep_cutoff timestamptz := now() - interval '7 days';
  deleted_count integer;
begin
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
$function$;

revoke execute on function public.purge_old_coupons(integer) from public;
grant execute on function public.purge_old_coupons(integer) to authenticated;
