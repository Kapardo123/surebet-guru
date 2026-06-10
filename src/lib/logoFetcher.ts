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

// ============ FALLBACK MAP (URL PATTERNS) ============
// Znane, stabilne URL-e logo z Wikimedia Commons. Zero zapytań API = natychmiastowy wynik.

const FALLBACK_LOGOS: Record<string, string> = {
  // ----- TOP 20 KLUBÓW EUROPEJSKICH -----
  "real madrid": "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/120px-Real_Madrid_CF.svg.png",
  "real madrid cf": "https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/120px-Real_Madrid_CF.svg.png",
  "fc barcelona": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png",
  "barcelona": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png",
  "barca": "https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/120px-FC_Barcelona_%28crest%29.svg.png",
  "manchester united": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/120px-Manchester_United_FC_crest.svg.png",
  "man utd": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/120px-Manchester_United_FC_crest.svg.png",
  "manchester city": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/120px-Manchester_City_FC_badge.svg.png",
  "man city": "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/120px-Manchester_City_FC_badge.svg.png",
  "bayern munich": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_%28crest%29.svg/120px-FC_Bayern_M%C3%BCnchen_%28crest%29.svg.png",
  "bayern munchen": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_%28crest%29.svg/120px-FC_Bayern_M%C3%BCnchen_%28crest%29.svg.png",
  "fc bayern": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/FC_Bayern_M%C3%BCnchen_%28crest%29.svg/120px-FC_Bayern_M%C3%BCnchen_%28crest%29.svg.png",
  "liverpool": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/120px-Liverpool_FC.svg.png",
  "liverpool fc": "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/120px-Liverpool_FC.svg.png",
  "chelsea": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Chelsea_FC.svg/120px-Chelsea_FC.svg.png",
  "chelsea fc": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c2/Chelsea_FC.svg/120px-Chelsea_FC.svg.png",
  "arsenal": "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/120px-Arsenal_FC.svg.png",
  "arsenal fc": "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/120px-Arsenal_FC.svg.png",
  "juventus": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Juventus_FC_2017_logo.svg/120px-Juventus_FC_2017_logo.svg.png",
  "inter milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/FC_Internazionale_Milano_2014_logo.svg/120px-FC_Internazionale_Milano_2014_logo.svg.png",
  "inter": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/FC_Internazionale_Milano_2014_logo.svg/120px-FC_Internazionale_Milano_2014_logo.svg.png",
  "ac milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/120px-Logo_of_AC_Milan.svg.png",
  "milan": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_of_AC_Milan.svg/120px-Logo_of_AC_Milan.svg.png",
  "paris saint germain": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/120px-Paris_Saint-Germain_F.C..svg.png",
  "paris saint-germain": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/120px-Paris_Saint-Germain_F.C..svg.png",
  "psg": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a7/Paris_Saint-Germain_F.C..svg/120px-Paris_Saint-Germain_F.C..svg.png",
  "tottenham hotspur": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/120px-Tottenham_Hotspur.svg.png",
  "tottenham": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/120px-Tottenham_Hotspur.svg.png",
  "spurs": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/Tottenham_Hotspur.svg/120px-Tottenham_Hotspur.svg.png",
  "borussia dortmund": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Borussia_Dortmund.svg/120px-Borussia_Dortmund.svg.png",
  "dortmund": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Borussia_Dortmund.svg/120px-Borussia_Dortmund.svg.png",
  "bvb": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Borussia_Dortmund.svg/120px-Borussia_Dortmund.svg.png",
  "atletico madrid": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c1/Atletico_de_Madrid_logo.svg/120px-Atletico_de_Madrid_logo.svg.png",
  "sevilla": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/Sevilla_FC_logo.svg/120px-Sevilla_FC_logo.svg.png",
  "valencia": "https://upload.wikimedia.org/wikipedia/en/thumb/c/ce/Valencia_CF_logo.svg/120px-Valencia_CF_logo.svg.png",
  "lyon": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Olympique_Lyonnais.svg/120px-Olympique_Lyonnais.svg.png",
  "olympique lyonnais": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/Olympique_Lyonnais.svg/120px-Olympique_Lyonnais.svg.png",
  "marseille": "https://upload.wikimedia.org/wikipedia/en/thumb/1/14/Olympique_de_Marseille_logo.svg/120px-Olympique_de_Marseille_logo.svg.png",
  "napoli": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/SSC_Napoli.svg/120px-SSC_Napoli.svg.png",
  "ssc napoli": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/SSC_Napoli.svg/120px-SSC_Napoli.svg.png",
  "as roma": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/AS_Roma.svg/120px-AS_Roma.svg.png",
  "roma": "https://upload.wikimedia.org/wikipedia/en/thumb/e/e7/AS_Roma.svg/120px-AS_Roma.svg.png",
  "lazio": "https://upload.wikimedia.org/wikipedia/en/thumb/7/78/SS_Lazio_logo.svg/120px-SS_Lazio_logo.svg.png",
  "ss lazio": "https://upload.wikimedia.org/wikipedia/en/thumb/7/78/SS_Lazio_logo.svg/120px-SS_Lazio_logo.svg.png",
  "ajax": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/120px-Ajax_Amsterdam.svg.png",
  "afc ajax": "https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Ajax_Amsterdam.svg/120px-Ajax_Amsterdam.svg.png",
  "benfica": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SL_Benfica_logo.svg/120px-SL_Benfica_logo.svg.png",
  "sl benfica": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SL_Benfica_logo.svg/120px-SL_Benfica_logo.svg.png",
  "porto": "https://upload.wikimedia.org/wikipedia/en/thumb/6/65/FC_Porto.svg/120px-FC_Porto.svg.png",
  "fc porto": "https://upload.wikimedia.org/wikipedia/en/thumb/6/65/FC_Porto.svg/120px-FC_Porto.svg.png",
  "celtic": "https://upload.wikimedia.org/wikipedia/en/thumb/7/71/Celtic_FC.svg/120px-Celtic_FC.svg.png",
  "rangers": "https://upload.wikimedia.org/wikipedia/en/thumb/7/74/Rangers_F.C._logo.svg/120px-Rangers_F.C._logo.svg.png",
  "galatasaray": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/Galatasaray_SK_Logo.svg/120px-Galatasaray_SK_Logo.svg.png",
  "fenerbahce": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/Fenerbahce_SK_Logo.svg/120px-Fenerbahce_SK_Logo.svg.png",

  // ----- POLSKIE KLUBY -----
  "legia warszawa": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Legia_Warsaw_logo.svg/120px-Legia_Warsaw_logo.svg.png",
  "legia warsaw": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Legia_Warsaw_logo.svg/120px-Legia_Warsaw_logo.svg.png",
  "legia": "https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/Legia_Warsaw_logo.svg/120px-Legia_Warsaw_logo.svg.png",
  "lech poznan": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/Lech_Poznan.svg/120px-Lech_Poznan.svg.png",
  "rakow czestochowa": "https://upload.wikimedia.org/wikipedia/en/thumb/2/20/Rakow_Czestochowa_logo.svg/120px-Rakow_Czestochowa_logo.svg.png",
  "pogon szczecin": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Pogon_Szczecin_logo.svg/120px-Pogon_Szczecin_logo.svg.png",
  "slask wroclaw": "https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Slask_Wroclaw.svg/120px-Slask_Wroclaw.svg.png",
  "jagiellonia bialystok": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/Jagiellonia_Bialystok.svg/120px-Jagiellonia_Bialystok.svg.png",
  "wisla krakow": "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Wisla_Krakow.svg/120px-Wisla_Krakow.svg.png",
  "cracovia": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3e/Cracovia_logo.svg/120px-Cracovia_logo.svg.png",
  "korona kielce": "https://upload.wikimedia.org/wikipedia/en/thumb/a/a8/Korona_Kielce.svg/120px-Korona_Kielce.svg.png",
  "miedz legnica": "https://upload.wikimedia.org/wikipedia/en/thumb/6/63/Miedz_Legnica.svg/120px-Miedz_Legnica.svg.png",
  "zaglebie lubin": "https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Zaglebie_Lubin.svg/120px-Zaglebie_Lubin.svg.png",
  "piast gliwice": "https://upload.wikimedia.org/wikipedia/en/thumb/9/90/Piast_Gliwice_logo.svg/120px-Piast_Gliwice_logo.svg.png",
  "gornik zabrze": "https://upload.wikimedia.org/wikipedia/en/thumb/3/3a/Gornik_Zabrze.svg/120px-Gornik_Zabrze.svg.png",
  "lechia gdansk": "https://upload.wikimedia.org/wikipedia/en/thumb/f/fb/Lechia_Gdansk.svg/120px-Lechia_Gdansk.svg.png",
};

