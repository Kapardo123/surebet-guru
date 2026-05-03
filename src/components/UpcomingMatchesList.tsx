import { useSportFixtures, EnhancedUpcomingMatch } from "@/hooks/useSportFixtures";
import { Calendar, Loader2, TrendingUp, Search } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface Props {
  onSelectMatch: (match: any) => void;
}

const UpcomingMatchesList = ({ onSelectMatch }: Props) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const { fixtures, loading } = useSportFixtures(date, searchTerm);

  return (
    <div className="col-span-full space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Find Match (SofaScore)
          </p>
          <Badge variant="outline" className="text-[9px] opacity-70">FAST LOADING</Badge>
        </div>
        
        <div className="flex gap-2">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-auto text-xs h-9"
          />
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input 
              placeholder="Filter team or league..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>
      </div>

      {searchTerm.length < 3 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-muted/20 border border-dashed border-border/50 rounded-xl text-center">
          <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Type at least 3 characters to find a match</p>
        </div>
      ) : loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-xl" />
          ))}
        </div>
      ) : fixtures.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {fixtures.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => onSelectMatch({
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                league: match.league,
                date: date,
                time: match.time || "TBD",
                homeLogo: match.homeLogo,
                awayLogo: match.awayLogo
              })}
              className="flex items-center justify-between gap-3 bg-card border border-border/50 rounded-xl p-3 text-left hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                <div className="flex items-center justify-between gap-2 pr-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <TeamLogo teamName={match.homeTeam} logoUrl={match.homeLogo || undefined} size={18} />
                    <span className="text-xs font-bold truncate">{match.homeTeam}</span>
                  </div>
                  {(match.homeScore !== null || match.isLive) && (
                    <span className={`text-xs font-black ${match.isLive ? 'text-accent animate-pulse' : 'text-muted-foreground'}`}>
                      {match.homeScore ?? 0}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 pr-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <TeamLogo teamName={match.awayTeam} logoUrl={match.awayLogo || undefined} size={18} />
                    <span className="text-xs font-bold truncate">{match.awayTeam}</span>
                  </div>
                  {(match.awayScore !== null || match.isLive) && (
                    <span className={`text-xs font-black ${match.isLive ? 'text-accent animate-pulse' : 'text-muted-foreground'}`}>
                      {match.awayScore ?? 0}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 border-l border-border/20 pl-3">
                <div className="flex items-center gap-1.5 text-primary">
                  <span className="text-[10px] font-bold">{match.time}</span>
                  <span className="text-[10px] font-medium opacity-80">{match.league}</span>
                </div>
                <span className="text-[9px] text-muted-foreground uppercase">{typeof match.status === 'string' ? match.status : 'unknown'}</span>
                <TrendingUp className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/50">
          <p className="text-xs text-muted-foreground">No matches found for "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default UpcomingMatchesList;
