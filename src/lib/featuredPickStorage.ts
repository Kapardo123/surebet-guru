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
  wonAt?: string | null;
  sport?: string | null;
  unlockFree?: boolean;
  // Poczekalnia: hero ukryty do publikacji o 3:00
  queued?: boolean;
}

/** Hero w poczekalni (widoczny tylko w zakładce Queue). */
export interface QueuedFeaturedPick extends FeaturedPick {
  savedAt?: string;
}

/** Lista hero w kolejce: ostatni wiersz na mecz (INSERT-owy model zapisu). */
export const loadQueuedFeaturedPicks = async (): Promise<QueuedFeaturedPick[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('featured_picks')
      .select('*')
      .eq('queued', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading queued featured picks:", error);
      return [];
    }

    return ((data || []) as any[]).map((row: any) => ({
      id: row.id,
      league: row.league,
      kickoff: row.kickoff,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      prediction: row.prediction,
      odds: row.odds,
      confidence: row.confidence,
      status: row.status || "upcoming",
      homeTeamLogo: row.home_team_logo,
      awayTeamLogo: row.away_team_logo,
      description: row.description,
      wonAt: row.won_at || null,
      sport: row.sport || null,
      unlockFree: row.unlock_free ?? false,
      queued: true,
      savedAt: row.created_at,
    }));
  } catch (e) {
    console.error("Error loading queued featured picks:", e);
    return [];
  }
};

/** Publikuje hero z poczekalni natychmiast: stary hero usuwany, ten staje się aktywnym.
 *  Zwraca false, gdy operacja nie doszła do skutku (np. RLS przy braku zalogowania). */
export const publishFeaturedPickById = async (id: number): Promise<boolean> => {
  try {
    const { data: row, error: loadError } = await (supabase as any)
      .from('featured_picks')
      .select('*')
      .eq('id', id)
      .single();
    if (loadError || !row) {
      console.error("Error loading queued pick for publish:", loadError?.message);
      return false;
    }
    // Model "ostatni wiersz jest aktywny": usuwamy wszystkie inne,
    // publikowany wiersz przestaje być queued.
    await (supabase as any)
      .from('featured_picks')
      .delete()
      .neq('id', id);
    const { error: updError } = await (supabase as any)
      .from('featured_picks')
      .update({ queued: false })
      .eq('id', id);
    if (updError) {
      console.error("Error publishing featured pick:", updError.message);
      return false;
    }
    // Weryfikacja: RLS potrafi zablokować update/delete PO CICHU (200, 0 rows).
    const { data: check } = await (supabase as any)
      .from('featured_picks')
      .select('queued')
      .eq('id', id)
      .maybeSingle();
    return !!check && check.queued === false;
  } catch (e) {
    console.error("Error publishing featured pick:", e);
    return false;
  }
};

/** Usuwa hero z poczekalni bez publikacji.
 *  Zwraca false, gdy wiersz nadal istnieje (RLS blokuje po cichu). */
export const deleteQueuedFeaturedPick = async (id: number): Promise<boolean> => {
  const { error } = await (supabase as any)
    .from('featured_picks')
    .delete()
    .eq('id', id);
  if (error) {
    console.error("Error deleting queued featured pick:", error.message);
    return false;
  }
  // Weryfikacja faktycznego usunięcia (RLS potrafi zwrócić 200 przy 0 rows).
  const { data: still } = await (supabase as any)
    .from('featured_picks')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  return !still;
};

/** Aktualizuje hero w kolejce (edycja bez zmiany statusu queued). */
export const updateFeaturedPickById = async (id: number, pick: FeaturedPick): Promise<void> => {
  const wonAt = pick.status === 'won' ? new Date().toISOString() : pick.wonAt || null;

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
    won_at: wonAt,
    unlock_free: pick.unlockFree ?? false,
    queued: pick.queued ?? true,
  };
  if (pick.sport) {
    dataToSave.sport = pick.sport;
  }

  const { error } = await (supabase as any)
    .from('featured_picks')
    .update(dataToSave)
    .eq('id', id);

  if (error) throw new Error(error.message || "Unknown Supabase error");
};

