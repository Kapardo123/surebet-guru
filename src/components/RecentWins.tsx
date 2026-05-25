import { useState } from "react";
import { Tip } from "@/components/TipCard";
import { Coupon } from "@/lib/couponStorage";
import { FeaturedPick } from "@/lib/featuredPickStorage";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, Star, Ticket, ChevronDown, ChevronUp, X, Crown } from "lucide-react";

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
  couponData?: Coupon; // Pełne dane kuponu do wyświetlenia
};

const RecentWins = ({ tips, coupons = [], heroPick }: RecentWinsProps) => {
  const [expandedCouponId, setExpandedCouponId] = useState<string | null>(null);

  // Połącz wszystkie wygrane elementy
  const allWins: WinItem[] = [];

  // Dodaj wygrane tipy
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

  // Dodaj wygrane kupony (dla WSZYSTKICH użytkowników!)
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
          couponData: coupon // Zapisz pełne dane kuponu!
        });
      }
    });

  // Dodaj wygrany hero pick
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

  // Sortuj po kickoff (najnowsze pierwsze)
  const sortedWins = allWins
    .sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    .slice(0, 8);

  if (sortedWins.length === 0) return null;

  const handleCouponClick = (itemId: string) => {
    if (expandedCouponId === itemId) {
      setExpandedCouponId(null); // Zwiń jeśli już rozwinięte
    } else {
      setExpandedCouponId(itemId); // Rozwiń ten kupon
    }
  };

  const getTypeIcon = (type: WinItem['type']) => {
    switch (type) {
      case 'hero': return <Star className="w-3 h-3 text-yellow-500" />;
      case 'coupon': return <Ticket className="w-3 h-3 text-blue-500" />;
      default: return <TrendingUp className="w-3 h-3 text-green-500" />;
    }
  };

  const getTypeBadge = (item: WinItem) => {
    if (item.type === 'hero') {
      return <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 text-yellow-600 border-yellow-500/30">HERO</Badge>;
    }
    if (item.type === 'coupon') {
      return <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 text-blue-600 border-blue-500/30">COUPON</Badge>;
    }
    return null;
  };

  // Komponent do wyświetlania rozwiniętego kuponu
  const ExpandedCouponView = ({ coupon }: { coupon: Coupon }) => (
    <div className="mt-2 p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl space-y-3">
      {/* Nagłówek kuponu */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ticket className="w-4 h-4 text-blue-500" />
          <h4 className="font-display text-sm font-bold text-blue-400">{coupon.name}</h4>
          {coupon.isPremium && <Crown className="w-3.5 h-3.5 text-accent" />}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpandedCouponId(null);
          }}
          className="p-1 hover:bg-red-500/20 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Info o kuponie */}
      <div className="flex items-center gap-3 text-[11px]">
        <Badge variant="win" className="text-[10px]">WON ✓</Badge>
        <span className="text-muted-foreground">{coupon.matches.length} picks</span>
        <span className="font-bold text-green-500">Total Odds: @ {coupon.totalOdds.toFixed(2)}</span>
        {coupon.stake && <span className="text-muted-foreground">Stake: ${coupon.stake}</span>}
      </div>

      {/* Lista meczów */}
      <div className="space-y-2">
        {coupon.matches.map((match, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2.5 bg-card/60 rounded-lg"
          >
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <TeamLogo teamName={match.homeTeam} size={14} />
                <span className="text-[11px] font-medium">{match.homeTeam}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-6">
                <TeamLogo teamName={match.awayTeam} size={14} />
                <span className="text-[11px] font-medium text-muted-foreground">{match.awayTeam}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Badge variant="win" className="text-[9px] px-1.5 py-0 h-4">
                {match.prediction}
              </Badge>
              <span className="text-[10px] font-bold text-green-500">@ {match.odds}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Stopka */}
      <div className="pt-2 border-t border-border/30 text-[10px] text-muted-foreground text-center">
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
    <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-green-500" />
          <h3 className="font-display text-sm font-bold text-green-500 uppercase tracking-wider">
            Recent Wins
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground bg-green-500/10 px-2 py-1 rounded-full">
          {sortedWins.length} wins
        </span>
      </div>

      <div className="space-y-2">
        {sortedWins.map((item, index) => (
          <div key={item.id}>
            {/* Główny element */}
            <div
              onClick={() => item.type === 'coupon' && handleCouponClick(item.id)}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-card/50 rounded-xl transition-all cursor-default ${
                item.type === 'coupon'
                  ? 'hover:bg-card/80 cursor-pointer group active:scale-[0.99]'
                  : 'hover:bg-card/80'
              } ${expandedCouponId === item.id ? 'ring-2 ring-blue-500/50 bg-card/70' : ''}`}
            >
              {/* Numer + typ */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-500 text-[10px] font-bold shrink-0">
                  {index + 1}
                </div>
                {getTypeIcon(item.type)}
                {item.type === 'coupon' && (
                  expandedCouponId === item.id
                    ? <ChevronUp className="w-3 h-3 text-blue-500" />
                    : <ChevronDown className="w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>

              {/* Drużyny */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <TeamLogo teamName={item.homeTeam} size={16} />
                  <span className="text-xs font-medium truncate">{item.homeTeam}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-7">
                  <TeamLogo teamName={item.awayTeam} size={16} />
                  <span className="text-xs font-medium text-muted-foreground truncate">{item.awayTeam}</span>
                </div>
              </div>

              {/* Info o wygranej */}
              <div className="flex items-center gap-2 pl-9 sm:pl-0 sm:shrink-0">
                {getTypeBadge(item)}
                <Badge variant="win" className="text-[9px] px-1.5 py-0 h-4">
                  {item.prediction}
                </Badge>
                <span className="text-[10px] font-medium text-green-500">@ {item.odds}</span>
              </div>
            </div>

            {/* Rozwinięty widok kuponu */}
            {item.type === 'coupon' && expandedCouponId === item.id && item.couponData && (
              <ExpandedCouponView coupon={item.couponData} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-green-500/10 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>Latest: {new Date(sortedWins[0].kickoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-60">
          <TrendingUp className="w-3 h-3" /> Tips
          {coupons.some(c => c.status === 'won') && (
            <>
              <Ticket className="w-3 h-3 ml-1" /> Coupons
            </>
          )}
          {heroPick?.status === 'won' && (
            <>
              <Star className="w-3 h-3 ml-1" /> Hero
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentWins;
