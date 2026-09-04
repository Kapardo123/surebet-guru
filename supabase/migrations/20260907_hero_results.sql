-- Migration: hero w Yesterday's Results
-- Description: match_results przyjmuje source_type 'hero' — settle-results
--   rozstrzyga aktywny hero (featured_picks, queued=false) tak jak tipa
--   (odds-api + AI fallback) i archiwizuje snapshot. FeaturedPick.status
--   dostaje 'void' (kolumna tekstowa, bez constrainta).
-- Uruchom w Supabase SQL Editor.

ALTER TABLE public.match_results DROP CONSTRAINT match_results_source_type_check;
ALTER TABLE public.match_results ADD CONSTRAINT match_results_source_type_check
  CHECK (source_type IN ('tip', 'coupon', 'hero'));