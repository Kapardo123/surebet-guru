
import { supabase } from "@/integrations/supabase/client";

export interface CouponMatch {
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  league: string;
  sport: string;
  kickoff: string;
}

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

export const calculateTotalOdds = (matches: CouponMatch[]): number => {
  if (matches.length === 0) return 0;
  return matches.reduce((acc, m) => acc * m.odds, 1);
};

export const loadCoupons = async (): Promise<Coupon[]> => {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error loading coupons:", error);
    return [];
  }

  return (data || []).map(coupon => ({
    id: coupon.id,
    name: coupon.name,
    matches: coupon.matches,
    totalOdds: coupon.total_odds,
    stake: coupon.stake,
    status: coupon.status,
    createdAt: coupon.created_at,
    isPremium: coupon.is_premium
  }));
};

export const addCoupon = async (coupon: Omit<Coupon, "id" | "totalOdds" | "createdAt">): Promise<Coupon | null> => {
  const totalOdds = calculateTotalOdds(coupon.matches);
  const { data, error } = await supabase
    .from('coupons')
    .insert([{
      name: coupon.name,
      matches: coupon.matches,
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
    matches: data.matches,
    totalOdds: data.total_odds,
    stake: data.stake,
    status: data.status,
    createdAt: data.created_at,
    isPremium: data.is_premium
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
      matches: updatedCoupon.matches,
      total_odds: totalOdds,
      stake: updatedCoupon.stake,
      status: updatedCoupon.status,
      is_premium: updatedCoupon.isPremium
    })
    .eq('id', updatedCoupon.id);

  if (error) console.error("Error updating coupon:", error);
};
