import { supabase } from "@/integrations/supabase/client";
import { Tip } from "@/components/TipCard";

const rpc = (fn: string, args?: Record<string, unknown>) => (supabase as any).rpc(fn, args);

// ---------------------------------------------------------------------------
// Daily streak (server for signed-in users, this device otherwise)
// ---------------------------------------------------------------------------
export interface StreakState {
  streak: number;
  rewarded: boolean;
  credits: number;
  local: boolean;
}

const LOCAL_KEY = "gsb_local_streak";
const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const localStreak = (): StreakState => {
  let s = { last: "", streak: 0 };
  try {
    s = JSON.parse(localStorage.getItem(LOCAL_KEY) || "") || s;
  } catch {
    /* empty */
  }
  if (s.last !== today()) {
    s = { last: today(), streak: s.last === yesterday() ? s.streak + 1 : 1 };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
    } catch {
      /* storage unavailable */
    }
  }
  return { streak: s.streak, rewarded: false, credits: 0, local: true };
};

/** Mark today's pack as opened and return the streak. Idempotent per day. */
export const recordDailyOpen = async (signedIn: boolean): Promise<StreakState> => {
  if (signedIn) {
    const { data, error } = await rpc("record_daily_open");
    if (!error && data) return { streak: data.streak, rewarded: !!data.rewarded, credits: data.credits ?? 0, local: false };
  }
  return localStreak();
};

// ---------------------------------------------------------------------------
// Free cards
// ---------------------------------------------------------------------------
export const loadCredits = async (userId: string): Promise<number> => {
  const { data } = await (supabase as any).from("unlock_credits").select("credits").eq("user_id", userId).maybeSingle();
  return data?.credits ?? 0;
};

export const redeemCredit = async (tipId: number) => {
  const { error } = await rpc("redeem_credit", { p_tip: tipId });
  if (error) throw new Error(error.message);
};

// ---------------------------------------------------------------------------
// Weekend passes (entitlement windows)
// ---------------------------------------------------------------------------
export interface TimeWindow {
  start: number;
  end: number;
}
export const loadWeekendPasses = async (userId: string): Promise<TimeWindow[]> => {
  const { data, error } = await (supabase as any).from("weekend_passes").select("starts_at, ends_at").eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r: { starts_at: string; ends_at: string }) => ({ start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) }));
};
export const coveredByPass = (tip: Pick<Tip, "kickoff">, passes: TimeWindow[]) => {
  const ko = Date.parse(tip.kickoff);
  return !isNaN(ko) && passes.some((p) => ko >= p.start && ko < p.end);
};

/** The weekend a pack bought now covers: Fri 00:00 UTC to Mon 06:00 UTC. */
export const currentWeekend = (now = new Date()): TimeWindow => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  const toFri = dow === 5 || dow === 6 ? -(dow - 5) : dow === 0 ? -2 : 5 - dow;
  const start = new Date(d.getTime() + toFri * 86400000);
  const end = new Date(start.getTime() + 3 * 86400000 + 6 * 3600000);
  return { start: start.getTime(), end: end.getTime() };
};
export const isWeekendTip = (tip: Pick<Tip, "kickoff">) => {
  const w = currentWeekend();
  const ko = Date.parse(tip.kickoff);
  return !isNaN(ko) && ko >= w.start && ko < w.end;
};

// ---------------------------------------------------------------------------
// Collection and track record
// ---------------------------------------------------------------------------
export const collectCard = async (userId: string, tipId: number) => {
  await (supabase as any).from("collected_cards").upsert({ user_id: userId, tip_id: tipId }, { onConflict: "user_id,tip_id", ignoreDuplicates: true });
};

export type AlbumCard = Tip & { collectedAt: string };

