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

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.length < 3) return null;
  
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    const data = await res.json();
    const query = normalize(teamName);
    const teams = data.teams || [];

    const best = teams
      .map((team: any) => ({ team, score: scoreTeamMatch(team, query) }))
      .sort((a: any, b: any) => b.score - a.score)[0];

    return best?.score >= 60 ? best.team?.strBadge || null : null;
  } catch (err) {
    console.error("Error fetching logo for", teamName, err);
    return null;
  }
};
