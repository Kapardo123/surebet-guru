-- Weekly stats: only the current week counts (Monday 00:00 UTC, resets every
-- Monday). Overall and per tipster, 1 unit staked on every settled card.
CREATE OR REPLACE FUNCTION public.get_week_record()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT date_trunc('week', now() AT TIME ZONE 'UTC')::date AS ws
  ), settled AS (
    SELECT id, status, odds, kickoff, tipster FROM public.tips_archive
    UNION
    SELECT id, status, odds, kickoff::text, tipster FROM public.tips WHERE status IN ('won', 'lost', 'draw')
  ), wk AS (
    SELECT s.*, ((s.kickoff::timestamptz) AT TIME ZONE 'UTC')::date AS day,
           CASE s.status WHEN 'won' THEN s.odds - 1 WHEN 'lost' THEN -1 ELSE 0 END AS units
    FROM settled s, bounds b
    WHERE s.kickoff ~ '^\d{4}-'
      AND ((s.kickoff::timestamptz) AT TIME ZONE 'UTC')::date BETWEEN b.ws AND b.ws + 6
  ), days AS (
    SELECT d::date AS day
    FROM bounds b, generate_series(b.ws, LEAST(b.ws + 6, (now() AT TIME ZONE 'UTC')::date), interval '1 day') d
  ), daily AS (
    SELECT days.day, COALESCE(SUM(wk.units), 0) AS units
    FROM days LEFT JOIN wk ON wk.day = days.day GROUP BY days.day
  )
  SELECT jsonb_build_object(
    'week_start', (SELECT ws FROM bounds),
    'total', (SELECT COUNT(*) FROM wk),
    'won', (SELECT COUNT(*) FROM wk WHERE status = 'won'),
    'lost', (SELECT COUNT(*) FROM wk WHERE status = 'lost'),
    'draw', (SELECT COUNT(*) FROM wk WHERE status = 'draw'),
    'units', COALESCE((SELECT ROUND(SUM(units)::numeric, 2) FROM wk), 0),
    'series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'units', ROUND(cum::numeric, 2)) ORDER BY day)
      FROM (SELECT day, SUM(units) OVER (ORDER BY day) AS cum FROM daily) s
    ), '[]'::jsonb),
    'tipsters', COALESCE((
      SELECT jsonb_object_agg(tipster, jsonb_build_object(
        'total', n, 'won', w, 'lost', l, 'draw', dr, 'units', ROUND(u::numeric, 2)))
      FROM (
        SELECT tipster, COUNT(*) AS n,
               COUNT(*) FILTER (WHERE status = 'won') AS w,
               COUNT(*) FILTER (WHERE status = 'lost') AS l,
               COUNT(*) FILTER (WHERE status = 'draw') AS dr,
               SUM(units) AS u
        FROM wk WHERE tipster IS NOT NULL GROUP BY tipster
      ) t
    ), '{}'::jsonb)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_week_record() TO anon, authenticated;
