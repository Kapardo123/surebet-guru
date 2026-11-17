import { Coupon } from "@/lib/couponStorage";
import { Link } from "react-router-dom";
import { memo } from "react";
import { Lock } from "lucide-react";
import StatusTag from "@/components/StatusTag";
import TeamLogo from "@/components/TeamLogo";
import { kickoffParts } from "@/lib/format";
import { sportTheme } from "@/lib/sport";

type Leg = Coupon["matches"][number];

/** One leg as a mini card in the fan. */
const MiniCard = ({ leg, faceDown }: { leg: Leg; faceDown: boolean }) => {
  const t = sportTheme(leg.sport);
  if (faceDown) {
    return (
      <div className="w-[104px] h-[146px] rounded-[10px] p-[3px] foil-gold shadow-[0_8px_18px_-6px_rgba(0,0,0,.7)]">
        <div className="h-full rounded-[7px] card-back grid place-items-center">
          <span className="font-display font-black text-[15px] foil-gold-text">GSB</span>
        </div>
      </div>
    );
  }
  const ko = kickoffParts(leg.kickoff);
  return (
    <div className="w-[104px] h-[146px] rounded-[10px] p-[3px] shadow-[0_8px_18px_-6px_rgba(0,0,0,.7)]" style={{ background: t.frame }}>
      <div className="paper h-full rounded-[7px] bg-stock text-stock-ink overflow-hidden flex flex-col">
        <div className="h-[46px] flex items-center justify-center gap-1" style={{ background: t.art }}>
          {[leg.homeTeam, leg.awayTeam].map((n, i) => (
            <span key={i} className="grid place-items-center w-7 h-7 rounded-full bg-white/90">
              <TeamLogo teamName={n} logoUrl={i ? leg.awayTeamLogo : leg.homeTeamLogo} size={20} sport={leg.sport} tone="light" />
            </span>
          ))}
        </div>
        <div className="px-1.5 pt-1 flex-1 min-h-0">
          <p className="font-display font-extrabold uppercase text-[8.5px] leading-[1.15] line-clamp-2">
            {leg.homeTeam} v {leg.awayTeam}
          </p>
          <p className="text-[10.5px] font-semibold leading-tight mt-1 line-clamp-2">{leg.prediction}</p>
        </div>
        <div className="flex items-end justify-between px-1.5 pb-1.5">
          <span className="num font-black text-[15px] leading-none">{leg.odds.toFixed(2)}</span>
          {ko.time !== "TBD" && <span className="text-[8.5px] font-semibold opacity-60">{ko.time}</span>}
        </div>
      </div>
    </div>
  );
};

const CouponCard = ({ coupon, userIsPremium = false }: { coupon: Coupon; userIsPremium?: boolean }) => {
  const isSettled = coupon.status === "won" || coupon.status === "lost";
  const isLost = coupon.status === "lost";
  const locked = coupon.isPremium && !userIsPremium && !isSettled;
  const legs = coupon.matches;
  const n = legs.length;

  // Fan the cards: spread angle shrinks as the set grows.
  const spread = Math.min(10, 36 / Math.max(1, n - 1));
  const overlap = n <= 2 ? -18 : n === 3 ? -34 : -52;

  const inner = (
    <div className={`relative rounded-[20px] border p-4 overflow-hidden ${coupon.isPremium ? "border-[hsl(var(--gold)/.5)] bg-[linear-gradient(160deg,hsl(40_40%_16%),hsl(232_30%_13%)_55%)]" : "border-border bg-card"} ${isLost ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">
            {n}-card set{coupon.isPremium && <span className="foil-gold-text"> · Gold</span>}
          </p>
          <h3 className="font-display font-black uppercase text-[19px] leading-[1.1] tracking-[-0.01em] mt-1 truncate">{coupon.name}</h3>
        </div>
        {isSettled && <StatusTag status={coupon.status} className="shrink-0" />}
      </div>

      {/* The fan */}
      <div className="relative mt-4 mb-1 h-[168px] flex justify-center items-start overflow-x-auto no-scrollbar">
        <div className="flex pt-2 px-6">
          {legs.map((leg, i) => {
            const mid = (n - 1) / 2;
            const rot = (i - mid) * spread;
            const lift = Math.abs(i - mid) * 5;
            return (
              <div
                key={i}
                className="shrink-0 transition-transform duration-300 hover:-translate-y-2"
                style={{ marginLeft: i ? overlap : 0, transform: `rotate(${rot}deg) translateY(${lift}px)`, zIndex: i }}
              >
                <MiniCard leg={leg} faceDown={locked} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      {locked ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-full foil-gold foil-shimmer text-stock-ink px-4 h-12">
          <span className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em]">
            <Lock className="w-4 h-4" /> Sealed pack
          </span>
          <span className="text-[12.5px] font-bold">Members open it →</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-full bg-black/30 px-4 h-12">
          <span className="label text-foreground/70">Combined odds</span>
          <span className={`num font-black text-[24px] ${isLost ? "line-through opacity-60" : coupon.isPremium ? "foil-gold-text" : "text-primary"}`}>
            {coupon.totalOdds.toFixed(2)}
          </span>
        </div>
      )}

      {!locked && (
        <ul className="mt-3 space-y-1.5">
          {legs.map((leg, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{leg.homeTeam} v {leg.awayTeam}:</span>{" "}
                <span className="font-semibold">{leg.prediction}</span>
              </span>
              <span className="num font-bold text-[13px] shrink-0">{leg.odds.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return locked ? (
    <Link to="/premium" className="block active:scale-[0.99] transition-transform">{inner}</Link>
  ) : (
    inner
  );
};

export default memo(CouponCard);
