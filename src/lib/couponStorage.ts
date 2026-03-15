

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

const STORAGE_KEY = "tipstr_coupons";

export const calculateTotalOdds = (matches: CouponMatch[]): number => {
  if (matches.length === 0) return 0;
  return matches.reduce((acc, m) => acc * m.odds, 1);
};

const defaultCoupons: Coupon[] = [
  {
    id: 1,
    name: "Weekend Combo 🔥",
    matches: [
      { homeTeam: "Barcelona", awayTeam: "Real Madrid", prediction: "Over 2.5 Goals", odds: 1.72, league: "La Liga", sport: "Football", kickoff: "Saturday, 21:00" },
      { homeTeam: "Manchester City", awayTeam: "Arsenal", prediction: "BTTS Yes", odds: 1.85, league: "Premier League", sport: "Football", kickoff: "Sunday, 17:30" },
      { homeTeam: "Bayern Munich", awayTeam: "Borussia Dortmund", prediction: "Bayern Win", odds: 1.55, league: "Bundesliga", sport: "Football", kickoff: "Saturday, 18:30" },
    ],
    totalOdds: +(1.72 * 1.85 * 1.55).toFixed(2),
    stake: 10,
    status: "active",
    createdAt: new Date().toISOString(),
    isPremium: false,
  },
];

export const loadCoupons = (): Coupon[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultCoupons;
};

export const saveCoupons = (coupons: Coupon[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
};

export const addCoupon = (coupon: Omit<Coupon, "id" | "totalOdds" | "createdAt">): Coupon => {
  const coupons = loadCoupons();
  const newCoupon: Coupon = {
    ...coupon,
    id: Date.now(),
    totalOdds: calculateTotalOdds(coupon.matches),
    createdAt: new Date().toISOString(),
  };
  saveCoupons([newCoupon, ...coupons]);
  return newCoupon;
};

export const deleteCoupon = (id: number) => {
  const coupons = loadCoupons();
  saveCoupons(coupons.filter((c) => c.id !== id));
};

export const updateCoupon = (updatedCoupon: Coupon) => {
  const coupons = loadCoupons();
  saveCoupons(coupons.map((c) => (c.id === updatedCoupon.id ? updatedCoupon : c)));
};
