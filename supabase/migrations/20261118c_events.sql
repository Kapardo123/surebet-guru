-- Migration: product analytics events
-- Anyone may record events (insert only, and only as themselves); only
-- admins can read them, through get_event_funnel().

CREATE TABLE IF NOT EXISTS public.events (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name       TEXT NOT NULL CHECK (char_length(name) <= 64),
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id    TEXT CHECK (char_length(anon_id) <= 64),
  props      JSONB CHECK (props IS NULL OR pg_column_size(props) < 2048)
);
CREATE INDEX IF NOT EXISTS idx_events_name_time ON public.events(name, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "events_insert_self" ON public.events;
CREATE POLICY "events_insert_self" ON public.events FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "events_admin_read" ON public.events;
CREATE POLICY "events_admin_read" ON public.events FOR SELECT TO authenticated USING (public.is_admin());

-- Events and distinct people per event name over the last p_days (admins only).
CREATE OR REPLACE FUNCTION public.get_event_funnel(p_days integer DEFAULT 7)
RETURNS TABLE (name text, events bigint, people bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
    SELECT e.name, COUNT(*)::bigint, COUNT(DISTINCT COALESCE(e.user_id::text, e.anon_id))::bigint
    FROM public.events e
    WHERE e.created_at > now() - make_interval(days => p_days)
    GROUP BY e.name
    ORDER BY 2 DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_event_funnel(integer) TO authenticated;
