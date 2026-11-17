import { Tip } from "@/components/TipCard";
import SportGlyph from "@/components/SportGlyph";
import { sportTheme } from "@/lib/sport";

/**
 * Today's binder page: one slot per card. A slot fills in once you've
 * opened that card in the inspector.
 */
const BinderStrip = ({
  tips,
  seen,
  userIsPremium,
  onSlot,
}: {
  tips: Tip[];
  seen: number[];
  userIsPremium: boolean;
  onSlot: (tip: Tip) => void;
}) => {
  if (tips.length === 0) return null;
  const got = tips.filter((t) => seen.includes(t.id)).length;
  const pct = Math.round((got / tips.length) * 100);

  return (
    <div className="rounded-[20px] bg-white/[0.04] border border-white/[0.07] px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="label">Today's binder</p>
        <p className="text-[13px] font-semibold">
          <span className={got === tips.length ? "foil-gold-text" : "text-foreground"}>{got}/{tips.length}</span>{" "}
          <span className="text-muted-foreground font-medium">collected</span>
        </p>
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {tips.map((t) => {
          const has = seen.includes(t.id);
          const locked = t.isPremium && !userIsPremium && t.status === "upcoming";
          const theme = sportTheme(t.sport);
          return (
            <button
              key={t.id}
              onClick={() => onSlot(t)}
              aria-label={`${t.homeTeam} v ${t.awayTeam}${has ? ", collected" : ""}`}
              className={`shrink-0 w-[30px] h-[42px] rounded-[6px] grid place-items-center transition-transform active:scale-90 ${
                has
                  ? `${t.isPremium ? "foil-gold text-stock-ink" : "text-white"} shadow-[0_4px_10px_-3px_rgba(0,0,0,.6)]`
                  : `border-[1.5px] border-dashed ${t.isPremium ? "border-[hsl(var(--gold)/.6)]" : "border-white/20"}`
              }`}
              style={has && !t.isPremium ? { background: theme.frame } : undefined}
            >
              {has ? (
                <SportGlyph sport={t.sport} size={15} />
              ) : (
                <span className={`text-[11px] ${t.isPremium ? "text-[hsl(var(--gold))]" : "text-white/30"}`}>{locked ? "◆" : "+"}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full foil-gold transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default BinderStrip;
