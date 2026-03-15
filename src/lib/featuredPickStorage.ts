export interface FeaturedPick {
  league: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: string;
  confidence: string;
}

const STORAGE_KEY = "tipstr_featured_pick";

const defaultPick: FeaturedPick = {
  league: "Premier League",
  kickoff: "20:00",
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  prediction: "Over 2.5 Goals",
  odds: "1.85",
  confidence: "High",
};

export const loadFeaturedPick = (): FeaturedPick => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultPick;
};

export const saveFeaturedPick = (pick: FeaturedPick) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pick));
};
