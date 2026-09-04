-- Migration: match_results (archiwum rozstrzygnięć dla zakładki "Yesterday's Results")
-- Description: Snapshot każdego rozstrzygniętego tipa i kuponu. Tabela `tips`
--   jest czyszczona po 8h (purge_old_tips), więc historia dnia wczorajszego
--   żyje tutaj. Zasilana przez edge function `settle-results` (service role),
--   publicznie czytelna. Uruchom w Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.match_results (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_type text NOT NULL CHECK (source_type IN ('tip', 'coupon')),
  source_id bigint NOT NULL,
  result_status text NOT NULL CHECK (result_status IN ('won', 'lost', 'void')),
  final_score text,
  settled_at timestamptz NOT NULL DEFAULT now(),
  settled_method text NOT NULL DEFAULT 'auto' CHECK (settled_method IN ('auto', 'ai', 'manual')),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Jeden wiersz archiwum na źródło (upsert z edge function).
CREATE UNIQUE INDEX IF NOT EXISTS match_results_source_uniq
  ON public.match_results (source_type, source_id);
CREATE INDEX IF NOT EXISTS match_results_settled_at_idx
  ON public.match_results (settled_at DESC);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- Każdy (także anon) czyta archiwum — rozstrzygnięte wyniki są publiczne,
-- dokładnie jak wygrane/przegrane tipy na stronie głównej.
DROP POLICY IF EXISTS "Public read match_results" ON public.match_results;
CREATE POLICY "Public read match_results"
  ON public.match_results FOR SELECT
  TO anon, authenticated
  USING (true);

-- Zapis tylko przez service role (edge function) — RLS blokuje resztę.

-- ---------------------------------------------------------------------------
-- OPCJONALNIE: codzienny cron (wymaga rozszerzeń pg_cron i pg_net).
-- Sekret service role trzymamy w Vault, żeby nie wpisywać go wprost w SQL.
--
-- 1) Włącz rozszerzenia: Database -> Extensions -> pg_cron, pg_net
-- 2) Zapisz sekret (raz):
--    SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- 3) Zaplanuj zadanie (codziennie 08:00 UTC = 10:00 w Warszawie):
--    SELECT cron.schedule(
--      'settle-yesterday-results',
--      '0 8 * * *',
--      $$
--      SELECT net.http_post(
--        url := 'https://omcmnbtkvitrgjqstrrl.supabase.co/functions/v1/settle-results',
--        headers := jsonb_build_object(
--          'Content-Type', 'application/json',
--          'Authorization', 'Bearer ' || (
--            SELECT decrypted_secret FROM vault.decrypted_secrets
--            WHERE name = 'service_role_key'
--          )
--        ),
--        body := jsonb_build_object('mode', 'yesterday'),
--        timeout_milliseconds := 120000
--      );
--      $$
--    );
-- Uwaga: wdróż funkcję z --no-verify-jwt (pattern jak send-premium-push) —
-- funkcja sama autoryzuje service role lub konto admina (ADMIN_EMAIL).
-- ---------------------------------------------------------------------------
