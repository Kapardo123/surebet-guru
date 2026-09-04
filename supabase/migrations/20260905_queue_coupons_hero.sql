-- Migration: queue dla kuponów i hero picków
-- Description: rozszerza poczekalnię (o 3:00) na wszystkie typy treści:
--   - tips.queued   (istnieje od 20260904_waiting_room.sql)
--   - coupons.queued (ta migracja)
--   - featured_picks.queued (ta migracja)
-- Release (cron 3:00 / przycisk "Release Now") publikuje wszystko naraz
-- i wysyła JEDEN zbiorczy push "New tips just dropped!" do premium.
-- Uruchom w Supabase SQL Editor.

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS queued boolean NOT NULL DEFAULT false;
ALTER TABLE public.featured_picks ADD COLUMN IF NOT EXISTS queued boolean NOT NULL DEFAULT false;
