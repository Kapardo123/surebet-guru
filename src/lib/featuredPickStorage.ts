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
  status: "upcoming" | "won" | "lost" | "draw";
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  description?: string | null;
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
    confidence: data.confidence,
    status: data.status || "upcoming",
    homeTeamLogo: data.home_team_logo,
    awayTeamLogo: data.away_team_logo,
    description: data.description
  };
};

export const saveFeaturedPick = async (pick: FeaturedPick) => {
  const dataToSave: any = {
    league: pick.league,
    kickoff: pick.kickoff,
    home_team: pick.homeTeam,
    away_team: pick.awayTeam,
    prediction: pick.prediction,
    odds: pick.odds,
    confidence: pick.confidence,
    home_team_logo: pick.homeTeamLogo,
    away_team_logo: pick.awayTeamLogo,
    description: pick.description
  };

  // Only add status if it's provided and we want to try saving it
  // In case the column doesn't exist yet, we'll try to save without it if it fails
  if (pick.status) {
    dataToSave.status = pick.status;
  }

  try {
    const { error } = pick.id 
      ? await supabase.from('featured_picks').update(dataToSave).eq('id', pick.id)
      : await supabase.from('featured_picks').insert([dataToSave]);

    if (error) {
      // If error is about missing column 'status', try saving without it
      if (error.message?.includes('column "status" of relation "featured_picks" does not exist') || 
          error.code === '42703') {
        console.warn("Status column missing in featured_picks table. Saving without status.");
        delete dataToSave.status;
        const { error: retryError } = pick.id 
          ? await supabase.from('featured_picks').update(dataToSave).eq('id', pick.id)
          : await supabase.from('featured_picks').insert([dataToSave]);
        
        if (retryError) throw retryError;
      } else {
        throw error;
      }
    }
  } catch (err) {
    console.error("Error in saveFeaturedPick:", err);
    throw err;
  }
};