// Cache hero w localStorage — przy kolejnych wejściach prawdziwy hero pojawia
// się NATYCHMIAST (stale-while-revalidate), bez mignięcia demo.
const HERO_CACHE_KEY = "gsb_hero_cache_v1";
let heroMemory: FeaturedPick | null | undefined;

export const getCachedFeaturedPick = (): FeaturedPick | null => {
  if (heroMemory !== undefined) return heroMemory;
  try {
    const raw = localStorage.getItem(HERO_CACHE_KEY);
    if (!raw) { heroMemory = null; return null; }
    const parsed = JSON.parse(raw);
    heroMemory = parsed && typeof parsed === "object" ? parsed : null;
    return heroMemory;
  } catch {
    heroMemory = null;
    return null;
  }
};

const setCachedFeaturedPick = (pick: FeaturedPick | null) => {
  heroMemory = pick;
  try {
    if (pick) localStorage.setItem(HERO_CACHE_KEY, JSON.stringify(pick));
    else localStorage.removeItem(HERO_CACHE_KEY);
  } catch { /* ignore */ }
};

export const loadFeaturedPick = async (): Promise<FeaturedPick | null> => {
  // Poczekalnia: bierzemy najnowszy wiersz, ktory NIE jest w kolejce
  // (queued=true znaczy "czeka na 3:00" i nie moze sie wyswietlac na stronie).
  const { data, error } = await supabase
    .from('featured_picks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error loading featured pick:", error);
    return getCachedFeaturedPick();
  }

  const row = ((data || []) as any[]).find((r: any) => r.queued !== true);
  if (!row) {
    setCachedFeaturedPick(null);
    return null;
  }

  const pick: FeaturedPick = {
    id: row.id,
    league: row.league,
    kickoff: row.kickoff,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    prediction: row.prediction,
    odds: row.odds,
    confidence: row.confidence,
    status: row.status || "upcoming",
    homeTeamLogo: row.home_team_logo,
    awayTeamLogo: row.away_team_logo,
    description: row.description,
    wonAt: row.won_at || null,
    sport: row.sport || null,
    unlockFree: row.unlock_free ?? false,
    queued: false,
  };
  setCachedFeaturedPick(pick);
  return pick;
};

export const saveFeaturedPick = async (pick: FeaturedPick): Promise<void> => {
  const wonAt = pick.status === 'won' ? new Date().toISOString() : null;

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
    won_at: wonAt,
    unlock_free: pick.unlockFree ?? false,
    // Poczekalnia: hero ukryty do 3:00
    queued: pick.queued ?? false,
  };

  // Kolejka: nowy queued wiersz NIE wypiera aktywnego hero (zostaje po nim).
  if (pick.queued) {
    const { error } = await (supabase as any).from('featured_picks').insert([dataToSave]);
    if (error) {
      console.error("Supabase error saving queued featured pick:", error);
      throw new Error(error.message || "Unknown Supabase error");
    }
    return;
  }

  // Tylko dodaj sport jezeli pole zostalo juz dodane do bazy (unika bledu PGRST204)
  if (pick.sport) {
    dataToSave.sport = pick.sport;
  }

  const { error } = await supabase
    .from('featured_picks')
    .insert([dataToSave]);

  if (error) {
    console.error("Supabase error saving featured pick:", error);
    // Jesli kolumna sport nie istnieje, sprobuj zapisac bez niej
    if (error.code === 'PGRST204' || error.message?.includes('sport') || error.message?.includes('unlock_free')) {
      console.warn("Kolumna nie istnieje w bazie - probuje zapisac bez niej...");
      const retryData = { ...dataToSave };
      delete retryData.sport;
      delete retryData.unlock_free;
      const { error: retryError } = await supabase.from('featured_picks').insert([retryData]);
      if (retryError) throw new Error(retryError.message || "Unknown Supabase error");
      return;
    }
    if (error.code === '42703' || error.message?.includes('column "status"')) {
      throw new Error("SQL_COLUMN_MISSING: status");
    }
    throw new Error(error.message || "Unknown Supabase error");
  }
};
