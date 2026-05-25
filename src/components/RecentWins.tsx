import { Tip } from "@/components/TipCard";
import { Coupon } from "@/lib/couponStorage";
import { FeaturedPick } from "@/lib/featuredPickStorage";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, Star, Ticket } from "lucide-react";

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
  name?: string; // dla kuponów
  isPremium?: boolean;
};

const RecentWins = ({ tips, coupons = [], heroPick }: RecentWinsProps) => {
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
      // Użyj pierwszego meczu jako reprezentatywnego
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
          isPremium: coupon.isPremium
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
    .slice(0, 8); // Pokaż max 8 ostatnich wygranych

  if (sortedWins.length === 0) return null;

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
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-card/50 rounded-xl hover:bg-card/80 transition-colors group"
          >
            {/* Numer + typ */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-500 text-[10px] font-bold shrink-0">
                {index + 1}
              </div>
              {getTypeIcon(item.type)}
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
