-- Migration: purge_archive_guard + cron 3:00 (settle-yesterday-3am)
-- Description:
--   1) purge_old_tips v2 — mecze NIE sa kasowane po 8h. Retencja domyslna 48h
--      (klient tipsStorage.EXPIRY_HOURS = 48), a usunięcie wymaga jednego z:
--        a) wiersza w archiwum match_results (tip juz w zakladce Yesterday's),
--        b) wieku > 7 dni (twarde sprzatanie dead-rows, np. never-resolved).
--      Gwarancja: nic rozstrzygnietego nie znika przed archiwizacja.
--   2) Cron: codziennie settle-results. '0 1 * * *' = 01:00 UTC = 03:00 PL
--      (czas letni; zimą 02:00 PL — akceptowalne, wszystkie mecze i tak
--      skonczone). Klucz autoryzacji funkcji czytany z Vault w czasie runu.
--
-- Zmienne do podmiany przy recznym uruchamianiu:
--   __SETTLE_CRON_KEY__  -> losowy klucz (ten sam co sekret SETTLE_CRON_KEY)
--   __ANON_KEY__         -> VITE_SUPABASE_ANON_KEY (publiczny)
-- Uruchom w Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) purge_old_tips v2
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_old_tips(expiry_hours integer DEFAULT 48)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - make_interval(hours => expiry_hours);
  deep_cutoff timestamptz := now() - interval '7 days';
  deleted_count integer;
BEGIN
  DELETE FROM public.tips t
  WHERE t.is_published = true
    AND (
      (t.status = 'won' AND t.won_at IS NOT NULL AND t.won_at < cutoff)
      OR (t.status IS DISTINCT FROM 'won'
         AND t.kickoff IS NOT NULL
         AND t.kickoff::timestamptz < cutoff)
    )
    AND (
      EXISTS (
        SELECT 1 FROM public.match_results mr
        WHERE mr.source_type = 'tip' AND mr.source_id = t.id
      )
      OR t.kickoff::timestamptz < deep_cutoff
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_tips(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.purge_old_tips(integer) TO authenticated;

COMMENT ON FUNCTION public.purge_old_tips(integer) IS
  'Usuwa opublikowane tipy starsze niz expiry_hours, ale TYLKO juz zarchiwizowane w match_results (archiwum robi settle-results o 3:00). Wiersze nie zarchiwizowane kasuje po 7 dniach.';

-- ---------------------------------------------------------------------------
-- 2) Cron 3:00 — rozstrzyganie wczorajszych meczow
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Sekret cron-a w Vault (raz; __SETTLE_CRON_KEY__ podmien przy wykonywaniu):
-- SELECT vault.create_secret('__SETTLE_CRON_KEY__', 'settle_cron_key');

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle-yesterday-3am') THEN
    PERFORM cron.unschedule('settle-yesterday-3am');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'settle-yesterday-results') THEN
    PERFORM cron.unschedule('settle-yesterday-results');
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
    body := jsonb_build_object('mode', 'yesterday'),
    timeout_milliseconds := 120000
  );
  $$
);

-- Weryfikacja: SELECT jobname, schedule, active FROM cron.job;
