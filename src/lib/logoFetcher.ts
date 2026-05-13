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
  } else if (names.some((name) => name.includes(normalizedQuery) && normalizedQuery.length >= 4)) {
    const matchLength = normalizedQuery.length;
    const teamNameLength = Math.max(...names.map(n => n.length));
    score = Math.round(100 + (matchLength / teamNameLength) * 50);
  } else if (team?.strKeywords) {
    const keywords = team.strKeywords.toLowerCase().split(',').map(k => k.trim());
    if (keywords.includes(normalizedQuery)) {
      score = 100;
    }
  }
  
  return score;
};

const fetchWikipediaLogo = async (teamName: string): Promise<string | null> => {
  const baseClean = teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  
  const citySuffixes = ['Stockholm', 'Warsaw', 'Warszawa', 'Berlin', 'Munich', 'München', 'London', 'Paris', 'Madrid', 'Barcelona', 'Rome', 'Roma', 'Milan', 'Milano', 'Vienna', 'Wien', 'Zurich', 'Zürich', 'Basel', 'Bern', 'Oslo', 'Copenhagen', 'København', 'Helsinki', 'Amsterdam', 'Brussels', 'Bruxelles', 'Lisbon', 'Lisboa', 'Porto', 'Dublin', 'Prague', 'Praha', 'Budapest', 'Belgrade', 'Beograd', 'Sofia', 'Bucharest', 'București', 'Athens', 'Athina', 'Lisbon', 'Stockholm', 'Gothenburg', 'Göteborg', 'Malmo', 'Malmö', 'Copenhagen', 'Aarhus', 'Trondheim', 'Bergen', 'Stavanger', 'Reykjavik', 'Reykjavík', 'Tallinn', 'Riga', 'Vilnius', 'Tartu', 'Kaunas', 'Liepaja', 'Daugavpils'];
  
  let shortName = baseClean;
  for (const city of citySuffixes) {
    const pattern = new RegExp(`\\s+${city}$`, 'i');
    if (baseClean.match(pattern)) {
      shortName = baseClean.replace(pattern, '').trim();
      break;
    }
  }
  
  const searchTerms = [
    teamName,
    `${teamName} FC`,
    `${teamName} football`,
    `${teamName} (football club)`,
    `${teamName} -`,
    `FC ${teamName}`,
    baseClean,
    `${baseClean} FC`,
    `${baseClean} CF`,
    `${baseClean} SC`,
    `${baseClean} SK`,
    `${baseClean} IK`,
    `${baseClean} IF`,
    `${baseClean} BK`,
    `${baseClean} JK`,
    `${baseClean} AK`,
    `${baseClean} AC`,
    `${baseClean} AS`,
    `${baseClean} RC`,
    `${baseClean} SD`,
    `${baseClean} football`,
    `${baseClean} (football club)`,
    `${baseClean} Fotboll`,
    `${baseClean} Fotball`,
    `${baseClean} football club`,
    `FC ${baseClean}`,
    `IK ${baseClean}`,
    `IF ${baseClean}`,
    `BK ${baseClean}`,
    `SK ${baseClean}`,
    `CF ${baseClean}`,
    `AC ${baseClean}`,
    `AS ${baseClean}`,
    shortName,
    `${shortName} FC`,
    `${shortName} Fotboll`,
    `${shortName} Fotball`,
    `${shortName} football`,
    `FC ${shortName}`,
    `IK ${shortName}`,
    `IF ${shortName}`,
  ];

  const seen = new Set();
  
  for (const term of searchTerms) {
    try {
      const cleanTerm = term.replace(/\s+/g, '_');
      if (!cleanTerm || cleanTerm.length < 3 || seen.has(cleanTerm)) continue;
      seen.add(cleanTerm);
      
      const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTerm)}`;
      const wikiRes = await fetch(wikiUrl);
      if (wikiRes.ok) {
        const wikiData = await wikiRes.json();
        
        const description = (wikiData.description || "").toLowerCase();
        const title = (wikiData.title || "").toLowerCase();
        const pageTitle = title;
        
        const normalizedTeam = normalize(teamName);
        const normalizedPageTitle = normalize(pageTitle);
        
        const titleMatches = normalizedPageTitle.includes(normalizedTeam) || 
                            normalizedTeam.includes(normalizedPageTitle);
        
        const isSportsTeam = 
          description.includes("club") || 
          description.includes("team") || 
          description.includes("football") || 
          description.includes("soccer") ||
          description.includes("sports") ||
          description.includes("association") ||
          description.includes("vereins") ||
          description.includes("sport") ||
          title.includes("f.c") ||
          title.includes("fc") ||
          title.includes("s.c") ||
          title.includes("a.c") ||
          description.includes("società") ||
          description.includes("sulf") ||
          description.includes("futbol");

        if (wikiData.thumbnail?.source && isSportsTeam && !wikiData.title.includes("disambiguation") && titleMatches) {
          console.log(`[LogoFetcher] Found Wikipedia logo for "${term}" -> ${wikiData.title}`);
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
  const baseClean = teamName.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  
  const citySuffixes = ['Stockholm', 'Warsaw', 'Warszawa', 'Berlin', 'Munich', 'München', 'London', 'Paris', 'Madrid', 'Barcelona', 'Rome', 'Roma', 'Milan', 'Milano', 'Vienna', 'Wien', 'Zurich', 'Zürich', 'Basel', 'Bern', 'Oslo', 'Copenhagen', 'København', 'Helsinki', 'Amsterdam', 'Brussels', 'Bruxelles', 'Lisbon', 'Lisboa', 'Porto', 'Dublin', 'Prague', 'Praha', 'Budapest', 'Belgrade', 'Beograd', 'Sofia', 'Bucharest', 'București', 'Athens', 'Athina', 'Lisbon', 'Stockholm', 'Gothenburg', 'Göteborg', 'Malmo', 'Malmö', 'Copenhagen', 'Aarhus', 'Trondheim', 'Bergen', 'Stavanger', 'Reykjavik', 'Reykjavík', 'Tallinn', 'Riga', 'Vilnius', 'Tartu', 'Kaunas', 'Liepaja', 'Daugavpils'];
  
  let shortName = baseClean;
  for (const city of citySuffixes) {
    const pattern = new RegExp(`\\s+${city}$`, 'i');
    if (baseClean.match(pattern)) {
      shortName = baseClean.replace(pattern, '').trim();
      break;
    }
  }
  
  const variations = [
    teamName,
    `${teamName} FC`,
    `FC ${teamName}`,
    baseClean,
    `${baseClean} FC`,
    `${baseClean} CF`,
    `${baseClean} SC`,
    `${baseClean} SK`,
    `${baseClean} IK`,
    `${baseClean} IF`,
    `${baseClean} BK`,
    `${baseClean} JK`,
    `${baseClean} AK`,
    `${baseClean} AC`,
    `${baseClean} AS`,
    `${baseClean} RC`,
    shortName,
    `${shortName} FC`,
    `${shortName} Fotboll`,
    `${shortName} Fotball`,
    `FC ${shortName}`,
    `IK ${shortName}`,
    `IF ${shortName}`,
    `${baseClean} SD`,
    `${baseClean} Fotboll`,
    `${baseClean} Fotball`,
    `FC ${baseClean}`,
    `IK ${baseClean}`,
    `IF ${baseClean}`,
    `BK ${baseClean}`,
    `SK ${baseClean}`,
    `CF ${baseClean}`,
    `AC ${baseClean}`,
    `AS ${baseClean}`,
  ];

  const seen = new Set();
  
  for (const variation of variations) {
    if (seen.has(variation)) continue;
    seen.add(variation);
    
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
        
        if (best?.score >= 100 && best.team?.strBadge) {
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
      
      if (best?.score >= 100 && best.team?.idTeam) {
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

const fetchSofaScoreLogo = async (teamName: string): Promise<string | null> => {
  try {
    const cleanName = teamName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const sofascoreUrl = `https://www.sofascore.com/api/v1/static/team/${cleanName}/image`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(sofascoreUrl, { 
      method: 'HEAD', 
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        console.log(`[LogoFetcher] Found SofaScore logo for "${teamName}"`);
        return sofascoreUrl;
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
    
    // 1. Try Wikipedia FIRST (better accuracy for teams with special characters)
    console.log(`[LogoFetcher] Trying Wikipedia for: "${teamName}"`);
    let logo = await fetchWikipediaLogo(teamName);
    if (logo) return logo;
    
    // 2. Try TheSportsDB with multiple variations
    console.log(`[LogoFetcher] Trying TheSportsDB for: "${teamName}"`);
    logo = await fetchSportsDBWithVariations(teamName);
    if (logo) return logo;
    
    // 3. Try SofaScore direct
    console.log(`[LogoFetcher] Trying SofaScore for: "${teamName}"`);
    logo = await fetchSofaScoreLogo(teamName);
    if (logo) return logo;
    
    // 4. Try Clearbit
    console.log(`[LogoFetcher] Trying Clearbit for: "${teamName}"`);
    logo = await fetchClearbitLogo(teamName);
    if (logo) return logo;
    
    // 5. Try API-Football / TheSportsDB lookup
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