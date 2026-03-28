
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

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error("Error loading coupons:", error);
    return cached;
  }

  const coupons = (data || []).map((coupon) => {
    const status = isCouponStatus(coupon.status) ? coupon.status : "active";
    return {
      id: coupon.id,
      name: coupon.name,
      matches: deserializeMatches(coupon.matches),
      totalOdds: Number(coupon.total_odds),
      stake: coupon.stake ?? undefined,
      status,
      createdAt: coupon.created_at,
      isPremium: coupon.is_premium ?? undefined,
    };
  });

  setCachedCoupons(coupons);
  return coupons;
};

export const addCoupon = async (coupon: Omit<Coupon, "id" | "totalOdds" | "createdAt">): Promise<Coupon | null> => {
  const totalOdds = calculateTotalOdds(coupon.matches);
  const { data, error } = await supabase
    .from('coupons')
    .insert([{
      name: coupon.name,
      matches: serializeMatches(coupon.matches),
      total_odds: totalOdds,
      stake: coupon.stake,
      status: coupon.status,
      is_premium: coupon.isPremium
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
    isPremium: data.is_premium ?? undefined
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
  const { error } = await supabase
    .from('coupons')
    .update({
      name: updatedCoupon.name,
      matches: serializeMatches(updatedCoupon.matches),
      total_odds: totalOdds,
      stake: updatedCoupon.stake,
      status: updatedCoupon.status,
      is_premium: updatedCoupon.isPremium
    })
    .eq('id', updatedCoupon.id);

  if (error) console.error("Error updating coupon:", error);
};
