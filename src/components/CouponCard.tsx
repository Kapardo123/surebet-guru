import { Coupon } from "@/lib/couponStorage";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { memo } from "react";
import StatusTag, { PremiumTag } from "@/components/StatusTag";
import { formatKickoff, formatShortDate } from "@/lib/format";

const CouponCard = ({ coupon, userIsPremium = false }: { coupon: Coupon; userIsPremium?: boolean }) => {
  const isSettled = coupon.status === "won" || coupon.status === "lost";
  const isWon = coupon.status === "won";
  const isLost = coupon.status === "lost";
  const locked = coupon.isPremium && !userIsPremium && !isSettled;
  const legs = coupon.matches.length;

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-card ${
        coupon.isPremium && !isSettled ? "border-gold/25" : "border-border"
      } ${isLost ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground truncate">{coupon.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {legs} {legs === 1 ? "selection" : "selections"} · {formatShortDate(coupon.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {coupon.isPremium && <PremiumTag />}
          <StatusTag status={coupon.status} />
        </div>
      </div>

      {/* Legs */}
      <ol className="border-t border-border">
        {coupon.matches.map((match, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/70 last:border-b-0">
            <span className="num text-sm text-muted-foreground w-4 shrink-0">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">
                {match.homeTeam} <span className="text-muted-foreground">v</span> {match.awayTeam}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {locked ? (
                  <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Hidden</span>
                ) : (
                  <span className="text-secondary-foreground font-medium">{match.prediction}</span>
                )}
                {match.kickoff && <> · {formatKickoff(match.kickoff)}</>}
              </p>
            </div>
            {!locked && (
              <span className="num text-[17px] font-semibold text-foreground shrink-0">{match.odds.toFixed(2)}</span>
            )}
          </li>
        ))}
      </ol>

      {/* Perforation */}
      <div className="relative h-0 border-t border-dashed border-border mx-4" aria-hidden>
        <span className="absolute -left-[23px] -top-[7px] w-3.5 h-3.5 rounded-full bg-background border border-border" />
        <span className="absolute -right-[23px] -top-[7px] w-3.5 h-3.5 rounded-full bg-background border border-border" />
      </div>

      {/* Total */}
      {locked ? (
        <Link to="/premium" className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="w-4 h-4 text-gold" />
            Premium coupon
          </span>
          <span className="text-xs font-semibold text-gold">See plans</span>
        </Link>
      ) : (
        <div className="flex items-end justify-between gap-3 px-4 py-3.5">
          <div>
            <p className="text-[11px] text-muted-foreground">Total odds</p>
            {coupon.stake ? (
              <p className="text-xs text-secondary-foreground mt-0.5">Stake ${coupon.stake}</p>
            ) : null}
          </div>
          <p
            className={`num text-[30px] font-semibold leading-none ${
              isWon ? "text-success" : isLost ? "text-muted-foreground line-through decoration-1" : "text-primary"
            }`}
          >
            {coupon.totalOdds.toFixed(2)}
          </p>
        </div>
      )}
    </article>
  );
};

export default memo(CouponCard);
