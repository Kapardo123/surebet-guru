import { useState, useEffect } from "react";
import { fetchStandings, getTournamentSeasons, StandingsResponse, Standing } from "@/lib/sportApi";
import TeamLogo from "@/components/TeamLogo";
import { Loader2, Trophy, TrendingUp, ChevronDown } from "lucide-react";

interface StandingsTableProps {
  uniqueTournamentId: number;
  tournamentName?: string;
  compact?: boolean;
  onTeamClick?: (teamId: number, teamName: string) => void;
}

const formColors: Record<string, string> = {
  W: "bg-green-500",
  D: "bg-yellow-500",
  L: "bg-red-500",
  w: "bg-green-500",
  d: "bg-yellow-500",
  l: "bg-red-500"
};

const StandingsTable = ({ uniqueTournamentId, tournamentName, compact = false, onTeamClick }: StandingsTableProps) => {
  const [standings, setStandings] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [showSeasonSelect, setShowSeasonSelect] = useState(false);

  useEffect(() => {
    const loadSeasons = async () => {
      const seasonsData = await getTournamentSeasons(uniqueTournamentId);
      if (seasonsData.length > 0) {
        setSeasons(seasonsData);
        const currentSeason = seasonsData.find((s: any) => s.year.includes("2024") || s.year.includes("2025"));
        setSelectedSeason(currentSeason?.id || seasonsData[0]?.id);
      } else {
        setSelectedSeason(1);
      }
    };
    loadSeasons();
  }, [uniqueTournamentId]);

  useEffect(() => {
    if (!selectedSeason) return;

    const loadStandings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStandings(uniqueTournamentId, selectedSeason);
        if (data) {
          setStandings(data);
        } else {
          setError("Failed to load standings");
        }
      } catch (err) {
        setError("Failed to load standings");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStandings();
  }, [uniqueTournamentId, selectedSeason]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !standings) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        {error || "No standings available"}
      </div>
    );
  }

  const primaryStandings = standings.standings[0] || [];

  if (compact) {
    return (
      <div className="space-y-1">
        {primaryStandings.slice(0, 5).map((row) => (
          <div
            key={row.team.id}
            className="flex items-center gap-2 text-xs hover:bg-muted/50 rounded px-2 py-1 cursor-pointer"
            onClick={() => onTeamClick?.(row.team.id, row.team.name)}
          >
            <span className="w-6 text-center font-medium text-muted-foreground">{row.position}</span>
            <TeamLogo teamName={row.team.name} teamId={row.team.id} size={16} />
            <span className="flex-1 truncate font-medium">{row.team.shortName}</span>
            <span className="text-muted-foreground">{row.points}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-accent" />
          <h3 className="font-bold text-sm">{standings.tournament.name}</h3>
        </div>
        {seasons.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSeasonSelect(!showSeasonSelect)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {standings.season.name || `Season ${selectedSeason}`}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showSeasonSelect && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                {seasons.map((season) => (
                  <button
                    key={season.id}
                    onClick={() => {
                      setSelectedSeason(season.id);
                      setShowSeasonSelect(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                      selectedSeason === season.id ? "bg-muted font-medium" : ""
                    }`}
                  >
                    {season.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-2 px-1 w-6">#</th>
              <th className="text-left py-2 px-1">Team</th>
              <th className="text-center py-2 px-1 w-8">P</th>
              <th className="text-center py-2 px-1 w-8">W</th>
              <th className="text-center py-2 px-1 w-8">D</th>
              <th className="text-center py-2 px-1 w-8">L</th>
              <th className="text-center py-2 px-1 w-8">GD</th>
              <th className="text-center py-2 px-1 w-8 font-medium">Pts</th>
              <th className="text-center py-2 px-1 w-16">Form</th>
            </tr>
          </thead>
          <tbody>
            {primaryStandings.map((row) => (
              <tr
                key={row.team.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => onTeamClick?.(row.team.id, row.team.name)}
              >
                <td className="py-2 px-1">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                    row.position <= 4 ? "bg-accent/20 text-accent" :
                    row.position >= primaryStandings.length - 2 ? "bg-red-500/20 text-red-500" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {row.position}
                  </span>
                </td>
                <td className="py-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <TeamLogo teamName={row.team.name} teamId={row.team.id} size={18} />
                    <span className="font-medium truncate max-w-[100px]">{row.team.name}</span>
                  </div>
                </td>
                <td className="py-2 px-1 text-center text-muted-foreground">{row.played}</td>
                <td className="py-2 px-1 text-center text-green-500">{row.win}</td>
                <td className="py-2 px-1 text-center text-yellow-500">{row.draw}</td>
                <td className="py-2 px-1 text-center text-red-500">{row.loss}</td>
                <td className={`py-2 px-1 text-center ${row.goalsDiff > 0 ? "text-green-500" : row.goalsDiff < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {row.goalsDiff > 0 ? "+" : ""}{row.goalsDiff}
                </td>
                <td className="py-2 px-1 text-center font-bold">{row.points}</td>
                <td className="py-2 px-1">
                  {row.form && row.form.length > 0 && (
                    <div className="flex items-center justify-center gap-0.5">
                      {row.form.slice(-5).map((result, idx) => (
                        <span
                          key={idx}
                          className={`w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center ${formColors[result] || "bg-muted"}`}
                        >
                          {result.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StandingsTable;
