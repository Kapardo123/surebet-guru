import { useUpcomingMatches, UpcomingMatch } from "@/hooks/useUpcomingMatches";
import { Calendar, Loader2, TrendingUp } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";

interface Props {
  teamName: string;
  onSelectMatch: (match: UpcomingMatch) => void;
}

const UpcomingMatchesList = ({ teamName, onSelectMatch }: Props) => {
  const { matches, loading } = useUpcomingMatches(teamName);

  if (teamName.length < 3) return null;

  if (loading) {
    return (
      <div className="col-span-full flex items-center gap-2 text-muted-foreground text-xs py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Searching upcoming matches & odds...
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="col-span-full space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          Upcoming matches from Odds-API
        </p>
        <Badge variant="outline" className="text-[9px] opacity-70">LIVE ODDS</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelectMatch(match)}
            className="flex flex-col gap-2 bg-muted/30 border border-border/50 rounded-xl p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <TeamLogo teamName={match.homeTeam} size={16} />
                <span className="text-[11px] font-bold text-foreground truncate">{match.homeTeam}</span>
              </div>
              <span className="text-[9px] text-muted-foreground shrink-0">vs</span>
              <div className="flex items-center gap-1.5 overflow-hidden justify-end">
                <span className="text-[11px] font-bold text-foreground truncate">{match.awayTeam}</span>
                <TeamLogo teamName={match.awayTeam} size={16} />
              </div>
            </div>

            {match.odds && (
              <div className="grid grid-cols-3 gap-1 mt-auto">
                <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase leading-none mb-1">1</p>
                  <p className="text-[10px] font-bold text-primary">{match.odds.homeWin?.toFixed(2) || "-"}</p>
                </div>
                <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase leading-none mb-1">X</p>
                  <p className="text-[10px] font-bold text-muted-foreground">{match.odds.draw?.toFixed(2) || "-"}</p>
                </div>
                <div className="bg-background/50 rounded-md p-1.5 border border-border/30 text-center">
                  <p className="text-[8px] text-muted-foreground uppercase leading-none mb-1">2</p>
                  <p className="text-[10px] font-bold text-accent">{match.odds.awayWin?.toFixed(2) || "-"}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1 pt-1 border-t border-border/20">
              <span className="truncate max-w-[100px]">{match.league}</span>
              <span className="font-medium">{match.date} {match.time}</span>
            </div>
            
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <TrendingUp className="w-3 h-3 text-primary" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UpcomingMatchesList;