const getFallbackLogo = (teamName: string): LogoCandidate | null => {
  const key = normalize(teamName).replace(/\s+/g, " ");
  if (FALLBACK_LOGOS[key]) {
    return {
      url: FALLBACK_LOGOS[key],
      source: "Fast Logo",
      teamName: teamName.trim(),
      score: 200,
    };
  }
  // Sprawdz czesciowe dopasowanie
  for (const [mapKey, url] of Object.entries(FALLBACK_LOGOS)) {
    if (mapKey.includes(key) || key.includes(mapKey)) {
      return {
        url,
        source: "Fast Logo",
        teamName: teamName.trim(),
        score: 150,
      };
    }
  }
  return null;
};

// ============ WIKIMEDIA COMMONS API ============
// Wyszukuje obrazki ("logo of X") na Wikimedia Commons - bardzo dobre logo

const fetchWikimediaLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const results: LogoCandidate[] = [];
  const clean = teamName.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 3) return results;

  const searchTerms = [
    `${clean} logo`,
    `${clean} football club logo`,
    `${clean} fc logo`,
    `${clean} club`,
  ];

  for (const term of searchTerms.slice(0, 2)) {
    try {
      const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
        term,
      )}&gsrlimit=5&prop=imageinfo&iiprop=url|mime&iiurlwidth=200&format=json&origin=*`;

      const res = await fetch(apiUrl);
      if (!res.ok) continue;
      const data: any = await res.json();
      const pages: any = data?.query?.pages || {};

      for (const pageId of Object.keys(pages)) {
        const page: any = pages[pageId];
        const title: string = page?.title || "";
        const info: any = page?.imageinfo?.[0];
        const imageUrl: string = info?.url || "";
        const mime: string = info?.mime || "";

        if (!imageUrl || !imageUrl.startsWith("http")) continue;
        if (!mime.startsWith("image/")) continue;

        const score = matches(title, teamName);
        if (score < 20) continue;

        // Tytul zawiera "logo" lub "crest" lub "badge" - bonus
        const lowerTitle = title.toLowerCase();
        const logoBoost = lowerTitle.includes("logo") || lowerTitle.includes("crest") || lowerTitle.includes("badge") ? 1.3 : 1;
        const finalScore = Math.min(200, Math.round(score * logoBoost));

        if (!results.some((r) => r.url === imageUrl)) {
          results.push({
            url: imageUrl,
            source: "Wikimedia Commons",
            teamName: title.replace(/^File:/i, "").replace(/\.[^.]+$/, ""),
            score: finalScore,
          });
        }
      }
    } catch {
      continue;
    }
    // Jesli pierwszy zapytal mial wynik, nie robimy kolejnego
    if (results.length > 0) break;
  }

  return results;
};

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
      const data: any = await res.json();
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
      const data: any = await res.json();
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

const mergeAllResults = (
  fallback: LogoCandidate | null,
  sportsDB: LogoCandidate[],
  sofa: LogoCandidate[],
  wiki: LogoCandidate[],
  wikimedia: LogoCandidate[],
): LogoCandidate[] => {
  const seen = new Set<string>();
  const merged: LogoCandidate[] = [];

  // Fallback na pierwszym miejscu (jesli jest) - najszybszy i najbardziej wiarygodny
  if (fallback && !seen.has(fallback.url)) {
    seen.add(fallback.url);
    merged.push(fallback);
  }

  for (const c of [...sportsDB, ...sofa, ...wiki, ...wikimedia]) {
    if (!seen.has(c.url)) {
      seen.add(c.url);
      merged.push(c);
    }
  }

  return merged.sort((a, b) => (b.score || 0) - (a.score || 0));
};

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.trim().length < 3) return null;

  // Najpierw sprawdz fallback (natychmiast, zero requestu)
  const fallback = getFallbackLogo(teamName);
  if (fallback) return fallback.url;

  try {
    const [sportsDB, sofa, wiki, wikimedia] = await Promise.all([
      fetchSportsDBLogos(teamName).catch(() => []),
      fetchSofaScoreLogos(teamName).catch(() => []),
      fetchWikipediaLogos(teamName).catch(() => []),
      fetchWikimediaLogos(teamName).catch(() => []),
    ]);

    const merged = mergeAllResults(null, sportsDB, sofa, wiki, wikimedia);
    return merged.length > 0 ? merged[0].url : null;
  } catch {
    return null;
  }
};

export const fetchTeamLogoCandidates = async (
  teamName: string,
): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.trim().length < 3) return [];

  // Fallback - od razu dodaj jako pierwszy wynik jesli pasuje
  const fallback = getFallbackLogo(teamName);

  try {
    const [sportsDB, sofa, wiki, wikimedia] = await Promise.all([
      fetchSportsDBLogos(teamName).catch(() => []),
      fetchSofaScoreLogos(teamName).catch(() => []),
      fetchWikipediaLogos(teamName).catch(() => []),
      fetchWikimediaLogos(teamName).catch(() => []),
    ]);

    const merged = mergeAllResults(fallback, sportsDB, sofa, wiki, wikimedia);
    return merged.slice(0, 12).map((r) => ({
      url: r.url,
      source: r.source,
      teamName: r.teamName,
    }));
  } catch {
    return fallback ? [{ url: fallback.url, source: fallback.source, teamName: fallback.teamName }] : [];
  }
};
