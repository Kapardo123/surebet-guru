import { Badge } from "@/components/ui/badge";
import { Coupon } from "@/lib/couponStorage";
import { Receipt, Clock, Crown, Lock, Layers, Sparkles } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const statusVariant = {
  active: "outline" as const,
  won: "win" as const,
  lost: "loss" as const,
  pending: "outline" as const,
};

const statusLabel = {
  active: "Active",
  won: "Won ✓",
  lost: "Lost ✗",
  pending: "Pending",
};

const CouponCard = ({ coupon, userIsPremium = false }: { coupon: Coupon; userIsPremium?: boolean }) => {
  const locked = coupon.isPremium && !userIsPremium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative overflow-hidden rounded-2xl group w-full ${locked ? "select-none" : ""}`}
    >
      {/* Blue/Cyan glow effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div
        className="relative rounded-2xl backdrop-blur-sm bg-gradient-to-br from-card via-blue-950/5 to-cyan-950/10 border border-blue-500/30 overflow-hidden transition-all duration-300 shadow-lg shadow-black/5 group-hover:border-cyan-400/40 group-hover:shadow-blue-500/15 group-hover:-translate-y-1"
      >
        {/* Top gradient line - Blue to Cyan */}
        <div className="h-[3px] w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500" />

        {/* Premium badge */}
        {coupon.isPremium && (
          <div className="absolute top-3 right-0 z-10">
            <div className="bg-gradient-to-l from-blue-500 to-cyan-500 text-white px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider rounded-l-full flex items-center gap-1.5 shadow-lg shadow-blue-500/40">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header with icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center ring-2 ring-blue-500/30">
                <Receipt className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">{coupon.name}</h3>
                {coupon.sport && (
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">{coupon.sport}</span>
                )}
              </div>
            </div>
            <Badge variant={statusVariant[coupon.status]} className="shrink-0">
              {statusLabel[coupon.status]}
            </Badge>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center py-10 gap-3 rounded-xl bg-gradient-to-b from-blue-500/10 to-cyan-900/10 border border-blue-500/20 cursor-pointer hover:border-cyan-400/40 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center ring-2 ring-blue-500/30">
                  <Lock className="w-7 h-7 text-blue-400" />
                </div>
                <p className="font-display text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Unlock with Premium</p>
                <p className="text-[11px] text-muted-foreground">Click to view plans</p>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Matches */}
              <div className="space-y-2.5">
                {coupon.matches.map((match, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/20 hover:bg-blue-500/8 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-3 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center ring-2 ring-blue-500/30 shrink-0">
                            <TeamLogo teamName={match.homeTeam} logoUrl={match.homeTeamLogo} size={22} />
                          </div>
                          <span className="text-sm font-semibold text-foreground leading-tight">{match.homeTeam}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-cyan-500/10 flex items-center justify-center ring-2 ring-cyan-500/30 shrink-0">
                            <TeamLogo teamName={match.awayTeam} logoUrl={match.awayTeamLogo} size={22} />
                          </div>
                          <span className="text-sm font-semibold text-foreground leading-tight">{match.awayTeam}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pt-1 min-w-fit">
                        <span className="text-xs font-bold text-blue-400 mb-1">{match.prediction}</span>
                        <span className="font-display font-bold text-cyan-400 text-xl leading-none drop-shadow-sm">{match.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl p-4 border border-blue-500/20 hover:scale-[1.02] transition-transform">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-2 font-medium">Matches</p>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-400" />
                    <p className="font-display font-bold text-foreground text-2xl leading-none">{coupon.matches.length}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500/5 to-transparent rounded-xl p-4 border border-cyan-500/20 hover:scale-[1.02] transition-transform">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-2 font-medium">Total Odds</p>
                  <p className="font-display font-bold text-cyan-400 text-2xl leading-none drop-shadow-sm">{coupon.totalOdds.toFixed(2)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center pt-3 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {new Date(coupon.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {coupon.stake && (
                  <div className="ml-auto px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <span className="text-[11px] font-bold text-blue-400">Stake: ${coupon.stake}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CouponCard;
