import { supabase } from "@/integrations/supabase/client";
import { Tip } from "@/components/TipCard";

export type { Tip };

const isTipStatus = (value: unknown): value is Tip["status"] =>
  value === "upcoming" || value === "won" || value === "lost" || value === "draw" || value === "void";

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

const clearTipsCache = () => {
  try {
    localStorage.removeItem(TIPS_CACHE_KEY);
    console.log('🗑️ Tips cache cleared');
  } catch (e) {
    console.error('Error clearing tips cache:', e);
  }
};

// ---- Trwale usuwanie starych meczow (retencja 48h) ----
// Mecze znikaja ze strony glownej po zakonczeniu dnia, ale z BAZY nie sa
// kasowane po 8h — najpierw (o 3:00, cron settle-results) trafiaja do
// archiwum match_results ("Yesterday's Results"), dopiero potem moga byc
// usuniete. purge_old_tips (SQL) dodatkowo strzeze: usuwa wylacznie wiersze
// juz zarchiwizowane (bardzo stare — po 7 dniach — kasuje zawsze).
export const EXPIRY_HOURS = 48;
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;

/** Czas referencyjny meczu — zawsze kickoff (odliczanie od godziny rozpoczęcia meczu). */
const tipReferenceTime = (tip: Pick<Tip, "kickoff">): number => {
  const k = new Date(tip.kickoff).getTime();
  return isNaN(k) ? NaN : k;
};

/** Czy mecz jest starszy niz 8h od kickoff. */
export const isTipExpired = (
  tip: Pick<Tip, "kickoff">,
  now: number = Date.now()
): boolean => {
  const ref = tipReferenceTime(tip);
  if (isNaN(ref)) return false; // brak wiarygodnego czasu - nie usuwamy
  return now - ref > EXPIRY_MS;
};

/**
 * Trwale usuwa wygasle mecze (>8h): z bazy Supabase (RPC `purge_old_tips`,
 * SECURITY DEFINER - dziala niezaleznie od RLS dla klucza anon) oraz z
 * lokalnego cache. Zwraca liczbe usunietych wierszy z bazy (-1 = RPC niedostepne).
 */
/**
 * Wiek tipa liczony jak w migracji purge_old_tips.sql:
 * dla status = "won" od won_at, dla pozostałych od kickoff.
 */
export const isTipExpiredByRule = (
  tip: Pick<Tip, "kickoff" | "status" | "wonAt">,
  now: number = Date.now()
): boolean => {
  // Wygrane liczą swoje 8h od momentu oznaczenia jako won...
  if (tip.status === "won" && tip.wonAt) {
    const w = new Date(tip.wonAt).getTime();
    if (!isNaN(w)) return now - w > EXPIRY_MS;
  }
  // ...reszta od rozpoczęcia meczu.
  return isTipExpired(tip, now);
};

/** Identyfikatory opublikowanych, już wygasłych tipów w danej paczce. */
const expiredIdsOf = (rows: any[]): number[] =>
  rows
    .filter(
      (t) =>
        t.is_published !== false &&
        isTipExpiredByRule({
          kickoff: t.kickoff,
          status: t.status,
          wonAt: t.won_at || null,
        }),
    )
    .map((t) => Number(t.id))
    .filter(Number.isFinite);

export const purgeExpiredTips = async (): Promise<number> => {
  // 1) Usun z bazy (wymaga wdrozonej migracji purge_old_tips.sql)
  let dbDeleted = -1;
  try {
    const { data, error } = await (supabase as any).rpc("purge_old_tips", {
      expiry_hours: EXPIRY_HOURS,
    });
    if (error) {
      console.warn("purge_old_tips RPC niedostepne (wdroz migracje):", error.message);
    } else {
      dbDeleted = typeof data === "number" ? data : -1;
      if (dbDeleted > 0) console.log("[purge] Purged " + dbDeleted + " expired tips from DB");
    }
  } catch (e) {
    console.warn("purgeExpiredTips RPC error:", e);
  }

  // 2) Fallback gdy RPC nie istnieje: usuwamy wygasle wiersze klientem tym
  //    samym uprawnieniem, ktorego uzywa przycisk Delete w panelu admina.
  //    Published Tips znika wtedy tak samo, bez czekania na migracje.
  if (dbDeleted < 0) {
    try {
      const { data: rows, error } = await supabase
        .from("tips")
        .select("id, kickoff, status, is_published, won_at");
      if (!error && rows?.length) {
        const ids = expiredIdsOf(rows);
        if (ids.length) {
          const { error: delError } = await supabase
            .from("tips")
            .delete()
            .in("id", ids);
          if (!delError) {
            dbDeleted = ids.length;
            console.log("[purge] Client-side deleted " + ids.length + " expired tips");
          } else {
            console.warn("[purge] Client-side delete blocked:", delError.message);
          }
        }
      }
    } catch (e) {
      console.warn("[purge] client-side fallback error:", e);
    }
  }

  // 3) Wyczysc lokalny cache z wygaslych (zawsze dziala, rowniez offline)
  try {
    const cached = getCachedTips();
    if (cached.length) {
      const now = Date.now();
      const fresh = cached.filter((t) => !isTipExpiredByRule(t, now));
      if (fresh.length !== cached.length) {
        setCachedTips(fresh);
        console.log("[purge] Removed " + (cached.length - fresh.length) + " expired tips from local cache");
      }
    }
  } catch (e) {
    console.warn("cache purge error:", e);
  }

  return dbDeleted;
};


