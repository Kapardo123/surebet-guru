import type { Coupon } from "@/lib/couponStorage";
import TeamLogo, { SportIcon } from "@/components/TeamLogo";
import barcode from "@/assets/brand/ticket-barcode.png";
import { BadgeCheck, BadgeX, Minus, Lock, Gem } from "@/components/icons/gsb";

const statusMeta: Record<Coupon["status"], { label: string; cls: string }> = {
  active: { label: "Active", cls: "border-sky-600/40 bg-sky-500/15 text-sky-700" },
  pending: { label: "Pending", cls: "border-amber-500/40 bg-amber-500/15 text-amber-700" },
  won: { label: "Won", cls: "border-emerald-700 bg-emerald-600 text-white" },
  lost: { label: "Lost", cls: "border-red-700 bg-red-600 text-white" },
  void: { label: "Void", cls: "border-slate-500/40 bg-slate-500/20 text-slate-600" },
};

const LegResult = ({ status }: { status?: "won" | "lost" | "void" | null }) => {
  if (!status) return null;
  const meta =
    status === "won"
      ? { cls: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700", Icon: BadgeCheck, label: "Won" }
      : status === "lost"
        ? { cls: "border-red-600/40 bg-red-600/10 text-red-700", Icon: BadgeX, label: "Lost" }
        : { cls: "border-slate-500/40 bg-slate-500/15 text-slate-600", Icon: Minus, label: "Void" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${meta.cls}`}>
      <meta.Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
};

const kickoffTime = (kickoff: string) => {
  try {
    const d = new Date(String(kickoff).replace(" ", "T"));
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
};

interface CouponTicketProps {
  coupon: Coupon;
  locked: boolean;
  onUnlock?: () => void;
}

/** Paper-style betting slip — same coupon data as the Android app. */
const CouponTicket = ({ coupon, locked, onUnlock }: CouponTicketProps) => {
  const status = statusMeta[coupon.status] ?? statusMeta.active;
  const payout = coupon.stake ? coupon.stake * coupon.totalOdds : null;
  const createdAt = (() => {
    try {
      const d = new Date(coupon.createdAt);
      return isNaN(d.getTime())
        ? ""
        : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  })();

  return (
    <div className="rotate-[-0.5deg] transition-transform duration-300 hover:rotate-0 hover:-translate-y-1.5 drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]">
      <div className="bet-ticket overflow-hidden rounded-xl border border-black/10 bg-[linear-gradient(160deg,#fdfbf6_0%,#f5efe3_100%)] text-[#16130f]">
        {/* Header */}
        <div className="px-4 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#9a9186]">Bet slip</p>
              <h3 className="truncate font-display text-[15px] font-black uppercase tracking-tight">
                {coupon.name}
              </h3>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${status.cls}`}>
                {status.label}
              </span>
              {coupon.isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#db2777] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white">
                  <Gem className="h-2.5 w-2.5 brightness-0 invert" />
                  Premium
                </span>
              )}
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-[#8a8175]">
            <span className="inline-flex items-center gap-1 rounded bg-black/[0.06] px-1.5 py-0.5">
              <SportIcon sport={coupon.sport} size={12} />
              {coupon.sport || "Multi"}
            </span>
            <span className="font-mono">#{coupon.id}</span>
            {createdAt && <span className="ml-auto font-mono text-[10px]">{createdAt}</span>}
          </div>
        </div>

        {/* Legs */}
        <div className="px-4 pb-3 pt-2.5">
          {coupon.matches.map((m, i) => (
            <div key={i} className={i > 0 ? "mt-2.5 border-t border-dashed border-black/20 pt-2.5" : ""}>
              <div className="flex items-center justify-between gap-2">
                <span className="w-4 shrink-0 font-mono text-[11px] font-black text-[#a79d90]">{i + 1}.</span>
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="w-5 shrink-0">
                    <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo} size={18} sport={m.sport} />
                  </span>
                  <span className="truncate text-[13px] font-bold">{m.homeTeam}</span>
                  <span className="shrink-0 text-[9px] font-black uppercase text-[#b3a99c]">vs</span>
                  <span className="truncate text-[13px] font-bold">{m.awayTeam}</span>
                  <span className="w-5 shrink-0">
                    <TeamLogo teamName={m.awayTeam} logoUrl={m.awayTeamLogo} size={18} sport={m.sport} />
                  </span>
                </div>
                <LegResult status={m.legStatus} />
              </div>

              <div className="mt-1 flex items-center justify-between gap-2 pl-5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[12px] text-[#5f584e]">
                    {locked ? "••••••" : m.prediction}
                  </span>
                  <span className="hidden shrink-0 text-[10px] uppercase tracking-wider text-[#a79d90] sm:inline">
                    {m.league}
                    {kickoffTime(m.kickoff) && ` · ${kickoffTime(m.kickoff)}`}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[13px] font-black">
                  {locked ? "—" : `@ ${m.odds.toFixed(2)}`}
                </span>
              </div>

              {locked && i === 0 && (
                <button
                  type="button"
                  onClick={onUnlock}
                  className="mt-2 ml-5 inline-flex items-center gap-1.5 rounded-lg border border-[#db2777]/40 bg-[#db2777]/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#be185d] transition-colors hover:bg-[#db2777]/20"
                >
                  <Lock className="h-3 w-3" />
                  Unlock predictions
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Totals stub — the mask punches notches at this seam */}
        <div className="bet-ticket-stub flex h-24 flex-col justify-between overflow-hidden border-t border-dashed border-black/30 px-4 pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9a9186]">Total odds</p>
              <p className="font-mono text-lg font-black leading-none">{coupon.totalOdds.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9a9186]">Stake</p>
              <p className="font-mono text-lg font-black leading-none">
                {coupon.stake ? `$${Number(coupon.stake).toFixed(0)}` : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#9a9186]">To win</p>
              <p className="font-mono text-lg font-black leading-none text-[#15803d]">
                {payout ? `$${payout.toFixed(2)}` : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <img src={barcode} alt="" aria-hidden className="h-6 w-auto select-none" />
            <span className="truncate font-mono text-[9px] uppercase tracking-widest text-black/45">
              Great Sport Bets · #{coupon.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CouponTicket;
