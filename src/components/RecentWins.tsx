import { Tip } from "@/components/TipCard";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock } from "lucide-react";

interface RecentWinsProps {
  tips: Tip[];
}

const RecentWins = ({ tips }: RecentWinsProps) => {
  const wonTips = tips
    .filter(tip => tip.status === "won")
    .sort((a, b) => {
      const dateA = new Date(a.kickoff).getTime();
      const dateB = new Date(b.kickoff).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  if (wonTips.length === 0) return null;

  const totalOdds = wonTips.reduce((acc, tip) => acc * tip.odds, 1);

  return (
    <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-green-500" />
          <h3 className="font-display text-sm font-bold text-green-500 uppercase tracking-wider">
            Recent Wins
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Combined odds:</span>
          <Badge variant="win" className="text-[10px]">{totalOdds.toFixed(2)}</Badge>
        </div>
      </div>

      <div className="space-y-2.5">
        {wonTips.map((tip, index) => (
          <div
            key={tip.id}
            className="flex items-center gap-3 p-2.5 bg-card/50 rounded-xl hover:bg-card/80 transition-colors"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-500 text-[10px] font-bold shrink-0">
              {index + 1}
            </div>

            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <TeamLogo teamName={tip.homeTeam} logoUrl={tip.homeTeamLogo || undefined} size={16} />
              <span className="text-xs font-medium truncate">{tip.homeTeam}</span>
              <span className="text-muted-foreground text-xs">vs</span>
              <TeamLogo teamName={tip.awayTeam} logoUrl={tip.awayTeamLogo || undefined} size={16} />
              <span className="text-xs font-medium truncate">{tip.awayTeam}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="win" className="text-[9px] px-1.5 py-0 h-4">
                {tip.prediction}
              </Badge>
              <span className="text-[10px] font-medium text-green-500">@ {tip.odds}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-green-500/10 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{wonTips.length} winning picks</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Latest: {new Date(wonTips[0].kickoff).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        </div>
      </div>
    </div>
  );
};

export default RecentWins;