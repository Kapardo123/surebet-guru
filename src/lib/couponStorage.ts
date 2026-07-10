
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface CouponMatch {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  league: string;
  sport: string;
  kickoff: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
}

const COUPONS_CACHE_KEY = "gsb_coupons_cache";

const getCachedCoupons = (): Coupon[] => {
  try {
    const cached = localStorage.getItem(COUPONS_CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
};

const setCachedCoupons = (coupons: Coupon[]) => {
  try {
    localStorage.setItem(COUPONS_CACHE_KEY, JSON.stringify(coupons));
  } catch (e) {}
};

export interface Coupon {
  id: number;
  name: string;
  matches: CouponMatch[];
  totalOdds: number;
  stake?: number;
  status: "active" | "won" | "lost" | "pending";
  createdAt: string;
  isPremium?: boolean;
  wonAt?: string | null; // ISO timestamp kiedy kupon wygrał
}

const isCouponStatus = (value: unknown): value is Coupon["status"] =>
  value === "active" || value === "won" || value === "lost" || value === "pending";

const serializeMatches = (matches: CouponMatch[]): Json => {
  return matches.map((m) => ({
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    prediction: m.prediction,
    odds: m.odds,
    league: m.league,
    sport: m.sport,
    kickoff: m.kickoff,
    homeTeamLogo: m.homeTeamLogo,
    awayTeamLogo: m.awayTeamLogo,
  })) as unknown as Json;
};

const deserializeMatches = (value: Json): CouponMatch[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const obj = raw as Record<string, unknown>;
        const homeTeam = typeof obj.homeTeam === "string" ? obj.homeTeam : "";
        const awayTeam = typeof obj.awayTeam === "string" ? obj.awayTeam : "";
        const prediction = typeof obj.prediction === "string" ? obj.prediction : "";
        const odds = typeof obj.odds === "number" ? obj.odds : Number(obj.odds);
        const league = typeof obj.league === "string" ? obj.league : "";
        const sport = typeof obj.sport === "string" ? obj.sport : "Football";
        const kickoff = typeof obj.kickoff === "string" ? obj.kickoff : "";
        const homeTeamLogo = typeof obj.homeTeamLogo === "string" ? obj.homeTeamLogo : null;
        const awayTeamLogo = typeof obj.awayTeamLogo === "string" ? obj.awayTeamLogo : null;
        if (!homeTeam || !awayTeam || !prediction || !Number.isFinite(odds)) return null;
        return { 
          homeTeam, awayTeam, prediction, odds, league, sport, kickoff,
          homeTeamLogo, awayTeamLogo 
        } satisfies CouponMatch;
      }
      return null;
    })
    .filter((m): m is CouponMatch => m !== null);
};

export const calculateTotalOdds = (matches: CouponMatch[]): number => {
  if (matches.length === 0) return 0;
  return matches.reduce((acc, m) => acc * m.odds, 1);
};

export const loadCoupons = async (): Promise<Coupon[]> => {
  const cached = getCachedCoupons();

  console.log('🎫 loadCoupons: Start - cache:', cached.length);

  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    console.log('🎫 loadCoupons: Supabase response:', { data: data?.length || 0, error: error?.message || 'none' });

    if (error) {
      console.error("❌ Error loading coupons:", error.code, error.message, error.details);
      
      // Fallback do cache jeśli jest
      if (cached.length > 0) {
        console.log('🎫 loadCoupons: Używam cache:', cached.length, 'kuponów');
        return cached;
      }
      
      // Spróbuj pobrać publiczne kupony (bez RLS)
      try {
        const { data: publicData, error: publicError } = await supabase
          .rpc('get_public_coupons')
          .limit(30);
        
        if (!publicError && publicData) {
          console.log('🎫 loadCoupons: Pobrano publiczne kupony:', publicData.length);
          const coupons = processCouponData(publicData);
          setCachedCoupons(coupons);
          return coupons;
        }
      } catch (e) {
        console.warn('🎫 loadCoupons: Public RPC failed:', e);
      }
      
      return cached;
    }

    if (!data || data.length === 0) {
      console.log('🎫 loadCoupons: Brak danych z Supabase');
      return cached;
    }

    console.log('🎫 loadCoupons: Pobrano z bazy:', data.length, 'rekordów');
    
    const coupons = processCouponData(data);
    setCachedCoupons(coupons);
    console.log('🎫 loadCoupons: Zwracam', coupons.length, 'kuponów');
    return coupons;
    
  } catch (err) {
    console.error('❌ loadCoupons: Critical error:', err);
    return cached;
  }
};

