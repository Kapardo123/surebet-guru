-- Migration: purge_old_tips
-- Description: Trwale usuwa opublikowane mecze (typy) starsze niż zadany próg (domyślnie 8h).
--   - dla status = 'won' wiek liczone od won_at,
--   - dla pozostałych statusów od kickoff (czas rozpoczęcia meczu).
--   Funkcja jest SECURITY DEFINER, więc omija RLS i działa także z kluczem anon
--   wywoływana przez supabase.rpc('purge_old_tips'). Uruchom w Supabase SQL Editor.
-- Uwaga: zakłada, że kolumna kickoff daje się rzutować na timestamptz (ISO tekst lub timestamptz).

CREATE OR REPLACE FUNCTION public.purge_old_tips(expiry_hours integer DEFAULT 8)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - make_interval(hours => expiry_hours);
  deleted_count integer;
BEGIN
  DELETE FROM public.tips
  WHERE is_published = true
    AND (
      (status = 'won' AND won_at IS NOT NULL AND won_at < cutoff)
      OR
      (status IS DISTINCT FROM 'won'
         AND kickoff IS NOT NULL
         AND kickoff::timestamptz < cutoff)
    );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Pozwól wywołać RPC z frontendu (anon i authenticated).
GRANT EXECUTE ON FUNCTION public.purge_old_tips(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.purge_old_tips(integer) TO authenticated;

COMMENT ON FUNCTION public.purge_old_tips(integer) IS
  'Trwale usuwa opublikowane typy starsze niż expiry_hours (won od won_at, inaczej od kickoff).';

-- OPCJONALNIE: automatyczne czyszczenie co godzinę przez pg_cron (wymaga rozszerzenia pg_cron):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('purge-old-tips', '0 * * * *', $$SELECT public.purge_old_tips(8);$$);
