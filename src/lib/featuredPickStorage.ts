import { supabase } from "@/integrations/supabase/client";

export interface FeaturedPick {
  id?: number;
  league: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: string;
  confidence: string;
}

export const loadFeaturedPick = async (): Promise<FeaturedPick | null> => {
  const { data, error } = await supabase
    .from('featured_picks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error("Error loading featured pick:", error);
    return null;
  }

  return {
    id: data.id,
    league: data.league,
    kickoff: data.kickoff,
    homeTeam: data.home_team,
    awayTeam: data.away_team,
    prediction: data.prediction,
    odds: data.odds,
    confidence: data.confidence
  };
};

export const saveFeaturedPick = async (pick: FeaturedPick) => {
  const { error } = await supabase
    .from('featured_picks')
    .insert([{
      league: pick.league,
      kickoff: pick.kickoff,
      home_team: pick.homeTeam,
      away_team: pick.awayTeam,
      prediction: pick.prediction,
      odds: pick.odds,
      confidence: pick.confidence
    }]);

  if (error) console.error("Error saving featured pick:", error);
};