export const loadTips = async (publishedOnly: boolean = true, forceRefresh: boolean = false): Promise<Tip[]> => {
  // Purge w TLE — nie blokuje renderu tipów (widoczne od razu, sprzątanie
  // wygasłych leci asynchronicznie).
  purgeExpiredTips().catch(() => {});

  // Jeśli forceRefresh - pomijamy cache całkowicie
  const cached = forceRefresh ? [] : getCachedTips();

  console.log(`📦 Loading tips (published: ${publishedOnly}, force: ${forceRefresh}, cached: ${cached.length})`);

  let query = supabase
    .from('tips')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (publishedOnly) {
    query = query.eq('is_published', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error loading tips:", error);
    
    if (error.code === '42703' || error.message?.includes('is_published')) {
      console.log("Column is_published does not exist, loading all tips...");
      const { data: allData, error: allError } = await supabase
        .from('tips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!allError && allData) {
        const tips = allData.map((tip: any) => ({
          id: tip.id,
          sport: tip.sport,
          league: tip.league,
          homeTeam: tip.home_team,
          awayTeam: tip.away_team,
          prediction: tip.prediction,
          odds: Number(tip.odds),
          kickoff: tip.kickoff,
          status: isTipStatus(tip.status) ? tip.status : "upcoming",
          isPremium: tip.is_premium ?? undefined,
          homeTeamLogo: tip.home_team_logo || null,
          awayTeamLogo: tip.away_team_logo || null,
          description: tip.description || null,
          likesCount: tip.likes_count || 0,
          isPublished: true,
          wonAt: tip.won_at || null,
        }));
        
        setCachedTips(tips);
        return tips;
      }
    }
    
    return cached;
  }

  // Tarcza bezpieczeństwa: nawet gdy usuwanie z bazy nie jest mozliwe
  // (RLS/brak RPC), wygasle tipy nigdy nie trafiaja do stanu "Published Tips".
  const now = Date.now();
  const tips = (data || [])
    .filter(
      (tip: any) =>
        tip.is_published !== false &&
        !isTipExpiredByRule({
          kickoff: tip.kickoff,
          status: tip.status,
          wonAt: tip.won_at || null,
        }, now),
    )
    .map((tip: any) => ({
    id: tip.id,
    sport: tip.sport,
    league: tip.league,
    homeTeam: tip.home_team,
    awayTeam: tip.away_team,
    prediction: tip.prediction,
    odds: Number(tip.odds),
    kickoff: tip.kickoff,
    status: isTipStatus(tip.status) ? tip.status : "upcoming",
    isPremium: tip.is_premium ?? undefined,
    homeTeamLogo: tip.home_team_logo || null,
    awayTeamLogo: tip.away_team_logo || null,
    description: tip.description || null,
    likesCount: tip.likes_count || 0,
    isPublished: tip.is_published ?? true,
    wonAt: tip.won_at || null,
  }));

  if (publishedOnly) {
    setCachedTips(tips);
  }
  return tips;
};

export const loadDraftTips = async (): Promise<Tip[]> => {
  const { data, error } = await (supabase as any)
    .from('tips')
    .select('*')
    .eq('is_published', false)
    .eq('queued', false)
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback dla bazy bez kolumny queued
    const { data: fallback, error: fallbackError } = await supabase
      .from('tips')
      .select('*')
      .eq('is_published', false)
      .order('created_at', { ascending: false });
    if (fallbackError) {
      console.error("Error loading draft tips:", fallbackError);
      return [];
    }
    return mapDraftRows(fallback || []);
  }

  return mapDraftRows(data || []);
};

const mapDraftRows = (rows: any[]): Tip[] =>
  rows.map((tip: any) => ({
    id: tip.id,
    sport: tip.sport,
    league: tip.league,
    homeTeam: tip.home_team,
    awayTeam: tip.away_team,
    prediction: tip.prediction,
    odds: Number(tip.odds),
    kickoff: tip.kickoff,
    status: isTipStatus(tip.status) ? tip.status : "upcoming",
    isPremium: tip.is_premium ?? undefined,
    homeTeamLogo: tip.home_team_logo || null,
    awayTeamLogo: tip.away_team_logo || null,
    description: tip.description || null,
    likesCount: tip.likes_count || 0,
    isPublished: false,
    queued: !!tip.queued,
  }));

