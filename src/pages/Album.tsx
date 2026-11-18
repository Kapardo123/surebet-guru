import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppHeader, { headerLink } from "@/components/AppHeader";
import StadiumBackdrop from "@/components/StadiumBackdrop";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import StatusTag from "@/components/StatusTag";
import MiniCard from "@/components/MiniCard";
import { useAuth } from "@/contexts/AuthContext";
import { AlbumCard, TrackRecord, loadAlbum, loadTrackRecord } from "@/lib/engagement";

// ---------------------------------------------------------------------------
// Badges, earned from the cards in the album
// ---------------------------------------------------------------------------
const BADGES: { id: string; name: string; hint: string; test: (c: AlbumCard[]) => boolean }[] = [
  { id: "first", name: "First pull", hint: "Collect a card", test: (c) => c.length >= 1 },
  { id: "ten", name: "Collector", hint: "Collect 10 cards", test: (c) => c.length >= 10 },
  { id: "fifty", name: "Binder full", hint: "Collect 50 cards", test: (c) => c.length >= 50 },
  { id: "win", name: "First win", hint: "Collect a winning card", test: (c) => c.some((x) => x.status === "won") },
  { id: "hat", name: "Hat-trick", hint: "Collect 3 winning cards", test: (c) => c.filter((x) => x.status === "won").length >= 3 },
  { id: "gold", name: "Gold hands", hint: "Collect 5 Gold cards", test: (c) => c.filter((x) => x.isPremium).length >= 5 },
  {
    id: "spec",
    name: "Specialist",
    hint: "5 cards from one league",
    test: (c) => Object.values(c.reduce<Record<string, number>>((m, x) => ((m[x.league] = (m[x.league] ?? 0) + 1), m), {})).some((n) => n >= 5),
  },
  { id: "long", name: "Long shot", hint: "Win a card at odds 3.00+", test: (c) => c.some((x) => x.status === "won" && x.odds >= 3) },
];

// Single series on the dark felt: the brand yellow, a 2px line, faint fill.
const LINE = "hsl(45 100% 62%)";

