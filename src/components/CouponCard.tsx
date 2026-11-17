import { Coupon } from "@/lib/couponStorage";
import { Link } from "react-router-dom";
import { memo, useMemo } from "react";
import StatusTag from "@/components/StatusTag";
import { formatKickoff, formatShortDate } from "@/lib/format";

/** Decorative barcode derived from the coupon id, so each slip has its own. */
const Barcode = ({ seed }: { seed: number }) => {
  const bars = useMemo(() => {
    let x = (seed * 9301 + 49297) % 233280 || 7;
    return Array.from({ length: 34 }, () => {
      x = (x * 9301 + 49297) % 233280;
      return 1 + (x % 3);
    });
  }, [seed]);
  return (
    <div className="flex items-stretch gap-[2px] h-7" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} className={i % 2 ? "bg-transparent" : "bg-foreground"} style={{ width: w }} />
      ))}
    </div>
  );
};

const CouponCard = ({ coupon, userIsPremium = false }: { coupon: Coupon; userIsPremium?: boolean }) => {
  const tilt = coupon.id % 2 ? "-rotate-[0.6deg]" : "rotate-[0.5deg]";
  const isSettled = coupon.status === "won" || coupon.status === "lost";
  const isWon = coupon.status === "won";
  const isLost = coupon.status === "lost";
  const locked = coupon.isPremium && !userIsPremium && !isSettled;
  const legs = coupon.matches.length;
  const ref = `GSB-${String(coupon.id).padStart(5, "0")}`;

  return (
    <div className={`relative pt-3 ${tilt}`}>
      {/* Strip of tape holding the slip down */}
      <span
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-24 h-6 rotate-[-3deg] bg-[hsl(48_60%_85%/0.75)] shadow-[0_1px_0_rgba(0,0,0,0.08)]"
        style={{ maskImage: "linear-gradient(90deg, transparent 0 3px, #000 3px calc(100% - 3px), transparent calc(100% - 3px))" }}
        aria-hidden
      />
    <div className="drop-shadow-[0_2px_2px_rgba(40,30,20,0.2)]">
      <article className="relative bg-card slip-edge font-mono text-foreground">
        <div className="px-4 pt-4 pb-5">
          {/* Slip header */}
          <div className="flex items-center justify-between text-[11.5px] uppercase tracking-[0.06em] text-muted-foreground">
            <span>{legs}-fold accumulator</span>
            <span>{ref}</span>
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h3 className="font-display font-black uppercase text-[34px] leading-[0.9] tracking-[0.005em]">
              {coupon.name}
            </h3>
            {coupon.isPremium && !isSettled && (
              <span className="shrink-0 mt-1 inline-flex items-center h-[18px] px-1.5 bg-foreground text-background text-[9.5px] font-semibold uppercase tracking-[0.12em]">
                Members
              </span>
            )}
          </div>

          <div className="my-3 border-t border-dashed border-foreground/50" />

          {/* Selections */}
          <ol className={`space-y-3 ${isLost ? "opacity-55" : ""}`}>
            {coupon.matches.map((m, i) => (
              <li key={i} className="text-[14px] leading-snug">
                <p className="flex gap-2 font-semibold uppercase tracking-[0.02em]">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span className="truncate">
                    {m.homeTeam} v {m.awayTeam}
                  </span>
                </p>
                <div className="flex items-baseline gap-1.5 pl-5 mt-0.5">
                  {locked ? (
                    <>
                      <span className="redact w-28" />
                      <span className="leader" />
                      <span className="redact w-8" />
                    </>
                  ) : (
                    <>
                      <span className="font-serif font-semibold text-[17px] tracking-normal">{m.prediction}</span>
                      <span className="leader" />
                      <span className="font-semibold text-[15px]">{m.odds.toFixed(2)}</span>
                    </>
                  )}
                </div>
                {(m.league || m.kickoff) && (
                  <p className="pl-5 mt-0.5 text-[11.5px] uppercase tracking-[0.04em] text-muted-foreground truncate">
                    {[m.league, m.kickoff && formatKickoff(m.kickoff)].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>

          <div className="my-3 border-t border-dashed border-foreground/50" />

          {/* Total */}
          {locked ? (
            <Link to="/premium" className="flex items-end justify-between gap-3">
              <span className="text-[12.5px] uppercase tracking-[0.04em] leading-snug">
                Selections hidden<br />
                <span className="text-red underline underline-offset-[3px]">Members only, see rates</span>
              </span>
              <span className="num font-black text-[40px] leading-none text-foreground/20">?.??</span>
            </Link>
          ) : (
            <div className="flex items-end justify-between gap-3">
              <div className="text-[12px] uppercase tracking-[0.04em] text-muted-foreground leading-relaxed">
                <p>Total odds</p>
                {coupon.stake ? <p>Stake ${coupon.stake}</p> : <p>Issued {formatShortDate(coupon.createdAt)}</p>}
              </div>
              <span
                className={`num font-black text-[44px] leading-[0.85] ${
                  isLost ? "text-muted-foreground line-through decoration-2" : isWon ? "text-success" : "text-foreground"
                }`}
              >
                {coupon.totalOdds.toFixed(2)}
              </span>
            </div>
          )}

          <div className="mt-4 flex items-end justify-between gap-3">
            <Barcode seed={coupon.id} />
            {isSettled && <StatusTag status={coupon.status} className="text-[24px]" />}
          </div>
        </div>
      </article>
    </div>
    </div>
  );
};

export default memo(CouponCard);
