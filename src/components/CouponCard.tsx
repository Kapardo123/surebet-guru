import { Badge } from "@/components/ui/badge";
import { Coupon } from "@/lib/couponStorage";
import { Ticket, Timer, Gem, Shield, Layers, BadgeCheck, BadgeX, Minus } from "@/components/icons/gsb";
import TeamLogo, { SportIcon } from "@/components/TeamLogo";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { memo } from "react";

const statusVariant = {
  active: "outline" as const,
  won: "win" as const,
  lost: "loss" as const,
  pending: "outline" as const,
  void: "draw" as const,
};

const statusLabel = {
  active: "Active",
  won: "Won",
  lost: "Lost",
  pending: "Pending",
  void: "Void",
};

const StatusIcon = ({ status }: { status: Coupon["status"] }) => {
  if (status === "won") return <BadgeCheck className="w-3 h-3 text-emerald-400" />;
  if (status === "lost") return <BadgeX className="w-3 h-3 text-red-400" />;
  if (status === "pending" || status === "void") return <Minus className="w-3 h-3 text-amber-400" />;
  return null;
};

const CouponCard = ({ coupon, userIsPremium = false }: { coupon: Coupon; userIsPremium?: boolean }) => {
  const isSettled = coupon.status === "won" || coupon.status === "lost" || coupon.status === "void";
  const isWon = coupon.status === "won";
  const isLost = coupon.status === "lost";
  const locked = coupon.isPremium && !userIsPremium && !isSettled;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl group w-full ${locked ? "select-none" : ""} ${isLost ? "opacity-70" : ""}`}
    >
      <div
        className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
          isWon
            ? "bg-card border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
            : "bg-card border border-cyan-500/15 shadow-lg shadow-black/20 group-hover:border-cyan-500/25 group-hover:-translate-y-0.5"
        }`}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${
          isWon ? "bg-gradient-to-r from-transparent via-emerald-500 to-transparent" :
          "bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
        }`} />

        <div className="p-3.5 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/20 flex-shrink-0">
                <Ticket size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-foreground truncate">{coupon.name}</h3>
                {coupon.sport && (
                  <span className="text-[9px] text-muted-foreground font-medium tracking-wider uppercase inline-flex items-center gap-1">
                    <SportIcon sport={coupon.sport} size={11} />
                    {coupon.sport}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {coupon.isPremium && (
                <span className="bg-pink-500 text-white px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-wider rounded-full flex items-center gap-0.5">
                  <Gem className="w-2 h-2 brightness-0 invert" />
                  PRO
                </span>
              )}
              <Badge variant={statusVariant[coupon.status]} className="gap-1 shrink-0 text-[9px] px-2 py-0.5">
                <StatusIcon status={coupon.status} />
                {statusLabel[coupon.status]}
              </Badge>
            </div>
          </div>

          {/* Matches */}
          <div className="space-y-2">
            {coupon.matches.map((match, i) => (
              <div
                key={i}
                className="bg-white/[0.02] rounded-xl p-2.5 border border-white/[0.04]"
              >
                {/* Match info */}
                {(match.sport || match.league || match.kickoff || match.legStatus) && (
                  <div className="flex flex-wrap items-center gap-1.5 pb-2 mb-2 border-b border-white/[0.04]">
                    {match.sport && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">
                        <SportIcon sport={match.sport} size={11} />
                        {match.sport}
                      </span>
                    )}
                    {match.league && (
                      <span className="text-[10px] text-white/60 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">{match.league}</span>
                    )}
                    {match.kickoff && (
                      <span className="text-[10px] text-white/55 flex items-center gap-0.5 ml-auto font-medium">
                        <Timer className="w-2.5 h-2.5 text-white/45" />
                        {(() => {
                          try {
                            const d = new Date(match.kickoff);
                            return !isNaN(d.getTime())
                              ? d.toLocaleString("pl-PL", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
                              : String(match.kickoff);
                          } catch { return String(match.kickoff); }
                        })()}
                      </span>
                    )}
                    {/* Status nogi — Won/Lost/Void (bez wyniku) */}
                    {match.legStatus && (
                      <span className={`inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ml-auto ${
                        match.legStatus === "won"
                          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                          : match.legStatus === "lost"
                            ? "text-red-400 border-red-500/30 bg-red-500/10"
                            : "text-amber-400 border-amber-500/30 bg-amber-500/10"
                      }`}>
                        {match.legStatus === "won" ? <BadgeCheck className="w-2.5 h-2.5" /> : match.legStatus === "lost" ? <BadgeX className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                        {match.legStatus === "won" ? "Won" : match.legStatus === "lost" ? "Lost" : "Void"}
                      </span>
                    )}
                  </div>
                )}

                {/* Teams - Horizontal */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/[0.03] flex items-center justify-center ring-1 ring-white/10 flex-shrink-0">
                      <TeamLogo teamName={match.homeTeam} logoUrl={match.homeTeamLogo} size={20} sport={match.sport} />
                    </div>
                    <span className="text-[11px] font-bold text-foreground leading-tight text-center truncate w-full">{match.homeTeam}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0 px-1">
                    <span className="text-[9px] font-display font-semibold text-muted-foreground/40 uppercase tracking-widest">VS</span>
                    {!locked && (
                      <span className="text-xs font-black text-cyan-400 tabular-nums">{match.odds.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-white/[0.03] flex items-center justify-center ring-1 ring-white/10 flex-shrink-0">
                      <TeamLogo teamName={match.awayTeam} logoUrl={match.awayTeamLogo} size={20} sport={match.sport} />
                    </div>
                    <span className="text-[11px] font-bold text-foreground leading-tight text-center truncate w-full">{match.awayTeam}</span>
                  </div>
                </div>

                {/* Prediction - hidden when locked */}
                {!locked && match.prediction && (
                  <div className="mt-2 pt-2 border-t border-white/[0.04] text-center">
                    <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">Tip: </span>
                    <span className="text-xs font-bold text-foreground">{match.prediction}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2.5 border border-white/[0.06] bg-white/[0.02]">
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em] mb-1 font-medium">Matches</p>
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-white/50" />
                <p className="font-display font-bold text-foreground text-lg leading-none">{coupon.matches.length}</p>
              </div>
            </div>
            <div className="rounded-xl px-3 py-2.5 border border-cyan-500/20 bg-cyan-500/5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.12em] mb-1 font-medium">Total Odds</p>
              <p className="font-display font-bold text-cyan-400 text-lg leading-none tabular-nums">{coupon.totalOdds.toFixed(2)}</p>
            </div>
          </div>

          {locked && (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center justify-center gap-3 py-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15 cursor-pointer hover:border-cyan-500/30 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/20">
                  <Shield className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="font-display text-xs font-bold text-cyan-400">Unlock with Premium</p>
                  <p className="text-[11px] text-muted-foreground/70">Click to view plans</p>
                </div>
              </motion.div>
            </Link>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3 h-3 text-white/45" />
              <span className="text-[11px] text-white/55 font-medium">
                {new Date(coupon.createdAt).toLocaleDateString("pl-PL")}
              </span>
            </div>
            {coupon.stake && (
              <span className="text-[11px] font-bold text-cyan-400/80 bg-cyan-500/5 px-2 py-0.5 rounded-full">
                ${coupon.stake}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(CouponCard);
