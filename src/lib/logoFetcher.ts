// ============ POMOCNICZE ============

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const makeQueries = (teamName: string): string[] => {
  const clean = teamName.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const queries: string[] = [];
  const set = new Set<string>();

  const add = (q: string) => {
    if (q && q.length >= 3 && !set.has(q.toLowerCase())) {
      set.add(q.toLowerCase());
      queries.push(q);
    }
  };

  add(teamName.trim());
  add(clean);
  add(`${clean} FC`);
  add(`${clean} football`);
  add(`FC ${clean}`);

  return queries.slice(0, 4);
};

// Prostosc: dopasowanie substr + normalize
const matches = (candidate: string, query: string): number => {
  const c = normalize(candidate);
  const q = normalize(query);
  if (!c || !q) return 0;
  if (c === q) return 200;
  if (c.includes(q) || q.includes(c)) return 120;

  // Token match
  const ct = c.split(/\s+/).filter((t) => t.length > 2);
  const qt = q.split(/\s+/).filter((t) => t.length > 2);
  let matches = 0;
  for (const token of qt) {
    if (ct.some((t) => t === token || t.includes(token) || token.includes(t))) {
      matches++;
    }
  }
  if (qt.length > 0) return Math.round((matches / qt.length) * 100);
  return 0;
};

// ============ INTERFEJS ============

export interface LogoCandidate {
  url: string;
  source: string;
  teamName: string;
  score?: number;
}

// ============ TheSportsDB ============

const fetchSportsDBLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const queries = makeQueries(teamName);
  const seen = new Set<string>();
  const results: LogoCandidate[] = [];

  for (const query of queries) {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/1/searchteams.php?t=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.teams || !Array.isArray(data.teams)) continue;

      for (const team of data.teams) {
        if (!team) continue;
        const name = team.strTeam || "";
        const score = matches(name, teamName);
        if (score < 40) continue;

        const candidateFields = [
          team.strBadge,
          team.strLogo,
          team.strTeamBadge,
          team.strTeamLogo,
        ].filter((u): u is string => !!u && typeof u === "string" && u.startsWith("http"));

        for (const imgUrl of candidateFields) {
          if (!seen.has(imgUrl)) {
            seen.add(imgUrl);
            results.push({ url: imgUrl, source: "TheSportsDB", teamName: name, score });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return results;
};

// ============ SofaScore ============

const fetchSofaScoreLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const queries = makeQueries(teamName);
  const seenTeams = new Set<number>();
  const results: LogoCandidate[] = [];

  for (const query of queries) {
    try {
      const url = `https://api.sofascore.com/api/v1/search/teams?q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const items = data?.results || [];
      if (!Array.isArray(items) || items.length === 0) continue;

      for (const item of items) {
        const team = item.team || item;
        const teamId = team?.id;
        const name = team?.name || "";
        if (!teamId || seenTeams.has(teamId)) continue;
        seenTeams.add(teamId);

        const score = matches(name, teamName);
        if (score < 30) continue;

        const imgUrl = `https://api.sofascore.com/api/v1/team/${teamId}/image`;
        results.push({ url: imgUrl, source: "SofaScore", teamName: name, score });
      }
    } catch {
      continue;
    }
  }

  return results;
};

// ============ Wikipedia ============

const fetchWikipediaLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const queries = makeQueries(teamName);
  const seen = new Set<string>();
  const results: LogoCandidate[] = [];

  for (const query of queries) {
    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const titles: string[] = searchData?.[1] || [];
      if (titles.length === 0) continue;

      const pagePromises = titles.map(async (title: string) => {
        try {
          const score = matches(title, teamName);
          if (score < 25) return null;

          const lower = title.toLowerCase();
          const isSports =
            lower.includes("football") ||
            lower.includes("club") ||
            lower.includes("team") ||
            lower.includes("soccer") ||
            lower.includes(" fc") ||
            lower.includes("basketball") ||
            lower.includes("hockey") ||
            lower.includes("sport");

          if (!isSports && score < 70) return null;

          const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
          const pageRes = await fetch(pageUrl);
          if (!pageRes.ok) return null;

          const pageData = await pageRes.json();
          const thumb = pageData?.thumbnail?.source || pageData?.originalimage?.source;
          if (thumb && !seen.has(thumb)) {
            seen.add(thumb);
            return { url: thumb, source: "Wikipedia", teamName: title, score } as LogoCandidate;
          }
          return null;
        } catch {
          return null;
        }
      });

      const pageResults = await Promise.all(pagePromises);
      for (const r of pageResults) if (r) results.push(r);
    } catch {
      continue;
    }
  }

  return results;
};

// ============ GLOWNE FUNKCJE ============

const mergeResults = (
  sportsDB: LogoCandidate[],
  sofa: LogoCandidate[],
  wiki: LogoCandidate[],
): LogoCandidate[] => {
  const seen = new Set<string>();
  const merged: LogoCandidate[] = [];

  for (const c of [...sportsDB, ...sofa, ...wiki]) {
    if (!seen.has(c.url)) {
      seen.add(c.url);
      merged.push(c);
    }
  }

  return merged.sort((a, b) => (b.score || 0) - (a.score || 0));
};

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.trim().length < 3) return null;

  try {
    const [sportsDB, sofa, wiki] = await Promise.all([
      fetchSportsDBLogos(teamName).catch(() => []),
      fetchSofaScoreLogos(teamName).catch(() => []),
      fetchWikipediaLogos(teamName).catch(() => []),
    ]);

    const merged = mergeResults(sportsDB, sofa, wiki);
    return merged.length > 0 ? merged[0].url : null;
  } catch {
    return null;
  }
};

export const fetchTeamLogoCandidates = async (
  teamName: string,
): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.trim().length < 3) return [];

  try {
    const [sportsDB, sofa, wiki] = await Promise.all([
      fetchSportsDBLogos(teamName).catch(() => []),
      fetchSofaScoreLogos(teamName).catch(() => []),
      fetchWikipediaLogos(teamName).catch(() => []),
    ]);

    const merged = mergeResults(sportsDB, sofa, wiki);
    return merged.slice(0, 12).map((r) => ({
      url: r.url,
      source: r.source,
      teamName: r.teamName,
    }));
  } catch {
    return [];
  }
};
