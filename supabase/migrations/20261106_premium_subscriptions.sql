-- 20261106_premium_subscriptions.sql
--
-- Android subscriptions (Google Play via RevenueCat) need a little more state
-- than a single expiry. Stripe (web) stays one-time, so these columns are
-- optional there and only populated by the RevenueCat functions.
--
--   provider            'stripe' | 'revenuecat' | 'admin' | 'reward'
--   subscription_id     store subscription/product identifier (best effort)
--   auto_renew          true while a store subscription will renew
--   current_period_end  end of the paid store period (subscriptions)

alter table public.premium_access
  add column if not exists provider text,
  add column if not exists subscription_id text,
  add column if not exists auto_renew boolean not null default false,
  add column if not exists current_period_end timestamptz;

create index if not exists premium_access_subscription_id_idx
  on public.premium_access (subscription_id);
