-- Migration: featured_picks UPDATE/DELETE policies
-- Description: Queue tab edytuje hero w kolejce (updateFeaturedPickById),
--   publikuje go (update queued=false) i usuwa (deleteQueuedFeaturedPick) —
--   a tabela miala wylacznie polityki INSERT + SELECT. Polityki dla
--   authenticated (spójnie z tips/coupons — admin jest zalogowany w appce).
-- Uruchom w Supabase SQL Editor.

DROP POLICY IF EXISTS "Allow authenticated update featured_picks" ON public.featured_picks;
CREATE POLICY "Allow authenticated update featured_picks"
  ON public.featured_picks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete featured_picks" ON public.featured_picks;
CREATE POLICY "Allow authenticated delete featured_picks"
  ON public.featured_picks FOR DELETE
  TO authenticated
  USING (true);