/** Poczekalnia: tipy czekające na automatyczną publikację o 3:00. */
export const loadQueuedTips = async (): Promise<Tip[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('tips')
      .select('*')
      .eq('queued', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error loading queued tips:", error);
      return [];
    }

    return (data || []).map((tip: any) => ({
      id: tip.id,
      sport: tip.sport,
      league: tip.league,
      homeTeam: tip.home_team,
      awayTeam: tip.away_team,
      prediction: tip.prediction,
      odds: Number(tip.odds),
      kickoff: tip.kickoff,
      status: isTipStatus(tip.status) ? tip.status : "upcoming",
      isPremium: tip.is_premium ?? undefined,
      homeTeamLogo: tip.home_team_logo || null,
      awayTeamLogo: tip.away_team_logo || null,
      description: tip.description || null,
      likesCount: tip.likes_count || 0,
      isPublished: false,
      queued: true,
    }));
  } catch (e) {
    console.error("Error loading queued tips:", e);
    return [];
  }
};

export const publishAllDrafts = async (): Promise<number> => {
  const { data, error } = await (supabase as any)
    .from('tips')
    .update({ is_published: true, queued: false })
    .eq('is_published', false)
    .eq('queued', false)
    .select('id');

  if (error) {
    console.error("Error publishing drafts:", error);
    return 0;
  }

  localStorage.removeItem(TIPS_CACHE_KEY);
  return data?.length || 0;
};

export const publishTipById = async (id: number): Promise<boolean> => {
  const { error } = await (supabase as any)
    .from('tips')
    .update({ is_published: true, queued: false })
    .eq('id', id);

  if (error) {
    console.error("Error publishing tip:", error);
    return false;
  }

  localStorage.removeItem(TIPS_CACHE_KEY);
  return true;
};

/** Wycofuje tip z poczekalni z powrotem do zwykłego szkicu. */
export const unqueueTipById = async (id: number): Promise<boolean> => {
  const { error } = await (supabase as any)
    .from('tips')
    .update({ queued: false })
    .eq('id', id);

  if (error) {
    console.error("Error unqueuing tip:", error);
    return false;
  }

  localStorage.removeItem(TIPS_CACHE_KEY);
  return true;
};

export const unpublishTipById = async (id: number): Promise<boolean> => {
  const { error } = await supabase
    .from('tips')
    .update({ is_published: false })
    .eq('id', id);

  if (error) {
    console.error("Error unpublishing tip:", error);
    return false;
  }

  localStorage.removeItem(TIPS_CACHE_KEY);
  return true;
};

export const addTip = async (tip: Omit<Tip, "id"> & { isPublished?: boolean; queued?: boolean }): Promise<Tip | null> => {
  // Automatycznie ustawiaj won_at gdy status = "won"
  const wonAt = tip.status === 'won' ? new Date().toISOString() : null;
  // Poczekalnia: queued tip jest niewidoczny (is_published=false) do 3:00
  const isPublished = tip.queued ? false : (tip.isPublished !== undefined ? tip.isPublished : true);

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
      is_published: isPublished,
      queued: !!tip.queued,
      home_team_logo: tip.homeTeamLogo,
      away_team_logo: tip.awayTeamLogo,
      description: tip.description,
      likes_count: tip.likesCount || 0,
      won_at: wonAt
    }])
    .select()
    .single();

  if (error) {
    console.error("Error adding tip:", error);
    return null;
  }

  // Czyść cache po dodaniu - wymuś pobranie świeżych danych
  clearTipsCache();
  console.log('✅ Tip added successfully');

  const record = data as any;

  return {
    id: record.id,
    sport: record.sport,
    league: record.league,
    homeTeam: record.home_team,
    awayTeam: record.away_team,
    prediction: record.prediction,
    odds: Number(record.odds),
    kickoff: record.kickoff,
    status: isTipStatus(record.status) ? record.status : "upcoming",
    isPremium: record.is_premium ?? undefined,
    homeTeamLogo: record.home_team_logo,
    awayTeamLogo: record.away_team_logo,
    description: record.description,
    likesCount: record.likes_count || 0,
    isPublished: record.is_published ?? true,
    queued: !!record.queued,
  };
};

export const deleteTip = async (id: number) => {
  const { error } = await supabase
    .from('tips')
    .delete()
    .eq('id', id);
  
  if (error) console.error("Error deleting tip:", error);
};

export const updateTip = async (updatedTip: Tip & { isPublished?: boolean; queued?: boolean }) => {
  // Automatycznie ustawiaj won_at gdy status = "won"
  const wonAt = updatedTip.status === 'won' ? new Date().toISOString() : null;
  const isPublished = updatedTip.queued ? false : (updatedTip.isPublished !== undefined ? updatedTip.isPublished : true);

  console.log('📝 Updating tip:', updatedTip.id, 'Status:', updatedTip.status, 'wonAt:', wonAt);

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
      is_published: isPublished,
      queued: !!updatedTip.queued,
      home_team_logo: updatedTip.homeTeamLogo,
      away_team_logo: updatedTip.awayTeamLogo,
      description: updatedTip.description,
      likes_count: updatedTip.likesCount,
      won_at: wonAt
    })
    .eq('id', updatedTip.id);

  if (error) {
    console.error("❌ Error updating tip:", error);
    return false;
  }

  // Czyść cache po aktualizacji - wymuś pobranie świeżych danych
  clearTipsCache();
  console.log('✅ Tip updated successfully:', updatedTip.id);
  return true;
};