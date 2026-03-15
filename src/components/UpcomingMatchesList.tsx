import { useUpcomingMatches, UpcomingMatch } from "@/hooks/useUpcomingMatches";
import { Calendar, Loader2 } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";

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
        Searching upcoming matches...
      </div>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="col-span-full space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5" />
        Upcoming matches — click to auto-fill
      </p>
      <div className="grid gap-2 md:grid-cols-3">
        {matches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onSelectMatch(match)}
            className="flex flex-col gap-1.5 bg-muted/50 border border-border/50 rounded-xl p-3 text-left hover:border-primary/50 hover:bg-muted transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <TeamLogo teamName={match.homeTeam} size={18} />
              <span className="text-xs font-display font-semibold text-foreground truncate">
                {match.homeTeam}
              </span>
              <span className="text-[10px] text-muted-foreground">vs</span>
              <span className="text-xs font-display font-semibold text-foreground truncate">
                {match.awayTeam}
              </span>
              <TeamLogo teamName={match.awayTeam} size={18} />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{match.league}</span>
              <span>•</span>
              <span>{match.date} {match.time}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default UpcomingMatchesList;
