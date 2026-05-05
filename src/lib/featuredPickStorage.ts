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
  likesCount?: number;
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
    description: data.description,
    likesCount: data.likes_count || 0
  };
};

export const saveFeaturedPick = async (pick: FeaturedPick): Promise<void> => {
  // We always INSERT a new record. 
  // This ensures the latest "Save" is always the one with the newest 'created_at'.
  // loadFeaturedPick always fetches the newest record, so this guarantees the UI updates correctly.
  const dataToSave: any = {
    league: pick.league,
    kickoff: pick.kickoff,
    home_team: pick.homeTeam,
    away_team: pick.awayTeam,
    prediction: pick.prediction,
    odds: pick.odds,
    confidence: pick.confidence,
    status: pick.status || "upcoming",
    home_team_logo: pick.homeTeamLogo,
    away_team_logo: pick.awayTeamLogo,
    description: pick.description,
    likes_count: pick.likesCount || 0
  };

  const { error } = await supabase
    .from('featured_picks')
    .insert([dataToSave]);

  if (error) {
    console.error("Supabase error saving featured pick:", error);
    if (error.code === '42703' || error.message?.includes('column "status"')) {
      throw new Error("SQL_COLUMN_MISSING: status");
    }
    throw new Error(error.message || "Unknown Supabase error");
  }
};

export const incrementFeaturedReaction = async (pickId: number, type: 'like') => {
  const column = 'likes_count';
  
  // Use RPC for atomic increment
  const { error } = await supabase.rpc('increment_featured_reaction', { 
    pick_id: pickId, 
    reaction_type: column 
  });

  if (error) {
    console.warn("RPC increment_featured_reaction failed, trying manual update:", error);
    const { data } = await supabase.from('featured_picks').select(column).eq('id', pickId).single();
    if (data) {
      await supabase.from('featured_picks').update({ [column]: (data as any)[column] + 1 }).eq('id', pickId);
    }
  }
};
