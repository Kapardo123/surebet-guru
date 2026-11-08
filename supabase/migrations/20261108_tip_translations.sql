-- 20261108_tip_translations.sql
--
-- AI translation of tip content (prediction + description) stored per locale.
--
-- Flow:
--   1) Publishing a tip (or changing its text) enqueues translation_jobs for
--      every enabled locale in app_locales.
--   2) The edge function `translate-content` drains the queue with
--      Gemma 4 (free) -> Mistral Nemo -> Ling 3.0 Flash and upserts
--      tip_translations.
--   3) The app reads tip_translations for the active UI language and falls
--      back to the source text when a translation is missing.
--
-- Source language is detected by the edge function (Polish vs English) and
-- stored in tips.source_locale. Both `en` and `pl` are enabled by default so a
-- Polish source gets an English translation and vice versa.
--
-- Apply in the Supabase SQL Editor, then deploy:
--   supabase functions deploy translate-content --no-verify-jwt

-- ---------------------------------------------------------------------------
-- 1) Source locale + locale registry
-- ---------------------------------------------------------------------------
alter table public.tips
  add column if not exists source_locale text not null default 'en';

create table if not exists public.app_locales (
  locale text primary key,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.app_locales (locale, enabled)
values ('en', true), ('pl', true)
on conflict (locale) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Translations + job queue
-- ---------------------------------------------------------------------------
create table if not exists public.tip_translations (
  tip_id bigint not null references public.tips(id) on delete cascade,
  locale text not null,
  prediction text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'stale')),
  source_hash text,
  model text,
  translated_at timestamptz not null default now(),
  primary key (tip_id, locale)
);

create index if not exists tip_translations_locale_idx
  on public.tip_translations (locale);

create table if not exists public.translation_jobs (
  id bigserial primary key,
  entity_type text not null default 'tip' check (entity_type in ('tip')),
  entity_id bigint not null,
  locale text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, locale)
);

create index if not exists translation_jobs_pending_idx
  on public.translation_jobs (status, created_at);

-- ---------------------------------------------------------------------------
-- 3) Enqueue trigger
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_tip_translations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  loc text;
begin
  -- Only live, published tips are translated.
  if new.is_published is true and coalesce(new.queued, false) = false then
    -- Skip no-op updates while the tip was already live and the text is unchanged.
    if tg_op = 'UPDATE'
       and old.is_published is true
       and coalesce(old.queued, false) = false
       and new.prediction is not distinct from old.prediction
       and new.description is not distinct from old.description
       and new.source_locale is not distinct from old.source_locale then
      return new;
    end if;

    -- Source text changed -> existing translations are outdated.
    if tg_op = 'UPDATE'
       and (new.prediction is distinct from old.prediction
            or new.description is distinct from old.description
            or new.source_locale is distinct from old.source_locale) then
      update public.tip_translations
        set status = 'stale'
        where tip_id = new.id and status <> 'stale';
    end if;

    for loc in select locale from public.app_locales where enabled loop
      insert into public.translation_jobs (entity_type, entity_id, locale, status)
      values ('tip', new.id, loc, 'pending')
      on conflict (entity_type, entity_id, locale) do update
        set status = 'pending',
            error = null,
            updated_at = now()
        where public.translation_jobs.status <> 'processing';
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists tips_enqueue_translations on public.tips;
create trigger tips_enqueue_translations
  after insert or update of prediction, description, is_published, queued, source_locale
  on public.tips
  for each row execute function public.enqueue_tip_translations();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
-- Premium gating helper (also useful for the staged premium-masking migration).
create or replace function public.has_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.premium_access pa
    where pa.user_id = uid and pa.expires_at > now()
  );
$$;

create or replace function public.tip_translation_visible(p_tip_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tips t
    where t.id = p_tip_id
      and t.is_published = true
      and coalesce(t.queued, false) = false
      and (t.is_premium = false or public.has_premium(auth.uid()))
  );
$$;

grant execute on function public.has_premium(uuid) to anon, authenticated;
grant execute on function public.tip_translation_visible(bigint) to anon, authenticated;

alter table public.tip_translations enable row level security;
drop policy if exists "Translations are public" on public.tip_translations;
create policy "Translations are public" on public.tip_translations
  for select to anon, authenticated
  using (public.tip_translation_visible(tip_id));
grant select on public.tip_translations to anon, authenticated;

alter table public.app_locales enable row level security;
drop policy if exists "Locales are public" on public.app_locales;
create policy "Locales are public" on public.app_locales
  for select to anon, authenticated using (true);
grant select on public.app_locales to anon, authenticated;

alter table public.translation_jobs enable row level security;
revoke all on public.translation_jobs from anon, authenticated;
revoke all on sequence public.translation_jobs_id_seq from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Optional 5-minute cron
-- ---------------------------------------------------------------------------
-- The cron only schedules when both Vault secrets exist. Create them once:
--   select vault.create_secret('<random-long-key>', 'translate_cron_key');
--   select vault.create_secret('<VITE_SUPABASE_ANON_KEY>', 'translate_anon_key');
-- Then re-run the DO block below (or the whole file).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_key text;
  v_anon text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron unavailable: translate-content cron not scheduled';
    return;
  end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise notice 'pg_net unavailable: translate-content cron not scheduled';
    return;
  end if;

  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'translate_cron_key';
  select decrypted_secret into v_anon
    from vault.decrypted_secrets where name = 'translate_anon_key';

  if v_key is null or v_anon is null then
    raise notice 'Add Vault secrets translate_cron_key and translate_anon_key, then re-run this block to enable the translation cron.';
    return;
  end if;

  if exists (select 1 from cron.job where jobname = 'translate-content-5min') then
    perform cron.unschedule('translate-content-5min');
  end if;

  perform cron.schedule(
    'translate-content-5min',
    '*/5 * * * *',
    format($cron$
      select net.http_post(
        url := 'https://omcmnbtkvitrgjqstrrl.supabase.co/functions/v1/translate-content',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', %L,
          'x-translate-key', %L
        ),
        body := '{"action":"process","limit":4}'::jsonb,
        timeout_milliseconds := 120000
      );
    $cron$, v_anon, v_key)
  );
end $$;