const RecordChart = ({ data }: { data: TrackRecord["series"] }) => (
  <div className="h-[170px] -mx-2" role="img" aria-label="Cumulative units over time">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="unitsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.28} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="hsl(230 20% 100% / .06)" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          minTickGap={28}
        />
        <YAxis width={36} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
        <ReferenceLine y={0} stroke="hsl(230 20% 100% / .25)" />
        <Tooltip
          cursor={{ stroke: "hsl(230 20% 100% / .35)", strokeWidth: 1 }}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13 }}
          labelStyle={{ color: "hsl(var(--muted-foreground))" }}
          itemStyle={{ color: "hsl(var(--foreground))" }}
          labelFormatter={(d: string) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)} u`, "Running total"]}
        />
        <Area type="monotone" dataKey="units" stroke={LINE} strokeWidth={2} fill="url(#unitsFill)" dot={false} activeDot={{ r: 5, stroke: "hsl(var(--background))", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const Pocket = ({ card }: { card: AlbumCard }) => (
  <div className="relative">
    <MiniCard card={card} gold={!!card.isPremium} hidden={!!card.masked} lost={card.status === "lost"} className="aspect-[5/7]" />
    {card.status !== "upcoming" && <StatusTag status={card.status} animate={false} className="absolute -bottom-2 -right-2 scale-[.62] origin-bottom-right" />}
  </div>
);

/** The reader's permanent collection, track record and badges. */
const Album = () => {
  const { user, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<AlbumCard[] | null>(null);
  const [record, setRecord] = useState<TrackRecord | null | undefined>(undefined);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCards([]);
      return;
    }
    loadAlbum().then(setCards);
  }, [user, authLoading]);

  useEffect(() => {
    setRecord(undefined);
    loadTrackRecord(days).then(setRecord);
  }, [days]);

  const byLeague = useMemo(() => {
    const m = new Map<string, AlbumCard[]>();
    (cards ?? []).forEach((c) => m.set(c.league || "Other", [...(m.get(c.league || "Other") ?? []), c]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [cards]);

  const earned = BADGES.filter((b) => b.test(cards ?? []));
  const rate = record && record.won + record.lost > 0 ? Math.round((record.won / (record.won + record.lost)) * 100) : null;

  return (
    <PageTransition>
      <div className="relative isolate min-h-screen pb-28">
        <StadiumBackdrop height={420} />
        <AppHeader
          right={
            <Link to="/" className={headerLink}>
              <ArrowLeft className="w-4 h-4" />
              Cards
            </Link>
          }
        />

        <main className="max-w-3xl mx-auto px-4 pt-6 space-y-8">
          <section>
            <p className="label">Your album</p>
            <h1 className="font-display font-black uppercase text-[30px] leading-[1.02] tracking-[-0.02em] mt-1.5">
              {cards === null ? "Opening binder…" : <><span className="foil-gold-text">{cards.length}</span> {cards.length === 1 ? "card" : "cards"} collected</>}
            </h1>
          </section>

          {/* Track record */}
          <section className="rounded-[22px] bg-white/[0.04] border border-white/[0.08] p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display font-black uppercase text-[16px]">Track record</h2>
              <div className="flex p-0.5 rounded-full bg-black/25" role="tablist">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    role="tab"
                    aria-selected={days === d}
                    onClick={() => setDays(d)}
                    className={`h-8 px-3 rounded-full text-[12.5px] font-bold ${days === d ? "bg-foreground text-background" : "text-foreground/70"}`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {record === undefined ? (
              <div className="h-[260px] mt-4 rounded-[14px] bg-white/[0.04] animate-pulse" />
            ) : record === null || record.total === 0 ? (
              <p className="text-[14px] text-muted-foreground mt-4">
                {record === null ? "The record will show up once the history migration is live." : "No settled cards in this period yet."}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="rounded-[14px] bg-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Win rate</p>
                    <p className="num font-black text-[22px] mt-1">{rate ?? "—"}%</p>
                  </div>
                  <div className="rounded-[14px] bg-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Units</p>
                    <p className={`num font-black text-[22px] mt-1 ${record.units >= 0 ? "foil-gold-text" : "text-red"}`}>
                      {record.units > 0 ? "+" : ""}
                      {record.units.toFixed(1)}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-white/[0.05] px-3 py-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">W-L-P</p>
                    <p className={`num font-black mt-1 whitespace-nowrap ${`${record.won}${record.lost}${record.draw}`.length > 4 ? "text-[17px] leading-[1.6]" : "text-[22px]"}`}>{record.won}-{record.lost}-{record.draw}</p>
                  </div>
                </div>
                <p className="text-[12.5px] text-muted-foreground mt-3">Running total in units, 1 unit staked on every card.</p>
                <RecordChart data={record.series} />
              </>
            )}
          </section>

          {/* Badges */}
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display font-black uppercase text-[16px]">Badges</h2>
              <span className="text-[13px] text-muted-foreground">{earned.length}/{BADGES.length}</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {BADGES.map((b) => {
                const has = earned.includes(b);
                return (
                  <div key={b.id} className="text-center" title={b.hint}>
                    <div className={`mx-auto w-14 h-14 rounded-full grid place-items-center ${has ? "foil-gold shadow-[0_6px_16px_-4px_hsl(var(--gold)/.6)]" : "bg-white/[0.05] border border-dashed border-white/15"}`}>
                      <span className={`font-display font-black text-[15px] ${has ? "text-stock-ink" : "text-white/25"}`}>
                        {b.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <p className={`text-[11px] font-semibold mt-1.5 leading-tight ${has ? "" : "text-muted-foreground"}`}>{b.name}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pages by league */}
          {!authLoading && !user ? (
            <section className="rounded-[22px] border border-dashed border-white/15 p-6 text-center">
              <p className="font-display font-black uppercase text-[18px]">Keep your cards</p>
              <p className="text-[14.5px] text-muted-foreground mt-1.5">Sign in and every card you open goes into your album for good.</p>
              <Link to="/auth?redirect=/album" className="inline-flex mt-4 h-12 px-6 rounded-full bg-primary text-primary-foreground font-bold items-center">
                Sign in
              </Link>
            </section>
          ) : cards && cards.length === 0 ? (
            <section className="rounded-[22px] border border-dashed border-white/15 p-6 text-center">
              <p className="font-display font-black uppercase text-[18px]">Empty binder</p>
              <p className="text-[14.5px] text-muted-foreground mt-1.5">Open a card on the table and it lands here.</p>
            </section>
          ) : (
            byLeague.map(([league, list]) => (
              <section key={league}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display font-black uppercase text-[15px] truncate">{league}</h2>
                  <span className="text-[12.5px] text-muted-foreground shrink-0">
                    {list.filter((c) => c.status === "won").length} won · {list.length} {list.length === 1 ? "card" : "cards"}
                  </span>
                </div>
                {/* Binder page: pockets */}
                <div className="mt-3 rounded-[18px] bg-black/25 border border-white/[0.06] p-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {list.map((c) => (
                    <Pocket key={c.id} card={c} />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default Album;
