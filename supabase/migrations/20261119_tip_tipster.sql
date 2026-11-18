-- Who dealt the card: 'adam' or 'peter' (shown under their nicknames in the app).
-- get_feed_tips() and get_my_album() return to_jsonb(row), so the column flows
-- through without changing them. Archived tips keep it too.

ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS tipster TEXT;
ALTER TABLE public.tips DROP CONSTRAINT IF EXISTS tips_tipster_check;
ALTER TABLE public.tips ADD CONSTRAINT tips_tipster_check CHECK (tipster IS NULL OR tipster IN ('adam', 'peter'));

ALTER TABLE public.tips_archive ADD COLUMN IF NOT EXISTS tipster TEXT;

CREATE OR REPLACE FUNCTION public.archive_settled_tip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb := to_jsonb(OLD);
BEGIN
  IF COALESCE(OLD.status, 'upcoming') IN ('won', 'lost', 'draw') THEN
    INSERT INTO public.tips_archive (id, sport, league, home_team, away_team, prediction, odds, kickoff, status,
                                     is_premium, home_team_logo, away_team_logo, won_at, tipster)
    VALUES (OLD.id, OLD.sport, OLD.league, OLD.home_team, OLD.away_team, OLD.prediction, OLD.odds, OLD.kickoff::text,
            OLD.status, OLD.is_premium, r->>'home_team_logo', r->>'away_team_logo', r->>'won_at', r->>'tipster')
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, odds = EXCLUDED.odds, prediction = EXCLUDED.prediction,
                                   tipster = EXCLUDED.tipster;
  END IF;
  RETURN OLD;
END;
$$;
