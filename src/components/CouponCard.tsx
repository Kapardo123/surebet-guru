import { Badge } from "@/components/ui/badge";
import { Coupon } from "@/lib/couponStorage";
import { Receipt, Clock, Crown, Lock, Layers } from "lucide-react";
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
      className={`relative overflow-hidden rounded-xl group w-full ${locked ? "select-none" : ""}`}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/30 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div
        className="relative rounded-xl bg-card border border-border/50 overflow-hidden transition-all duration-300 group-hover:border-primary/30 group-hover:-translate-y-0.5"
        style={{ boxShadow: "var(--card-shadow)" }}
      >
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-accent via-primary to-accent" />

        {coupon.isPremium && (
          <div className="absolute top-[2px] right-0 z-10">
            <div className="bg-gradient-to-l from-accent to-accent/80 text-accent-foreground px-3 py-1.5 text-[10px] font-display font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1.5 shadow-lg">
              <Crown className="w-3 h-3" />
              Premium
            </div>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-display font-bold text-foreground text-sm">{coupon.name}</h3>
            </div>
            <Badge variant={statusVariant[coupon.status]}>
              {statusLabel[coupon.status]}
            </Badge>
          </div>

          {locked ? (
            <Link to="/premium">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex flex-col items-center justify-center py-8 gap-2.5 rounded-xl bg-gradient-to-b from-muted/60 to-muted/30 border border-border/50 cursor-pointer hover:border-accent/40 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-accent" />
                </div>
                <p className="font-display text-sm font-bold text-accent">Unlock with Premium</p>
                <p className="text-[11px] text-muted-foreground">Click to view plans</p>
              </motion.div>
            </Link>
          ) : (
            <>
              {/* Matches */}
              <div className="space-y-2">
                {coupon.matches.map((match, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className="bg-muted/30 rounded-xl p-3.5 border border-border/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-2.5 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center ring-1 ring-border/50 shrink-0">
                            <TeamLogo teamName={match.homeTeam} size={18} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{match.homeTeam}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center ring-1 ring-border/50 shrink-0">
                            <TeamLogo teamName={match.awayTeam} size={18} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{match.awayTeam}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pt-1">
                        <span className="text-[10px] text-muted-foreground">{match.prediction}</span>
                        <span className="font-display font-bold text-accent text-base">{match.odds.toFixed(2)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-3.5 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">Matches</p>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" />
                    <p className="font-display font-bold text-foreground text-lg leading-none">{coupon.matches.length}</p>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3.5 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-1.5">Total Odds</p>
                  <p className="font-display font-bold text-primary text-lg leading-none">{coupon.totalOdds.toFixed(2)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center pt-2 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(coupon.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CouponCard;
