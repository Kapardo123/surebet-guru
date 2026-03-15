import { useState, useEffect, useRef } from "react";

export interface UpcomingMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  league: string;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const scoreTeamMatch = (team: any, query: string) => {
  const names = [team?.strTeam, team?.strTeamShort, team?.strTeamAlternate].filter(Boolean).map(normalize);

  if (names.some((name) => name === query)) return 100;
  if (names.some((name) => name.startsWith(query))) return 80;
  if (names.some((name) => name.includes(query))) return 60;
  return 0;
};

export const useUpcomingMatches = (teamName: string) => {
  const [matches, setMatches] = useState<UpcomingMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    abortRef.current?.abort();

    if (!teamName || teamName.length < 3) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    timerRef.current = setTimeout(async () => {
      try {
        const teamQuery = normalize(teamName);

        const teamRes = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`,
          { signal: controller.signal }
        );
        const teamData = await teamRes.json();
        const teams = teamData.teams || [];

        const bestTeam = teams
          .map((team: any) => ({ team, score: scoreTeamMatch(team, teamQuery) }))
          .sort((a: any, b: any) => b.score - a.score)[0];

        const targetTeamName = bestTeam?.score >= 60 ? bestTeam.team.strTeam : teamName;
        const normalizedTarget = normalize(targetTeamName);

        const eventsRes = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=${encodeURIComponent(targetTeamName)}`,
          { signal: controller.signal }
        );
        const eventsData = await eventsRes.json();
        const rawEvents = eventsData.event || eventsData.events || [];

        const today = new Date().toISOString().slice(0, 10);

        const filtered = rawEvents
          .filter((event: any) => {
            const home = normalize(event.strHomeTeam || "");
            const away = normalize(event.strAwayTeam || "");
            const date = event.dateEvent || "";

            const involvesTeam =
              home.includes(normalizedTarget) ||
              away.includes(normalizedTarget) ||
              normalizedTarget.includes(home) ||
              normalizedTarget.includes(away);

            const isUpcoming = date >= today;
            return involvesTeam && isUpcoming;
          })
          .sort((a: any, b: any) => {
            const aDate = `${a.dateEvent || ""}T${a.strTime || "00:00:00"}`;
            const bDate = `${b.dateEvent || ""}T${b.strTime || "00:00:00"}`;
            return aDate.localeCompare(bDate);
          })
          .slice(0, 3)
          .map((event: any) => ({
            id: event.idEvent,
            homeTeam: event.strHomeTeam,
            awayTeam: event.strAwayTeam,
            date: event.dateEvent,
            time: event.strTime?.slice(0, 5) || "TBD",
            league: event.strLeague,
          }));

        if (!controller.signal.aborted) {
          setMatches(filtered);
          setLoading(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setMatches([]);
          setLoading(false);
        }
      }
    }, 700);

    return () => {
      clearTimeout(timerRef.current);
      controller.abort();
    };
  }, [teamName]);

  return { matches, loading };
};
