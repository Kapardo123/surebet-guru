import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { WeekLine, WeekRecord, loadWeekRecord, weekLabel, winRate } from "@/lib/engagement";
import { TIPSTERS, Tipster } from "@/lib/tipsters";
import stadium from "@/assets/textures/stadium-night.webp";
import mark from "@/assets/brand/mark.svg";

/** A tipster as a "player card" in the same style as the picks. */
const TipsterCard = ({ t, week }: { t: Tipster; week?: WeekLine | null }) => (
  <article
    className="rounded-[18px] p-[5px] bevel"
    style={{
      backgroundColor: t.color,
      backgroundImage: "linear-gradient(145deg, rgba(255,255,255,.35), transparent 40%, transparent 60%, rgba(0,0,0,.35))",
    }}
  >
    <div className="relative h-full rounded-[14px] paper bg-stock text-stock-ink overflow-hidden flex flex-col">
      <span className="pointer-events-none absolute inset-[3px] rounded-[11px] border border-stock-ink/10" aria-hidden />

      {/* Portrait window: monogram on the stadium */}
      <div className="relative m-[7px] h-[118px] rounded-[9px] overflow-hidden ring-1 ring-black/20">
        <img src={stadium} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${t.color}55, transparent 55%), radial-gradient(circle at 50% 120%, ${t.color}aa, transparent 60%)` }} />
        <div className="relative h-full grid place-items-center">
          <span
            className="grid place-items-center w-[80px] h-[80px] rounded-full overflow-hidden"
            style={{ boxShadow: `0 0 0 3px #f3efe4, 0 0 0 6px ${t.color}, 0 10px 24px rgba(0,0,0,.5)` }}
            aria-hidden
          >
            <img src={mark} alt="" className="w-full h-full" />
          </span>
        </div>
        <span className="absolute left-2 top-1.5 font-display font-black text-[8px] tracking-[0.1em] text-white/75">GSB · TIPSTER</span>
      </div>

      {/* Name ribbon */}
      <div
        className="relative -mt-3 mx-[3px] px-3 py-1.5 text-center bg-[linear-gradient(180deg,hsl(232_32%_20%),hsl(232_38%_12%))] shadow-[0_3px_6px_rgba(0,0,0,.25)]"
        style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 7px) 50%, 100% 100%, 0 100%, 7px 50%)" }}
      >
        <h3 className="font-display font-black uppercase text-[17px] leading-none text-white">{t.nick}</h3>
        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] mt-1" style={{ color: "#f6dc8a" }}>{t.role}</p>
      </div>

      {week !== undefined && <WeekStrip line={week} color={t.color} />}

      <div className="px-3 pt-3 pb-3 flex-1 flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1">
          {t.focus.map((f) => (
            <span key={f} className="h-5 px-2 rounded-full text-[10px] font-semibold grid place-items-center bg-stock-ink/[0.07]">
              {f}
            </span>
          ))}
        </div>
        <p className="text-[12.5px] leading-[1.45] text-stock-ink/80">{t.style}</p>
        <div className="mt-auto rounded-[8px] pl-3 pr-2 py-2 relative overflow-hidden" style={{ background: `${t.color}14` }}>
          <span className="absolute left-0 inset-y-0 w-[3px]" style={{ background: t.color }} aria-hidden />
          <p className="flex gap-1.5 text-[12.5px] font-semibold italic leading-snug">
            <Quote className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-50" aria-hidden />
            {t.quote}
          </p>
        </div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] opacity-55">
          Signature: <span className="opacity-100" style={{ color: t.color }}>{t.signature}</span>
        </p>
      </div>
    </div>
  </article>
);

/** This week's results for one tipster, from settled cards only. */
const WeekStrip = ({ line, color }: { line: WeekLine | null; color: string }) => {
  if (!line || line.total === 0)
    return (
      <p className="mx-3 mt-3 h-[46px] rounded-[8px] bg-stock-ink/[0.05] grid place-items-center text-[11.5px] font-semibold opacity-60">
        No settled cards this week yet
      </p>
    );
  const r = winRate(line);
  const cells: [string, string, boolean?][] = [
    ["W-L-P", `${line.won}-${line.lost}-${line.draw}`],
    ["Win rate", r == null ? "—" : `${r}%`],
    ["Units", `${line.units > 0 ? "+" : ""}${line.units.toFixed(1)}`, true],
  ];
  return (
    <div className="mx-3 mt-3 grid grid-cols-3 rounded-[8px] overflow-hidden ring-1 ring-stock-ink/10 divide-x divide-stock-ink/10">
      {cells.map(([k, v, u]) => (
        <div key={k} className="px-1.5 py-1.5 text-center bg-stock-ink/[0.04]">
          <p className="text-[8.5px] font-black uppercase tracking-[0.12em] opacity-50">{k}</p>
          <p
            className="num font-black text-[15px] leading-tight mt-0.5"
            style={u ? { color: line.units >= 0 ? color : "#b4232a" } : undefined}
          >
            {v}
          </p>
        </div>
      ))}
    </div>
  );
};

/** "Meet the tipsters": the two people who deal the cards; `showWeek` adds this week's stats. */
const Tipsters = ({ className = "", showWeek = false }: { className?: string; showWeek?: boolean }) => {
  // undefined while loading or hidden (no strip), null when the stats RPC isn't deployed.
  const [week, setWeek] = useState<WeekRecord | null | undefined>(undefined);
  useEffect(() => {
    if (showWeek) loadWeekRecord().then(setWeek);
  }, [showWeek]);
  return (
  <section className={className} aria-labelledby="tipsters-title">
    <p className="label">Who deals the cards</p>
    <h2 id="tipsters-title" className="font-display font-black uppercase text-[22px] leading-[1.05] tracking-[-0.02em] mt-1.5">
      Meet the tipsters
    </h2>
    <p className="text-[14px] text-muted-foreground mt-1.5 max-w-md">
      Every card on the table is picked by hand by one of these two. Look for their tag on each card.
      {week && <> Stats count this week only ({weekLabel(week.weekStart)}) and reset every Monday.</>}
    </p>
    <div className="mt-4 grid grid-cols-1 min-[420px]:grid-cols-2 gap-3 md:gap-4 [&>*]:min-w-0">
      {TIPSTERS.map((t) => (
        <TipsterCard key={t.id} t={t} week={week === undefined || week === null ? undefined : week.tipsters[t.id] ?? null} />
      ))}
    </div>
  </section>
  );
};

export default Tipsters;