const processCouponData = (data: any[]): Coupon[] => {
  return (data || []).map((coupon, index) => {
    console.log(`🎫 Processing coupon ${index}:`, {
      id: coupon.id,
      name: coupon.name,
      status: coupon.status,
      is_premium: coupon.is_premium,
      matches_count: Array.isArray(coupon.matches) ? coupon.matches.length : 0
    });
    
    const matches = deserializeMatches(coupon.matches);
    console.log(`🎫 Coupon ${index} matches deserialized:`, matches.length);
    
    const status = isCouponStatus(coupon.status) ? coupon.status : "active";
    return {
      id: coupon.id,
      name: coupon.name || `Coupon #${coupon.id}`,
      matches: matches,
      totalOdds: Number(coupon.total_odds) || calculateTotalOdds(matches),
      stake: coupon.stake ?? undefined,
      status,
      createdAt: coupon.created_at || new Date().toISOString(),
      isPremium: coupon.is_premium ?? false,
      wonAt: coupon.won_at || null,
    };
  }).filter(coupon => {
    const isValid = coupon.name && coupon.matches.length > 0;
    if (!isValid) {
      console.warn('🎫 Invalid coupon filtered:', coupon.id, coupon.name, 'matches:', coupon.matches.length);
    }
    return isValid;
  });
};

export const addCoupon = async (coupon: Omit<Coupon, "id" | "totalOdds" | "createdAt">): Promise<Coupon | null> => {
  const totalOdds = calculateTotalOdds(coupon.matches);
  // Automatycznie ustawiaj won_at gdy status = "won"
  const wonAt = coupon.status === 'won' ? new Date().toISOString() : null;

  const { data, error } = await supabase
    .from('coupons')
    .insert([{
      name: coupon.name,
      matches: serializeMatches(coupon.matches),
      total_odds: totalOdds,
      stake: coupon.stake,
      status: coupon.status,
      is_premium: coupon.isPremium,
      won_at: wonAt
    }])
    .select()
    .single();

  if (error) {
    console.error("Error adding coupon:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    matches: deserializeMatches(data.matches),
    totalOdds: Number(data.total_odds),
    stake: data.stake ?? undefined,
    status: isCouponStatus(data.status) ? data.status : "active",
    createdAt: data.created_at,
    isPremium: data.is_premium ?? undefined,
    wonAt: data.won_at || null,
  };
};

export const deleteCoupon = async (id: number) => {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', id);
  
  if (error) console.error("Error deleting coupon:", error);
};

export const updateCoupon = async (updatedCoupon: Coupon) => {
  const totalOdds = calculateTotalOdds(updatedCoupon.matches);
  // Automatycznie ustawiaj won_at gdy status = "won"
  const wonAt = updatedCoupon.status === 'won' ? new Date().toISOString() : null;

  console.log('📝 Updating coupon:', updatedCoupon.id, 'Status:', updatedCoupon.status, 'wonAt:', wonAt);

  const { error } = await supabase
    .from('coupons')
    .update({
      name: updatedCoupon.name,
      matches: serializeMatches(updatedCoupon.matches),
      total_odds: totalOdds,
      stake: updatedCoupon.stake,
      status: updatedCoupon.status,
      is_premium: updatedCoupon.isPremium,
      won_at: wonAt
    })
    .eq('id', updatedCoupon.id);

  if (error) {
    console.error("❌ Error updating coupon:", error);
    return false;
  }

  console.log('✅ Coupon updated successfully:', updatedCoupon.id);
  return true;
};
