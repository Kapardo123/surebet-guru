import { useState } from "react";
import { Tip } from "@/components/TipCard";
import { Coupon } from "@/lib/couponStorage";
import { FeaturedPick } from "@/lib/featuredPickStorage";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, Star, Ticket, ChevronDown, ChevronUp, X, Crown, PartyPopper, Sparkles, Flame } from "lucide-react";

interface RecentWinsProps {
  tips: Tip[];
  coupons?: Coupon[];
  heroPick?: FeaturedPick | null;
}

type WinItem = {
  type: 'tip' | 'coupon' | 'hero';
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number | string;
  kickoff: string;
  name?: string;
  isPremium?: boolean;
  couponData?: Coupon;
};

const RecentWins = ({ tips, coupons = [], heroPick }: RecentWinsProps) => {
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);

  const allWins: WinItem[] = [];

  tips
    .filter(tip => tip.status === "won")
    .forEach(tip => {
      allWins.push({
        type: 'tip',
        id: tip.id,
        homeTeam: tip.homeTeam,
        awayTeam: tip.awayTeam,
        prediction: tip.prediction,
        odds: tip.odds,
        kickoff: tip.kickoff,
        isPremium: tip.isPremium
      });
    });

  coupons
    .filter(coupon => coupon.status === "won")
    .forEach(coupon => {
      const firstMatch = coupon.matches[0];
      if (firstMatch) {
        allWins.push({
          type: 'coupon',
          id: `coupon-${coupon.id}`,
          homeTeam: firstMatch.homeTeam,
          awayTeam: firstMatch.awayTeam,
          prediction: coupon.name || `${coupon.matches.length} picks`,
          odds: coupon.totalOdds,
          kickoff: coupon.createdAt,
          name: coupon.name,
          isPremium: coupon.isPremium,
          couponData: coupon
        });
      }
    });

  if (heroPick && heroPick.status === "won") {
    allWins.push({
      type: 'hero',
      id: `hero-${heroPick.id || 'latest'}`,
      homeTeam: heroPick.homeTeam,
      awayTeam: heroPick.awayTeam,
      prediction: heroPick.prediction,
      odds: parseFloat(heroPick.odds) || heroPick.odds,
      kickoff: heroPick.kickoff,
      isPremium: true
    });
  }

  const sortedWins = allWins
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    .slice(0, 8);

  if (sortedWins.length === 0) return null;

  const handleCouponClick = (itemId: string) => {
    if (expandedCouponId === itemId) {
      setExpandedCouponId(null);
    } else {
      setExpandedCouponId(itemId);
    }
  };

  const getTypeIcon = (type: WinItem['type']) => {
    switch (type) {
      case 'hero': return <Star className="w-3.5 h-3.5 text-yellow-400 drop-shadow-sm" />;
      case 'coupon': return <Ticket className="w-3.5 h-3.5 text-blue-400 drop-shadow-sm" />;
      default: return <TrendingUp className="w-3.5 h-3.5 text-emerald-400 drop-shadow-sm" />;
    }
  };

  const getTypeBadge = (item: WinItem) => {
    if (item.type === 'hero') {
      return <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 bg-yellow-500/10 text-yellow-400 border-yellow-500/30 font-bold">HERO</Badge>;
    }
    if (item.type === 'coupon') {
      return <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-400 border-blue-500/30 font-bold">COUPON</Badge>;
    }
    return null;
  };

  const ExpandedCouponView = ({ coupon }: { coupon: Coupon }) => (
    <div className="mt-2 p-4 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-400/30 rounded-xl space-y-3 shadow-lg shadow-blue-500/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Ticket className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-blue-400">{coupon.name}</h4>
            {coupon.sport && (
              <span className="text-[10px] text-muted-foreground">{coupon.sport}</span>
            )}
          </div>
          {coupon.isPremium && <Crown className="w-4 h-4 text-blue-400" />}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedCouponId(null);
          }}
          className="p-1.5 hover:bg-red-500/20 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="win" className="text-[10px] px-2 py-0.5">WON ✓</Badge>
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">{coupon.matches.length} picks</span>
        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">@ {coupon.totalOdds.toFixed(2)}</span>
        {coupon.stake && <span className="text-[11px] text-muted-foreground bg-blue-500/10 px-2.5 py-1 rounded-full">${coupon.stake}</span>}
      </div>

      {/* Matches list */}
      <div className="space-y-2">
        {coupon.matches.map((match, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-card/80 to-card/40 rounded-lg border border-border/20 hover:border-blue-500/30 transition-all"
          >
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/30">
                  <TeamLogo teamName={match.homeTeam} size={14} />
                </div>
                <span className="text-xs font-semibold">{match.homeTeam}</span>
              </div>
              <div className="flex items-center gap-2 ml-7">
                <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/30">
                  <TeamLogo teamName={match.awayTeam} size={14} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{match.awayTeam}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Badge variant="win" className="text-[9px] px-2 py-0 h-5 font-bold">
                {match.prediction}
              </Badge>
              <span className="text-xs font-bold text-cyan-400">@ {match.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-border/20 text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Sparkles className="w-3 h-3 text-blue-400" />
        Won on {new Date(coupon.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-green-500/10 to-transparent opacity-60 pointer-events-none" />

      <div className="relative bg-gradient-to-br from-card via-emerald-950/5 to-green-950/5 border border-emerald-500/30 rounded-2xl p-5 md:p-6 shadow-lg shadow-black/5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent uppercase tracking-wider">
                Recent Wins
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide">Latest victories</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-bold text-emerald-400">{sortedWins.length} wins</span>
          </div>
        </div>

        {/* Wins list */}
        <div className="space-y-2.5">
          {sortedWins.map((item, index) => (
            <div key={item.id}>
              {/* Main item */}
              <div
                onClick={() => item.type === 'coupon' && handleCouponClick(item.id)}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-gradient-to-r from-card/70 to-card/40 rounded-xl transition-all duration-200 ${
                  item.type === 'coupon'
                    ? 'hover:from-card/90 hover:to-card/70 cursor-pointer group active:scale-[0.99] hover:border-blue-500/30'
                    : 'hover:from-card/90 hover:to-card/70'
                } border border-border/20 ${expandedCouponId === item.id ? 'ring-2 ring-blue-500/50 from-card/90' : ''}`}
              >
                {/* Number + icon */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white text-[11px] font-bold shadow-md shadow-emerald-500/25">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-1">
                    {getTypeIcon(item.type)}
                    {item.type === 'coupon' && (
                      expandedCouponId === item.id
                        ? <ChevronUp className="w-3.5 h-3.5 text-blue-400 transition-transform" />
                        : <ChevronDown className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>

                {/* Content */}
                {item.type === 'coupon' ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center ring-2 ring-blue-500/30 shrink-0">
                      <PartyPopper className="w-4.5 h-4.5 text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-blue-400 tracking-wide">COUPON WON</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Tap to view details</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/30">
                        <TeamLogo teamName={item.homeTeam} size={16} />
                      </div>
                      <span className="text-xs font-semibold truncate">{item.homeTeam}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-8">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center ring-1 ring-green-500/30">
                        <TeamLogo teamName={item.awayTeam} size={16} />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground truncate">{item.awayTeam}</span>
                    </div>
                  </div>
                )}

                {/* Win info */}
                <div className="flex items-center gap-2 pl-10 sm:pl-0 sm:shrink-0 flex-wrap">
                  {getTypeBadge(item)}
                  <Badge variant="win" className="text-[9px] px-2 py-0 h-5 font-bold">
                    {item.prediction}
                  </Badge>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">@ {item.odds}</span>
                </div>
              </div>

              {/* Expanded coupon view */}
              {item.type === 'coupon' && expandedCouponId === item.id && item.couponData && (
                <ExpandedCouponView coupon={item.couponData} />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">Latest: {new Date(sortedWins[0].kickoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
          </div>
          <div className="flex items-center gap-2 opacity-70">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> 
            <span className="font-semibold">Tips</span>
            {coupons.some(c => c.status === 'won') && (
              <>
                <Ticket className="w-3.5 h-3.5 text-blue-400 ml-1" /> 
                <span className="font-semibold">Coupons</span>
              </>
            )}
            {heroPick?.status === 'won' && (
              <>
                <Star className="w-3.5 h-3.5 text-yellow-400 ml-1" /> 
                <span className="font-semibold">Hero</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentWins;
