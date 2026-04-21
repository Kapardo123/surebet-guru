import { supabase } from "@/integrations/supabase/client";
import { Tip } from "@/components/TipCard";

const isTipStatus = (value: unknown): value is Tip["status"] =>
  value === "upcoming" || value === "won" || value === "lost" || value === "draw";

const TIPS_CACHE_KEY = "gsb_tips_cache";

const getCachedTips = (): Tip[] => {
  try {
    const cached = localStorage.getItem(TIPS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
};

const setCachedTips = (tips: Tip[]) => {
  try {
    localStorage.setItem(TIPS_CACHE_KEY, JSON.stringify(tips));
  } catch (e) {}
};

export const loadTips = async (): Promise<Tip[]> => {
  // Return cached data first for instant UI
  const cached = getCachedTips();
  
  // Return cached immediately if we have it, then fetch in background
  // but for simplicity we'll just handle the fetch
  
  const { data, error } = await supabase
    .from('tips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error("Error loading tips:", error);
    return cached; // Return cached on error
  }

  const tips = (data || []).map((tip: any) => ({
    id: tip.id,
    sport: tip.sport,
    league: tip.league,
    homeTeam: tip.home_team,
    awayTeam: tip.away_team,
    prediction: tip.prediction,
    odds: tip.odds,
    kickoff: tip.kickoff,
    status: isTipStatus(tip.status) ? tip.status : "upcoming",
    isPremium: tip.is_premium ?? undefined,
    homeTeamLogo: tip.home_team_logo || null,
    awayTeamLogo: tip.away_team_logo || null,
    description: tip.description || null,
  }));

  setCachedTips(tips);
  return tips;
};

export const addTip = async (tip: Omit<Tip, "id">): Promise<Tip | null> => {
  const { data, error } = await (supabase as any)
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
      is_premium: tip.isPremium,
      home_team_logo: tip.homeTeamLogo,
      away_team_logo: tip.awayTeamLogo,
      description: tip.description
    }])
    .select()
    .single();

  if (error) {
    console.error("Error adding tip:", error);
    return null;
  }

  const record = data as any;

  return {
    id: record.id,
    sport: record.sport,
    league: record.league,
    homeTeam: record.home_team,
    awayTeam: record.away_team,
    prediction: record.prediction,
    odds: record.odds,
    kickoff: record.kickoff,
    status: isTipStatus(record.status) ? record.status : "upcoming",
    isPremium: record.is_premium ?? undefined,
    homeTeamLogo: record.home_team_logo,
    awayTeamLogo: record.away_team_logo,
    description: record.description
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
  const { error } = await (supabase as any)
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
      is_premium: updatedTip.isPremium,
      home_team_logo: updatedTip.homeTeamLogo,
      away_team_logo: updatedTip.awayTeamLogo,
      description: updatedTip.description
    })
    .eq('id', updatedTip.id);

  if (error) console.error("Error updating tip:", error);
};
