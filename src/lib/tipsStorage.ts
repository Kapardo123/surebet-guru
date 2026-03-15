import { Tip } from "@/components/TipCard";
import { tips as defaultTips } from "@/data/tips";

const STORAGE_KEY = "tipstr_tips";

export const loadTips = (): Tip[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultTips;
};

export const saveTips = (tips: Tip[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tips));
};

export const addTip = (tip: Omit<Tip, "id">): Tip => {
  const tips = loadTips();
  const newTip: Tip = { ...tip, id: Date.now() };
  const updated = [newTip, ...tips];
  saveTips(updated);
  return newTip;
};

export const deleteTip = (id: number) => {
  const tips = loadTips();
  saveTips(tips.filter((t) => t.id !== id));
};

export const updateTip = (updatedTip: Tip) => {
  const tips = loadTips();
  saveTips(tips.map((t) => (t.id === updatedTip.id ? updatedTip : t)));
};
