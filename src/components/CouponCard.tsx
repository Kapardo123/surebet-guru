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
  const isSettled = coupon.status === "won" || coupon.status === "lost";
  const locked = coupon.isPremium && !userIsPremium && !isSettled;

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

        <div className="p-4 md:p-5 space-y-3 md:space-y-4">
          {/* Header with icon */}
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 md:gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center ring-2 ring-blue-500/30 flex-shrink-0">
                <Receipt className="w-4 w-4 md:w-5 md:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm md:text-base text-foreground truncate">{coupon.name}</h3>
                {coupon.sport && (
                  <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium tracking-wider uppercase">{coupon.sport}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0 flex-wrap">
              {coupon.isPremium && (
                <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 text-white px-2 md:px-2.5 py-0.5 md:py-1 text-[8px] md:text-[9px] font-display font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-md shadow-blue-500/40">
                  <Crown className="w-2 h-2 md:w-2.5 md:h-2.5 fill-white" />
                  <span>PRO</span>
                </div>
              )}
              <Badge variant={statusVariant[coupon.status]} className="text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5">
                {statusLabel[coupon.status]}
              </Badge>
            </div>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center py-8 md:py-10 gap-2.5 md:gap-3 rounded-xl bg-gradient-to-b from-blue-500/10 to-cyan-900/10 border border-blue-500/20 cursor-pointer hover:border-cyan-400/40 transition-all"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-600/20 flex items-center justify-center ring-2 ring-blue-500/30">
                  <Lock className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />
                </div>
                <p className="font-display text-xs md:text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Unlock with Premium</p>
                <p className="text-[10px] md:text-[11px] text-muted-foreground">Click to view plans</p>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Matches */}
              <div className="space-y-2 md:space-y-2.5">
                {coupon.matches.map((match, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="bg-blue-500/5 rounded-xl p-3 sm:p-3.5 md:p-4 border border-blue-500/20 hover:bg-blue-500/8 hover:border-blue-500/30 transition-all"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Teams Row */}
                      <div className="flex items-center justify-between gap-1.5 flex-1">
                        {/* Home Team */}
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-blue-500/10 flex items-center justify-center ring-1.5 ring-blue-500/30 flex-shrink-0">
                            <TeamLogo teamName={match.homeTeam} logoUrl={match.homeTeamLogo} size={18} />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight text-left">{match.homeTeam}</span>
                        </div>

                        {/* VS Badge */}
                        <div className="px-2 py-0.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-border/20 flex-shrink-0">
                          <span className="text-[9px] sm:text-[10px] font-display font-bold text-muted-foreground">VS</span>
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-end">
                          <span className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight text-right">{match.awayTeam}</span>
                          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-cyan-500/10 flex items-center justify-center ring-1.5 ring-cyan-500/30 flex-shrink-0">
                            <TeamLogo teamName={match.awayTeam} logoUrl={match.awayLogo} size={18} />
                          </div>
                        </div>
                      </div>

                      {/* Prediction & Odds - Right Side */}
                      <div className="flex items-center justify-between gap-4 pl-0 sm:pl-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/10">
                        <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-[10px] sm:text-[11px] font-bold text-blue-400 uppercase tracking-wide">{match.prediction}</span>
                        </div>
                        <span className="font-display font-bold text-base sm:text-lg md:text-xl text-cyan-400 drop-shadow-sm whitespace-nowrap">{match.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl p-3 md:p-4 border border-blue-500/20 hover:scale-[1.02] transition-transform">
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5 md:mb-2 font-medium">Matches</p>
                  <div className="flex items-center gap-1.5 md:gap-2">
                    <Layers className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                    <p className="font-display font-bold text-foreground text-xl md:text-2xl leading-none">{coupon.matches.length}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-500/5 to-transparent rounded-xl p-3 md:p-4 border border-cyan-500/20 hover:scale-[1.02] transition-transform">
                  <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5 md:mb-2 font-medium">Total Odds</p>
                  <p className="font-display font-bold text-cyan-400 text-lg md:text-2xl leading-none drop-shadow-sm">{coupon.totalOdds.toFixed(2)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center pt-2 md:pt-3 border-t border-border/20">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                  <span className="text-[10px] md:text-[11px] text-muted-foreground font-medium">
                    {new Date(coupon.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {coupon.stake && (
                  <div className="ml-auto px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                    <span className="text-[10px] md:text-[11px] font-bold text-blue-400">Stake: ${coupon.stake}</span>
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
