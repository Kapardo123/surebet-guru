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
  wonAt?: string | null;
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
        wonAt: tip.wonAt || null,
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
          wonAt: coupon.wonAt || null,
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
      wonAt: null,
      isPremium: true
    });
  }

  const sortedWins = allWins
    .sort((a, b) => {
      const dateA = a.wonAt ? new Date(a.wonAt).getTime() : new Date(a.kickoff).getTime();
      const dateB = b.wonAt ? new Date(b.wonAt).getTime() : new Date(b.kickoff).getTime();
      return dateB - dateA;
    })
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
    <div className="mt-2 p-2.5 sm:p-3 md:p-4 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-400/30 rounded-xl space-y-2 sm:space-y-2.5 md:space-y-3 shadow-lg shadow-blue-500/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 min-w-0 flex-1">
          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
            <Ticket className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-display text-[11px] sm:text-xs md:text-sm font-bold text-blue-400 truncate">{coupon.name}</h4>
            {coupon.sport && (
              <span className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground block truncate">{coupon.sport}</span>
            )}
          </div>
          {coupon.isPremium && <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-blue-400 flex-shrink-0" />}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedCouponId(null);
          }}
          className="p-1 sm:p-1.5 hover:bg-red-500/20 rounded-full transition-colors flex-shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center"
        >
          <X className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-2">
        <Badge variant="win" className="text-[8px] sm:text-[9px] md:text-[10px] px-1.5 sm:px-2 md:px-2 py-0">WON ✓</Badge>
        <span className="text-[9px] sm:text-[10px] md:text-[11px] text-muted-foreground bg-muted/50 px-1.5 sm:px-2 md:px-2.5 py-0.5 rounded-full">{coupon.matches.length} picks</span>
        <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 sm:px-2 md:px-2.5 py-0.5 rounded-full">@ {coupon.totalOdds.toFixed(2)}</span>
        {coupon.stake && <span className="text-[9px] sm:text-[10px] md:text-[11px] text-muted-foreground bg-blue-500/10 px-1.5 sm:px-2 md:px-2.5 py-0.5 rounded-full">${coupon.stake}</span>}
      </div>

      {/* Matches list - Compact for mobile */}
      <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
        {coupon.matches.map((match, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 sm:p-2.5 md:p-3 bg-gradient-to-r from-card/80 to-card/40 rounded-lg border border-border/20 hover:border-blue-500/30 transition-all"
          >
            {/* Teams in one line on mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1">
                <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/30 flex-shrink-0">
                  <TeamLogo teamName={match.homeTeam} size={10} />
                </div>
                <span className="text-[10px] sm:text-[11px] md:text-xs font-semibold truncate">{match.homeTeam}</span>
              </div>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground/60 flex-shrink-0 hidden sm:inline">vs</span>
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 hidden sm:flex">
                <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/30 flex-shrink-0">
                  <TeamLogo teamName={match.awayTeam} size={10} />
                </div>
                <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground truncate">{match.awayTeam}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0 ml-1 sm:ml-2 md:ml-3">
              <Badge variant="win" className="text-[7px] sm:text-[8px] md:text-[9px] px-1 sm:px-1.5 md:px-2 py-0 h-4 sm:h-4 md:h-5 font-bold">
                {match.prediction}
              </Badge>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-cyan-400">@ {match.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="pt-1.5 sm:pt-2 md:pt-2.5 border-t border-border/20 text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground text-center flex items-center justify-center gap-0.5 sm:gap-1 md:gap-1.5">
        <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-blue-400" />
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

      <div className="relative bg-gradient-to-br from-card via-emerald-950/5 to-green-950/5 border border-emerald-500/30 rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg shadow-black/5">
        {/* Header - Compact on mobile */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-5 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm md:text-base font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent uppercase tracking-wider truncate">
                Recent Wins
              </h3>
              <p className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground font-medium tracking-wide">
                Latest {sortedWins.length} wins
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-2.5 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex-shrink-0">
            <Flame className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-orange-400" />
            <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-emerald-400">{sortedWins.length} wins</span>
          </div>
        </div>

        {/* Wins list - Compact spacing */}
        <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5">
          {sortedWins.map((item, index) => (
            <div key={item.id}>
              {/* Main item */}
              <div
                onClick={() => item.type === 'coupon' && handleCouponClick(item.id)}
                className={`flex gap-1.5 sm:gap-2 md:gap-3 p-2.5 sm:p-3 md:p-3.5 bg-gradient-to-r from-card/70 to-card/40 rounded-xl transition-all duration-200 ${
                  item.type === 'coupon'
                    ? 'hover:from-card/90 hover:to-card/70 cursor-pointer group active:scale-[0.99] hover:border-blue-500/30'
                    : 'hover:from-card/90 hover:to-card/70'
                } border border-border/20 ${expandedCouponId === item.id ? 'ring-2 ring-blue-500/50 from-card/90' : ''}`}
              >
                {/* Number + icon - Smaller on mobile */}
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white text-[9px] sm:text-[10px] md:text-[11px] font-bold shadow-md shadow-emerald-500/25">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {getTypeIcon(item.type)}
                    {item.type === 'coupon' && (
                      expandedCouponId === item.id
                        ? <ChevronUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-blue-400 transition-transform" />
                        : <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>

                {/* Content - More compact on mobile */}
                {item.type === 'coupon' ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center ring-2 ring-blue-500/30 shrink-0">
                      <PartyPopper className="w-3 w-3 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-blue-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] sm:text-[11px] md:text-xs font-bold text-blue-400 tracking-wide">COUPON WON</span>
                      <span className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground font-medium">Tap to view details</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 sm:gap-1.5 md:gap-2 min-w-0 flex-1">
                    {/* Home team */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/30 flex-shrink-0">
                        <TeamLogo teamName={item.homeTeam} size={12} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] md:text-xs font-semibold">{item.homeTeam}</span>
                    </div>
                    
                    {/* VS separator */}
                    <div className="flex items-center gap-1 sm:gap-1.5 ml-5 sm:ml-6 md:ml-7">
                      <span className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground/50 font-semibold">VS</span>
                    </div>
                    
                    {/* Away team - Always visible */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-green-500/10 flex items-center justify-center ring-1 ring-green-500/30 flex-shrink-0">
                        <TeamLogo teamName={item.awayTeam} size={12} />
                      </div>
                      <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground">{item.awayTeam}</span>
                    </div>
                  </div>
                )}

                {/* Win info - Compact badges */}
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 pl-6 sm:pl-8 md:pl-10 shrink-0 flex-wrap">
                  {getTypeBadge(item)}
                  <Badge variant="win" className="text-[7px] sm:text-[8px] md:text-[9px] px-1 sm:px-1.5 md:px-2 py-0 h-4 sm:h-4 md:h-5 font-bold">
                    {item.prediction}
                  </Badge>
                  <span className="text-[9px] sm:text-[10px] md:text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full">@ {item.odds}</span>
                  <span className="text-[7px] sm:text-[8px] md:text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
                    <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-emerald-400/50" />
                    {item.wonAt 
                      ? new Date(item.wonAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      : new Date(item.kickoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                    }
                  </span>
                </div>
              </div>

              {/* Expanded coupon view */}
              {item.type === 'coupon' && expandedCouponId === item.id && item.couponData && (
                <ExpandedCouponView coupon={item.couponData} />
              )}
            </div>
          ))}
        </div>

        {/* Footer - Smaller on mobile */}
        <div className="mt-2.5 sm:mt-3 md:mt-4 pt-2.5 sm:pt-3 md:pt-4 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
            <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-emerald-400" />
            <span className="font-medium">Latest win: {sortedWins[0]?.wonAt ? new Date(sortedWins[0].wonAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Today'}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 opacity-70">
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-emerald-400" /> 
            <span className="font-semibold">Tips</span>
            {coupons.some(c => c.status === 'won') && (
              <>
                <Ticket className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-blue-400 ml-0.5 sm:ml-1" /> 
                <span className="font-semibold">Coupons</span>
              </>
            )}
            {heroPick?.status === 'won' && (
              <>
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 text-yellow-400 ml-0.5 sm:ml-1" /> 
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
