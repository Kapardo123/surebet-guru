import { supabase } from "@/integrations/supabase/client";
import { Tip } from "@/components/TipCard";

export const loadTips = async (): Promise<Tip[]> => {
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error loading tips:", error);
    return [];
  }

  return (data || []).map(tip => ({
    id: tip.id,
    sport: tip.sport,
    league: tip.league,
    homeTeam: tip.home_team,
    awayTeam: tip.away_team,
    prediction: tip.prediction,
    odds: tip.odds,
    kickoff: tip.kickoff,
    status: tip.status,
    isPremium: tip.is_premium
  }));
};

export const addTip = async (tip: Omit<Tip, "id">): Promise<Tip | null> => {
  const { data, error } = await supabase
    .from('tips')
    .insert([{
      sport: tip.sport,
      league: tip.league,
      home_team: tip.homeTeam,
      away_team: tip.awayTeam,
      prediction: tip.prediction,
      odds: tip.odds,
      kickoff: tip.kickoff,
      status: tip.status,
      is_premium: tip.isPremium
    }])
    .select()
    .single();

  if (error) {
    console.error("Error adding tip:", error);
    return null;
  }

  return {
    id: data.id,
    sport: data.sport,
    league: data.league,
    homeTeam: data.home_team,
    awayTeam: data.away_team,
    prediction: data.prediction,
    odds: data.odds,
    kickoff: data.kickoff,
    status: data.status,
    isPremium: data.is_premium
  };
};

export const deleteTip = async (id: number) => {
  const { error } = await supabase
    .from('tips')
    .delete()
    .eq('id', id);
  
  if (error) console.error("Error deleting tip:", error);
};

export const updateTip = async (updatedTip: Tip) => {
  const { error } = await supabase
    .from('tips')
    .update({
      sport: updatedTip.sport,
      league: updatedTip.league,
      home_team: updatedTip.homeTeam,
      away_team: updatedTip.awayTeam,
      prediction: updatedTip.prediction,
      odds: updatedTip.odds,
      kickoff: updatedTip.kickoff,
      status: updatedTip.status,
      is_premium: updatedTip.isPremium
    })
    .eq('id', updatedTip.id);

  if (error) console.error("Error updating tip:", error);
};
