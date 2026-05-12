const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const scoreTeamMatch = (team: any, query: string) => {
  let score = 0;
  const normalizedQuery = normalize(query);
  
  const names = [team?.strTeam, team?.strTeamShort, team?.strTeamAlternate].filter(Boolean).map(normalize);
  
  if (names.some((name) => name === normalizedQuery)) {
    score = 200;
  } else if (team?.strKeywords) {
    const keywords = team.strKeywords.toLowerCase().split(',').map(k => k.trim());
    if (keywords.includes(normalizedQuery)) {
      score = 150;
    }
  } else if (names.some((name) => name.startsWith(normalizedQuery))) {
    score = 100;
  } else if (names.some((name) => name.includes(normalizedQuery)) && normalizedQuery.length >= 4) {
    score = 60;
  }
  
  return score;
};

const fetchWikipediaLogo = async (teamName: string): Promise<string | null> => {
  const searchTerms = [
    teamName,
    `${teamName} FC`,
    `${teamName} CF`,
    `${teamName} SC`,
    `${teamName} SK`,
    `${teamName} JK`,
    `${teamName} football`,
    `${teamName} (football club)`,
    `${teamName} -`,
    teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim()
  ];

  for (const term of searchTerms) {
    try {
      const cleanTerm = term.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      if (!cleanTerm || cleanTerm.length < 3) continue;
      
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`;
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
          title.includes("fc") ||
          title.includes("s.c") ||
          title.includes("a.c") ||
          description.includes("società") ||
          description.includes("vereins") ||
          description.includes("sport");

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

const fetchSportsDBWithVariations = async (teamName: string): Promise<string | null> => {
  const variations = [
    teamName,
    `${teamName} FC`,
    `${teamName} CF`,
    `${teamName} SC`,
    `${teamName} SK`,
    `${teamName} AC`,
    `${teamName} AS`,
    `${teamName} RC`,
    `${teamName} SC`,
    teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim()
  ];

  for (const variation of variations) {
    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(variation)}`
      );
      const data = await res.json();
      const teams = data.teams || [];
      
      if (teams && teams.length > 0) {
        const best = teams
          .map((team: any) => ({ team, score: scoreTeamMatch(team, teamName) }))
          .sort((a: any, b: any) => b.score - a.score)[0];
        
        if (best?.score >= 60 && best.team?.strBadge) {
          console.log(`[LogoFetcher] Found in TheSportsDB with variation "${variation}":`, best.team.strTeam);
          return best.team.strBadge;
        }
      }
    } catch {
      continue;
    }
  }
  
  return null;
};

const fetchClearbitLogo = async (teamName: string): Promise<string | null> => {
  try {
    const cleanName = teamName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const clearbitUrl = `https://logo.clearbit.com/${cleanName}.com`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(clearbitUrl, { 
      method: 'HEAD', 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        console.log(`[LogoFetcher] Found Clearbit logo for "${teamName}"`);
        return clearbitUrl;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
};

const fetchApiFootballLogo = async (teamName: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    const data = await res.json();
    const teams = data.teams || [];
    
    if (teams && teams.length > 0) {
      const best = teams
        .map((team: any) => ({ team, score: scoreTeamMatch(team, teamName) }))
        .sort((a: any, b: any) => b.score - a.score)[0];
      
      if (best?.score >= 60 && best.team?.idTeam) {
        const logoRes = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/lookupteam.php?id=${best.team.idTeam}`
        );
        const logoData = await logoRes.json();
        if (logoData.teams && logoData.teams[0]?.strLogo) {
          console.log(`[LogoFetcher] Found full logo URL for "${teamName}"`);
          return logoData.teams[0].strLogo;
        }
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
};

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.length < 3) return null;
  
  try {
    console.log(`[LogoFetcher] 🚀 Fetching logo for: "${teamName}"`);
    
    // 1. Try TheSportsDB with multiple variations
    let logo = await fetchSportsDBWithVariations(teamName);
    if (logo) return logo;
    
    // 2. Try Wikipedia
    console.log(`[LogoFetcher] Trying Wikipedia for: "${teamName}"`);
    logo = await fetchWikipediaLogo(teamName);
    if (logo) return logo;
    
    // 3. Try Clearbit
    console.log(`[LogoFetcher] Trying Clearbit for: "${teamName}"`);
    logo = await fetchClearbitLogo(teamName);
    if (logo) return logo;
    
    // 4. Try API-Football / TheSportsDB lookup
    console.log(`[LogoFetcher] Trying API-Football lookup for: "${teamName}"`);
    logo = await fetchApiFootballLogo(teamName);
    if (logo) return logo;
    
    console.log(`[LogoFetcher] ❌ No logo found for: "${teamName}"`);
    return null;
  } catch (err) {
    console.error(`[LogoFetcher] Error fetching logo for`, teamName, err);
    return null;
  }
};