import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FunnelRow, loadFunnel } from "@/lib/analytics";
import { TrackRecord, loadTrackRecord } from "@/lib/engagement";

// The path from opening the app to paying, in order.
const STEPS: { name: string; label: string }[] = [
  { name: "app_open", label: "Opened the app" },
  { name: "pack_opened", label: "Opened today's pack" },
  { name: "card_inspected", label: "Looked at a card" },
  { name: "unlock_sheet_opened", label: "Tapped a Gold card" },
  { name: "unlock_started", label: "Started a $0.99 unlock" },
  { name: "unlock_succeeded", label: "Unlocked a card" },
  { name: "plan_checkout_started", label: "Started a Gold checkout" },
  { name: "plan_purchased", label: "Bought Gold" },
];

const OTHER = [
  "onboarding_completed", "onboarding_skipped", "weekend_pack_started", "free_card_used",
  "streak_reward", "card_shared", "invite_shared", "pick_of_day_revealed",
];

/** Admin dashboard: conversion funnel from analytics events + track record. */
const AdminStats = () => {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<FunnelRow[] | null | undefined>(undefined);
  const [record, setRecord] = useState<TrackRecord | null>(null);

  useEffect(() => {
    setRows(undefined);
    loadFunnel(days).then(setRows);
    loadTrackRecord(days).then(setRecord);
  }, [days]);

  const by = new Map((rows ?? []).map((r) => [r.name, r]));
  const top = by.get("app_open")?.people || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black uppercase text-[18px]">Stats</h2>
        <div className="flex p-0.5 rounded-full bg-black/25">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`h-8 px-3 rounded-full text-[12.5px] font-bold ${days === d ? "bg-foreground text-background" : "text-foreground/70"}`}
            >
              {d === 1 ? "24h" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {record && record.total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Win rate", `${record.won + record.lost ? Math.round((record.won / (record.won + record.lost)) * 100) : 0}%`],
            ["Units", `${record.units > 0 ? "+" : ""}${record.units.toFixed(1)}`],
            ["W-L-P", `${record.won}-${record.lost}-${record.draw}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[14px] bg-white/[0.05] border border-white/[0.07] px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{k}</p>
              <p className="num font-black text-[20px] mt-1 whitespace-nowrap">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.08] p-4">
        <p className="label">Funnel · people</p>
        {rows === undefined ? (
          <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : rows === null ? (
          <p className="text-[14px] text-muted-foreground mt-3">Run the 20261118c_events migration to start collecting events.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {STEPS.map((st) => {
              const r = by.get(st.name);
              const people = r?.people ?? 0;
              const pct = top ? Math.round((people / top) * 100) : 0;
              return (
                <li key={st.name}>
                  <div className="flex items-baseline justify-between text-[13.5px]">
                    <span>{st.label}</span>
                    <span className="font-semibold tabular-nums">
                      {people} <span className="text-muted-foreground font-normal">· {pct}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/[0.07] overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, people ? 2 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {rows && rows.length > 0 && (
        <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.08] p-4">
          <p className="label">Other events</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {OTHER.map((n) => (
              <div key={n} className="flex justify-between gap-2">
                <dt className="text-muted-foreground truncate">{n.replace(/_/g, " ")}</dt>
                <dd className="font-semibold tabular-nums">{by.get(n)?.events ?? 0}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};

export default AdminStats;
