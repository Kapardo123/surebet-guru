const PREMIUM_KEY = "tipstr_premium";

export interface PremiumData {
  activatedAt: string;
  durationDays: number;
}

export const activatePremium = (days: number) => {
  const data: PremiumData = {
    activatedAt: new Date().toISOString(),
    durationDays: days,
  };
  localStorage.setItem(PREMIUM_KEY, JSON.stringify(data));
};

export const getPremiumStatus = (): { active: boolean; daysLeft: number } => {
  try {
    const stored = localStorage.getItem(PREMIUM_KEY);
    if (!stored) return { active: false, daysLeft: 0 };
    const data: PremiumData = JSON.parse(stored);
    const activated = new Date(data.activatedAt);
    const expiresAt = new Date(activated.getTime() + data.durationDays * 86400000);
    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000));
    return { active: daysLeft > 0, daysLeft };
  } catch {
    return { active: false, daysLeft: 0 };
  }
};

export const clearPremium = () => {
  localStorage.removeItem(PREMIUM_KEY);
};
