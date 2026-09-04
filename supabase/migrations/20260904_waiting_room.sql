-- Migration: waiting_room (poczekalnia typów)
-- Description:
--   1) tips.queued — tip dodany przez admina do poczekalni (niewidoczny,
--      is_published=false). O 3:00 cron (settle-results, body.release=true)
--      ustawia queued=false + is_published=true i wysyła JEDEN zbiorczy push
--      "New tips just dropped!" do premium (zamiast pusha przy każdym dodaniu).
--   2) Rejestracja cron job z flagą release (aktualizacja 20260903_cron_settle_3am).
--
-- Zmienna do podmiany przy ręcznym uruchamianiu: __ANON_KEY__ (VITE_SUPABASE_ANON_KEY)

ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS queued boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle-yesterday-3am') THEN
    PERFORM cron.unschedule('settle-yesterday-3am');
  END IF;
END $$;

SELECT cron.schedule(
  'settle-yesterday-3am',
  '0 1 * * *', -- 01:00 UTC = 03:00 czasu polskiego letniego
  $$
  SELECT net.http_post(
    url := 'https://omcmnbtkvitrgjqstrrl.supabase.co/functions/v1/settle-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '__ANON_KEY__',
      'x-settle-key', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'settle_cron_key'),
        ''
      )
    ),
    body := jsonb_build_object('mode', 'yesterday', 'release', true),
    timeout_milliseconds := 120000
  );
  $$
);

-- Weryfikacja: SELECT jobname, schedule, active FROM cron.job;
