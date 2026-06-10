const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const scoreTeamMatch = (team: any, query: string) => {
  let score = 0;
  const normalizedQuery = normalize(query);

  const names = [team?.strTeam, team?.strTeamShort, team?.strTeamAlternate]
    .filter(Boolean)
    .map(normalize);

  if (names.some((name) => name === normalizedQuery)) {
    score = 200;
  } else if (
    names.some(
      (name) => name.includes(normalizedQuery) && normalizedQuery.length >= 4,
    )
  ) {
    const matchLength = normalizedQuery.length;
    const teamNameLength = Math.max(...names.map((n) => n.length));
    score = Math.round(100 + (matchLength / teamNameLength) * 50);
  } else if (team?.strKeywords) {
    const keywords = team.strKeywords
      .toLowerCase()
      .split(",")
      .map((k: string) => k.trim());
    if (keywords.includes(normalizedQuery)) {
      score = 100;
    }
  }

  return score;
};

export interface LogoCandidate {
  url: string;
  source: string;
  teamName: string;
}

const fetchSportsDBLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const baseClean = teamName.replace(/[^a-zA-Z0-9\s]/g, "").trim();

  const variations = [
    teamName,
    `${teamName} FC`,
    `FC ${teamName}`,
    baseClean,
    `${baseClean} FC`,
    `${baseClean} CF`,
    `${baseClean} SC`,
    `${baseClean} SK`,
    `${baseClean} AC`,
    `${baseClean} AS`,
  ];

  const seen = new Set<string>();
  const results: LogoCandidate[] = [];

  for (const variation of variations) {
    if (seen.has(variation)) continue;
    seen.add(variation);

    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(
          variation,
        )}`,
      );
      const data = await res.json();
      const teams = data.teams || [];

      if (teams && teams.length > 0) {
        const scored = teams
          .map((team: any) => ({
            team,
            score: scoreTeamMatch(team, teamName),
          }))
          .sort((a: any, b: any) => b.score - a.score)
          .filter((t: any) => t.score >= 80);

        for (const entry of scored) {
          const team = entry.team;
          if (team.strBadge) {
            results.push({
              url: team.strBadge,
              source: "TheSportsDB",
              teamName: team.strTeam,
            });
          }
          if (team.strLogo && team.strLogo !== team.strBadge) {
            results.push({
              url: team.strLogo,
              source: "TheSportsDB",
              teamName: team.strTeam,
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return results;
};

const fetchWikipediaLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const baseClean = teamName.replace(/[^a-zA-Z0-9\s]/g, "").trim();

  const searchTerms = [
    teamName,
    `${teamName} FC`,
    `${teamName} football`,
    `${teamName} (football club)`,
    `FC ${teamName}`,
    baseClean,
    `${baseClean} FC`,
    `${baseClean} football`,
    `${baseClean} (football club)`,
  ];

  const seen = new Set<string>();
  const results: LogoCandidate[] = [];

  for (const term of searchTerms) {
    try {
      const cleanTerm = term.replace(/\s+/g, "_");
      if (!cleanTerm || cleanTerm.length < 3 || seen.has(cleanTerm)) continue;
      seen.add(cleanTerm);

      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        cleanTerm,
      )}`;
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();

        const description = (wikiData.description || "").toLowerCase();
        const title = (wikiData.title || "").toLowerCase();
        const pageTitle = title;

        const normalizedTeam = normalize(teamName);
        const normalizedPageTitle = normalize(pageTitle);

        const titleMatches =
          normalizedPageTitle.includes(normalizedTeam) ||
          normalizedTeam.includes(normalizedPageTitle);

        const isSportsTeam =
          description.includes("club") ||
          description.includes("team") ||
          description.includes("football") ||
          description.includes("soccer") ||
          description.includes("sports") ||
          title.includes("f.c") ||
          title.includes("fc");

        if (
          wikiData.thumbnail?.source &&
          isSportsTeam &&
          !wikiData.title.includes("disambiguation") &&
          titleMatches
        ) {
          results.push({
            url: wikiData.thumbnail.source,
            source: "Wikipedia",
            teamName: wikiData.title,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return results;
};

const fetchSofaScoreLogos = async (
  teamName: string): Promise<LogoCandidate[]> => {
  const cleanName = teamName.replace(/[^a-zA-Z0-9\s]/g, "").trim();

  const searchTerms = [
    teamName,
    `${teamName} FC`,
    cleanName,
    `${cleanName} FC`,
  ];

  const seen = new Set<string>();
  const results: LogoCandidate[] = [];

  for (const term of searchTerms) {
    try {
      const res = await fetch(
        `https://api.sofascore.com/api/v1/search/teams?q=${encodeURIComponent(term)}`,
      );
      const data = await res.json();
      const teams = data.results || [];

      if (teams.length === 0) continue;

      for (const teamEntry of teams) {
        const team = teamEntry.team || teamEntry;
        const teamId = team?.id;
        const tName = team?.name || team?.teamName;
        if (!teamId || !tName) continue;

        const normalized = normalize(tName);
        const normalizedQuery = normalize(teamName);

        let score = 0;
        if (normalized === normalizedQuery) score = 200;
        else if (normalized.includes(normalizedQuery) && normalizedQuery.length >= 4) score = 120;
        else if (normalizedQuery.includes(normalized)) score = 80;
        else continue;

        results.push({
          url: `https://api.sofascore.com/api/v1/team/${teamId}/image`,
          source: "SofaScore",
          teamName: tName,
        });
      }
    } catch {
      continue;
    }
  }

  return results;
};

export const fetchTeamLogoUrl = async (
  teamName: string,
): Promise<string | null> => {
  if (!teamName || teamName.length < 3) return null;

  const sportsDB = await fetchSportsDBLogos(teamName);
  if (sportsDB.length > 0) return sportsDB[0].url;

  const sofa = await fetchSofaScoreLogos(teamName);
  if (sofa.length > 0) return sofa[0].url;

  const wiki = await fetchWikipediaLogos(teamName);
  if (wiki.length > 0) return wiki[0].url;

  return null;
};

export const fetchTeamLogoCandidates = async (
  teamName: string,
): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.length < 3) return [];

  const [sportsDB, sofa, wiki] = await Promise.all([
    fetchSportsDBLogos(teamName).catch(() => []),
    fetchSofaScoreLogos(teamName).catch(() => []),
    fetchWikipediaLogos(teamName).catch(() => []),
  ]);

  const unique = new Map<string, LogoCandidate>();
  for (const c of [...sportsDB, ...sofa, ...wiki]) {
    if (!unique.has(c.url)) unique.set(c.url, c);
  }

  return Array.from(unique.values());
};
