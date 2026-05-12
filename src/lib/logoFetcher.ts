const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const scoreTeamMatch = (team: any, query: string) => {
  let score = 0;
  const normalizedQuery = normalize(query);
  
  // Check all name fields
  const names = [team?.strTeam, team?.strTeamShort, team?.strTeamAlternate].filter(Boolean).map(normalize);
  
  // Exact match is best
  if (names.some((name) => name === normalizedQuery)) {
    score = 200;
  }
  // Exact match in keywords (if exists)
  else if (team?.strKeywords) {
    const keywords = team.strKeywords.toLowerCase().split(',').map(k => k.trim());
    if (keywords.includes(normalizedQuery)) {
      score = 150;
    }
  }
  // Name starts with query
  else if (names.some((name) => name.startsWith(normalizedQuery))) {
    score = 100;
  }
  // Name includes query (but also check that query isn't just a small part)
  else if (names.some((name) => name.includes(normalizedQuery)) && normalizedQuery.length >= 4) {
    score = 60;
  }
  
  return score;
};

const fetchWikipediaLogo = async (teamName: string): Promise<string | null> => {
  const searchTerms = [
    teamName,
    `${teamName} FC`,
    `${teamName} football`,
    `${teamName} (football club)`,
    `${teamName} SK`,
    `${teamName} JK`
  ];

  for (const term of searchTerms) {
    try {
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replace(/\s+/g, '_'))}`;
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        
        const description = (wikiData.description || "").toLowerCase();
        const title = (wikiData.title || "").toLowerCase();
        const isSportsTeam = 
          description.includes("club") || 
          description.includes("team") || 
          description.includes("football") || 
          description.includes("soccer") ||
          description.includes("sports") ||
          description.includes("association") ||
          title.includes("f.c") ||
          title.includes("fc");

        if (wikiData.thumbnail?.source && isSportsTeam && !wikiData.title.includes("disambiguation")) {
          console.log(`[LogoFetcher] Found Wikipedia logo for "${term}"`);
          return wikiData.thumbnail.source;
        }
      }
    } catch {
      continue;
    }
  }
  
  return null;
};

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.length < 3) return null;
  
  try {
    // 1. Try TheSportsDB
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    const data = await res.json();
    const teams = data.teams || [];

    console.log("Teams from TheSportsDB:", teams.map((t: any) => ({ name: t.strTeam, id: t.idTeam })));

    const best = teams
      .map((team: any) => ({ team, score: scoreTeamMatch(team, teamName) }))
      .sort((a: any, b: any) => b.score - a.score)[0];

    if (best?.score >= 60 && best.team?.strBadge) {
      console.log("Best match from TheSportsDB:", best);
      return best.team.strBadge;
    }

    // 2. If no luck on TheSportsDB, try Wikipedia
    console.log("Trying Wikipedia for logo...");
    const wikiLogo = await fetchWikipediaLogo(teamName);
    return wikiLogo;
  } catch (err) {
    console.error("Error fetching logo for", teamName, err);
    return null;
  }
};
