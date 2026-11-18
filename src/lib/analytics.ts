import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight product analytics stored in Supabase (`events` table).
 * Events are queued and sent in small batches; nothing personal beyond the
 * user id (when signed in) and a random per-device id is recorded.
 */
export type EventName =
  | "app_open"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "pack_opened"
  | "card_inspected"
  | "unlock_sheet_opened"
  | "unlock_started"
  | "unlock_succeeded"
  | "free_card_used"
  | "weekend_pack_started"
  | "plan_checkout_started"
  | "plan_purchased"
  | "streak_reward"
  | "card_shared"
  | "invite_shared"
  | "pick_of_day_revealed";

const ANON_KEY = "gsb_anon_id";
let queue: { name: string; props: Record<string, unknown> | null; anon_id: string; user_id: string | null; created_at: string }[] = [];
let timer: number | undefined;
let userId: string | null = null;

const anonId = () => {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "no-storage";
  }
};

supabase.auth.onAuthStateChange((_e, session) => {
  userId = session?.user?.id ?? null;
});

const flush = async () => {
  timer = undefined;
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  try {
    await (supabase as any).from("events").insert(batch);
  } catch {
    /* analytics must never break the app */
  }
};

export const track = (name: EventName, props?: Record<string, unknown>) => {
  if (import.meta.env.MODE === "test") return;
  queue.push({ name, props: props ?? null, anon_id: anonId(), user_id: userId, created_at: new Date().toISOString() });
  if (queue.length >= 20) flush();
  else if (!timer) timer = window.setTimeout(flush, 4000);
};

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

// ---------------------------------------------------------------------------
// Admin: conversion funnel
// ---------------------------------------------------------------------------
export interface FunnelRow {
  name: string;
  events: number;
  people: number;
}

export const loadFunnel = async (days: number): Promise<FunnelRow[] | null> => {
  const { data, error } = await (supabase as any).rpc("get_event_funnel", { p_days: days });
  if (error || !Array.isArray(data)) return null;
  return data.map((r: any) => ({ name: r.name, events: Number(r.events), people: Number(r.people) }));
};