export const loadAlbum = async (): Promise<AlbumCard[]> => {
  const { data, error } = await rpc("get_my_album");
  if (error || !Array.isArray(data)) return [];
  return data.map((t: any) => ({
    id: Number(t.id),
    sport: t.sport,
    league: t.league,
    homeTeam: t.home_team,
    awayTeam: t.away_team,
    prediction: t.prediction ?? "",
    odds: t.odds == null ? 0 : Number(t.odds),
    kickoff: t.kickoff,
    status: ["won", "lost", "draw"].includes(t.status) ? t.status : "upcoming",
    isPremium: !!t.is_premium,
    homeTeamLogo: t.home_team_logo ?? null,
    awayTeamLogo: t.away_team_logo ?? null,
    masked: !!t.masked,
    tipster: t.tipster ?? null,
    collectedAt: t.collected_at,
  }));
};

export interface TrackRecord {
  days: number;
  total: number;
  won: number;
  lost: number;
  draw: number;
  units: number;
  series: { day: string; units: number }[];
}

export interface WeekLine {
  total: number;
  won: number;
  lost: number;
  draw: number;
  units: number;
}

/** This week's results (Monday to Sunday, UTC; resets every Monday). */
export interface WeekRecord extends WeekLine {
  weekStart: string;
  series: { day: string; units: number }[];
  tipsters: Record<string, WeekLine>;
}

const line = (d: any): WeekLine => ({
  total: Number(d?.total ?? 0),
  won: Number(d?.won ?? 0),
  lost: Number(d?.lost ?? 0),
  draw: Number(d?.draw ?? 0),
  units: Number(d?.units ?? 0),
});

let weekPromise: Promise<WeekRecord | null> | null = null;

/** Shared by every screen that shows the week; refetched after a minute. */
export const loadWeekRecord = (): Promise<WeekRecord | null> => {
  if (!weekPromise) {
    weekPromise = rpc("get_week_record").then(({ data, error }: any) => {
      if (error || !data) return null;
      const tipsters: Record<string, WeekLine> = {};
      Object.entries(data.tipsters ?? {}).forEach(([k, v]) => (tipsters[k] = line(v)));
      return {
        ...line(data),
        weekStart: String(data.week_start),
        series: (data.series ?? []).map((p: any) => ({ day: p.day, units: Number(p.units) })),
        tipsters,
      };
    });
    setTimeout(() => (weekPromise = null), 60_000);
  }
  return weekPromise;
};

/** Win rate in %, pushes not counted; null with nothing settled. */
export const winRate = (l: WeekLine) => (l.won + l.lost > 0 ? Math.round((l.won / (l.won + l.lost)) * 100) : null);

/** "16–22 Nov" for the week starting on `weekStart`. */
export const weekLabel = (weekStart: string) => {
  const a = new Date(weekStart + "T00:00:00Z");
  const b = new Date(a.getTime() + 6 * 864e5);
  const m = (d: Date) => d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${m(b)}`
    : `${a.getUTCDate()} ${m(a)} – ${b.getUTCDate()} ${m(b)}`;
};

export const loadTrackRecord = async (days: number): Promise<TrackRecord | null> => {
  const { data, error } = await rpc("get_track_record", { p_days: days });
  if (error || !data) return null;
  return { ...data, units: Number(data.units), series: (data.series ?? []).map((p: any) => ({ day: p.day, units: Number(p.units) })) };
};

// ---------------------------------------------------------------------------
// Results the user hasn't seen yet (for the WIN stamp + toast)
// ---------------------------------------------------------------------------
const SEEN_RESULTS = "gsb_seen_results";
/** Tips that settled since the last visit. Updates the stored snapshot. */
export const newlySettled = (tips: Tip[]): Tip[] => {
  let seen: Record<string, string> = {};
  try {
    seen = JSON.parse(localStorage.getItem(SEEN_RESULTS) || "{}");
  } catch {
    /* empty */
  }
  const fresh = tips.filter((t) => t.status !== "upcoming" && seen[t.id] === "upcoming");
  const next: Record<string, string> = {};
  tips.forEach((t) => (next[t.id] = t.status));
  try {
    localStorage.setItem(SEEN_RESULTS, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return fresh;
};
