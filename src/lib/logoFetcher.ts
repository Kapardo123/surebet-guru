// ============ NORMALIZACJA I MATCHING ============

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

const tokenize = (s: string): string[] => {
  return normalize(s)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
};

const STOPWORDS = new Set([
  "the", "fc", "cf", "sc", "sk", "ac", "as", "rc", "rl", "club",
  "de", "la", "el", "los", "las", "en", "le", "les", "du", "des",
  "of", "and", "sv", "if", "fk", "ts", "kc", "nk", "jk",
  "borussia", "dortmund", "04", "96", "05", "bvb", "1860", "1900",
  "cfc", "afc", "ufc", "ifk", "bfc",
]);

// Popularne aliasy klubowe (skrot -> pelna nazwa lub popularna forma)
const TEAM_ALIASES: Record<string, string[]> = {
  "barca": ["fc barcelona", "barcelona"],
  "blaugrana": ["fc barcelona", "barcelona"],
  "real": ["real madrid", "real madrid cf"],
  "madrid": ["real madrid", "real madrid cf"],
  "rm": ["real madrid"],
  "psg": ["paris saint germain", "paris saint-germain", "psg"],
  "paris": ["paris saint germain", "paris saint-germain"],
  "bayern": ["bayern munchen", "bayern munich", "fc bayern munchen"],
  "bvb": ["borussia dortmund", "borussia dortmund 09"],
  "dortmund": ["borussia dortmund", "borussia dortmund 09"],
  "juve": ["juventus", "juventus turin"],
  "inter": ["inter milan", "fc internazionale milano"],
  "milan": ["ac milan", "milan"],
  "rossoneri": ["ac milan"],
  "nerazzurri": ["inter milan"],
  "arsenal": ["arsenal fc", "arsenal"],
  "gunners": ["arsenal fc"],
  "united": ["manchester united", "man utd"],
  "man utd": ["manchester united", "manchester united fc"],
  "manu": ["manchester united"],
  "city": ["manchester city", "manchester city fc"],
  "mancity": ["manchester city"],
  "chelsea": ["chelsea fc", "chelsea"],
  "blues": ["chelsea fc"],
  "lfc": ["liverpool", "liverpool fc"],
  "liverpool": ["liverpool fc"],
  "spurs": ["tottenham hotspur", "tottenham hotspur fc"],
  "tottenham": ["tottenham hotspur"],
  "roma": ["as roma", "roma"],
  "lazio": ["ss lazio", "lazio"],
  "napoli": ["ssc napoli", "napoli"],
  "atletico": ["atletico madrid", "club atletico de madrid"],
  "colchoneros": ["atletico madrid"],
  "sevilla": ["sevilla fc", "sevilla"],
  "valencia": ["valencia cf", "valencia"],
  "lyon": ["olympique lyonnais", "lyon", "ol"],
  "marseille": ["olympique de marseille", "om"],
  "ajax": ["afc ajax", "ajax amsterdam"],
  "psv": ["psv eindhoven"],
  "feyenoord": ["feyenoord rotterdam"],
  "celtic": ["celtic fc", "celtic glasgow"],
  "rangers": ["rangers fc", "glasgow rangers"],
  "benfica": ["sl benfica", "benfica"],
  "porto": ["fc porto", "porto"],
  "sporting": ["sporting cp", "sporting lisbon"],
  "galatasaray": ["galatasaray sk", "galatasaray"],
  "fener": ["fenerbahce sk", "fenerbahce"],
  "besiktas": ["besiktas jk", "besiktas"],
  "olympiakos": ["olympiakos fc", "olympiacos piraeus"],
  "paok": ["paok fc", "paok thessaloniki"],
  "aek": ["aek athens", "aek fc"],
  "dynamo": ["dynamo kyiv", "dynamo kiev", "fc dynamo kyiv"],
  "shakhtar": ["fc shakhtar donetsk", "shakhtar donetsk"],
  "czerwona": ["czerwona gwiazda", "red star belgrade"],
  "lechia": ["lechia gdansk"],
  "legia": ["legia warszawa", "legia warsaw"],
  "rakow": ["rakow czestochowa"],
  "pogon": ["pogon szczecin"],
  "slask": ["slask wroclaw"],
  "jagiellonia": ["jagiellonia bialystok"],
  "lech": ["lech poznan"],
  "wisla": ["wisla krakow"],
  "cracovia": ["cracovia krakow"],
  "corona": ["korona kielce", "corona kielce"],
  "miedz": ["miedz legnica"],
  "zaglebie": ["zaglebie lubin"],
  "piast": ["piast gliwice"],
};

// Oblicz score dopasowania na podstawie tokenow (duzo lepsze niz substring)
const scoreTokenMatch = (candidateName: string, query: string): number => {
  const candidateTokens = tokenize(candidateName);
  const queryTokens = tokenize(query);

  if (candidateTokens.length === 0 || queryTokens.length === 0) return 0;

  const candidateSet = new Set(candidateTokens);
  let matchedTokens = 0;

  for (const token of queryTokens) {
    // Dokladne dopasowanie tokenu
    if (candidateSet.has(token)) {
      matchedTokens += 2;
      continue;
    }
    // Prefiksowy match (np "madrid" dopasuje "madridista" - madryt)
    let prefixHit = false;
    for (const ct of candidateTokens) {
      if (ct.startsWith(token) && token.length >= 3) {
        matchedTokens += 1;
        prefixHit = true;
        break;
      }
      if (token.startsWith(ct) && ct.length >= 3) {
        matchedTokens += 1;
        prefixHit = true;
        break;
      }
    }
    if (prefixHit) continue;

    // Levenshtein dla bliskich dopasowan (np "mancherter" -> "manchester")
    for (const ct of candidateTokens) {
      if (token.length >= 4 && ct.length >= 4) {
        const dist = levenshtein(token, ct);
        const maxLen = Math.max(token.length, ct.length);
        const similarity = 1 - dist / maxLen;
        if (similarity >= 0.75) {
          matchedTokens += 0.5;
          break;
        }
      }
    }
  }

  // Procent dopasowanych tokenow z zapytania
  const matchRatio = matchedTokens / (queryTokens.length * 2);
  // Nagroda za bliska dlugosc (unikamy dopasowan typu "United FC" dla "Manchester United")
  const lengthRatio = Math.min(queryTokens.length / candidateTokens.length, candidateTokens.length / queryTokens.length);

  return Math.round(matchRatio * lengthRatio * 200);
};

const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[b.length];
};

// Generuj wszystkie warianty zapytania do sprawdzenia
const generateQueryVariations = (teamName: string): string[] => {
  const base = normalize(teamName);
  if (!base) return [];

  const baseNoStop = tokenize(teamName).join(" ");

  const variations = new Set<string>();
  variations.add(teamName.trim());
  variations.add(base);
  if (baseNoStop) variations.add(baseNoStop);

  // Sprawdz popularne aliasy
  const normalizedKey = base.replace(/\s+/g, " ");
  for (const [alias, expansions] of Object.entries(TEAM_ALIASES)) {
    if (normalizedKey.includes(alias) || alias === normalizedKey) {
      for (const exp of expansions) {
        variations.add(exp);
      }
    }
  }

  // Dodaj "FC" / "CF" itp na koniec i poczatek
  for (const v of Array.from(variations)) {
    const clean = v.replace(/\s+fc$|\s+cf$|\s+sc$|\s+sk$|\s+ac$|\s+as$/i, "").trim();
    if (clean && clean !== v) variations.add(clean);
    variations.add(`${clean} FC`);
    variations.add(`${clean} football`);
    variations.add(`${clean} football club`);
    variations.add(`FC ${clean}`);
  }

  // Jesli nazwa ma polskie znaki diakrytyczne, sprobuj bez nich tez
  const asciiVersion = teamName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim();
  if (asciiVersion !== teamName && asciiVersion.length >= 3) {
    variations.add(asciiVersion);
    variations.add(`${asciiVersion} FC`);
  }

  return Array.from(variations).filter((v) => v.length >= 3).slice(0, 8);
};

// ============ INTERFEJS ============

export interface LogoCandidate {
  url: string;
  source: string;
  teamName: string;
  score?: number;
}

// ============ TheSportsDB ============

const SPORTSDB_FIELDS = [
  "strBadge",
  "strLogo",
  "strTeamBadge",
  "strTeamLogo",
  "strBanner",
];

const fetchSportsDBLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const variations = generateQueryVariations(teamName);
  const results: LogoCandidate[] = [];
  const seenUrls = new Set<string>();

  // Robimy zapytania rownolegle (max 5 na raz)
  const batchSize = 5;
  for (let i = 0; i < variations.length; i += batchSize) {
    const batch = variations.slice(i, i + batchSize);
    const promises = batch.map(async (variant) => {
      try {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(variant)}`,
        );
        const data = await res.json();
        if (!data?.teams) return [];

        const batchResults: LogoCandidate[] = [];
        for (const team of data.teams) {
          if (!team) continue;
          const candidateName = team.strTeam || "";
          const score = scoreTokenMatch(candidateName, teamName);
          if (score < 30) continue;

          for (const field of SPORTSDB_FIELDS) {
            const url = team[field];
            if (url && typeof url === "string" && url.startsWith("http") && !seenUrls.has(url)) {
              seenUrls.add(url);
              batchResults.push({
                url,
                source: "TheSportsDB",
                teamName: candidateName,
                score,
              });
            }
          }
        }
        return batchResults;
      } catch {
        return [];
      }
    });

    const batchResults = await Promise.all(promises);
    for (const res of batchResults) results.push(...res);
  }

  return results;
};

// ============ SofaScore ============

const fetchSofaScoreLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const variations = generateQueryVariations(teamName);
  const results: LogoCandidate[] = [];
  const seenTeamIds = new Set<number>();
  const seenUrls = new Set<string>();

  for (let i = 0; i < Math.min(variations.length, 4); i++) {
    try {
      const variant = variations[i];
      const res = await fetch(
        `https://api.sofascore.com/api/v1/search/teams?q=${encodeURIComponent(variant)}`,
      );
      const data = await res.json();
      const items = data?.results || [];

      for (const item of items) {
        const team = item.team || item;
        const teamId = team?.id;
        const candidateName = team?.name || "";
        if (!teamId || seenTeamIds.has(teamId)) continue;
        seenTeamIds.add(teamId);

        const score = scoreTokenMatch(candidateName, teamName);
        if (score < 25) continue;

        // SofaScore: obrazek jest pod team/{id}/image - przekierowuje na CDN
        const imageUrl = `https://api.sofascore.com/api/v1/team/${teamId}/image`;
        if (!seenUrls.has(imageUrl)) {
          seenUrls.add(imageUrl);
          results.push({
            url: imageUrl,
            source: "SofaScore",
            teamName: candidateName,
            score,
          });
        }

        // Rownolegle sprawdzamy czy team ma squad - jesli tak, czesto jest lepszy obrazek
        if (team?.slug || team?.name) {
          const altUrl = `https://api.sofascore.com/api/v1/team/${teamId}/image?size=medium`;
          if (!seenUrls.has(altUrl)) {
            seenUrls.add(altUrl);
            results.push({
              url: altUrl,
              source: "SofaScore",
              teamName: candidateName,
              score,
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

// ============ Wikipedia (opensearch + page image) ============

const fetchWikipediaLogos = async (teamName: string): Promise<LogoCandidate[]> => {
  const variations = generateQueryVariations(teamName);
  const results: LogoCandidate[] = [];
  const seenUrls = new Set<string>();

  // Najpierw wyszukaj strony z uzyciem opensearch
  for (let i = 0; i < Math.min(variations.length, 3); i++) {
    try {
      const variant = variations[i];
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(variant)}&limit=5&format=json`,
      );
      const searchData = await searchRes.json();
      const pageTitles: string[] = searchData?.[1] || [];

      // Dla kazdej znalezionej strony sprobuj pobrac obrazek z podsumowania
      const imagePromises = pageTitles.map(async (pageTitle) => {
        try {
          const score = scoreTokenMatch(pageTitle, teamName);
          if (score < 25) return null;

          // Sprawdz czy tytul zawiera wskazowke ze to sportowy klub
          const lowerTitle = pageTitle.toLowerCase();
          const isSportsRelated =
            lowerTitle.includes("football") ||
            lowerTitle.includes("soccer") ||
            lowerTitle.includes("club") ||
            lowerTitle.includes("team") ||
            lowerTitle.includes("basketball") ||
            lowerTitle.includes("hockey") ||
            lowerTitle.includes("volleyball") ||
            lowerTitle.includes(" f.c") ||
            lowerTitle.includes(" fc") ||
            lowerTitle.includes("sport");

          if (!isSportsRelated && score < 60) return null;

          const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/\s+/g, "_"))}`;
          const wikiRes = await fetch(wikiUrl);
          if (!wikiRes.ok) return null;

          const wikiData = await wikiRes.json();
          const thumbnail = wikiData?.originalimage?.source || wikiData?.thumbnail?.source;
          if (thumbnail && !seenUrls.has(thumbnail)) {
            seenUrls.add(thumbnail);
            return {
              url: thumbnail,
              source: "Wikipedia",
              teamName: pageTitle,
              score,
            } as LogoCandidate;
          }
          return null;
        } catch {
          return null;
        }
      });

      const imageResults = await Promise.all(imagePromises);
      for (const r of imageResults) {
        if (r) results.push(r);
      }
    } catch {
      continue;
    }
  }

  return results;
};

// ============ GLOWNE FUNKCJE ============

const mergeAndSortResults = (...resultSets: LogoCandidate[][]): LogoCandidate[] => {
  const merged: LogoCandidate[] = [];
  const seenUrls = new Set<string>();

  for (const set of resultSets) {
    for (const candidate of set) {
      if (!seenUrls.has(candidate.url)) {
        seenUrls.add(candidate.url);
        merged.push(candidate);
      }
    }
  }

  // Sortuj po score (najlepsze dopasowanie pierwsze)
  return merged.sort((a, b) => b.score - a.score);
};

export const fetchTeamLogoUrl = async (teamName: string): Promise<string | null> => {
  if (!teamName || teamName.length < 3) return null;

  // Proboj wszystkie 3 zrodla rownolegle
  const [sportsDB, sofa, wiki] = await Promise.all([
    fetchSportsDBLogos(teamName).catch(() => []),
    fetchSofaScoreLogos(teamName).catch(() => []),
    fetchWikipediaLogos(teamName).catch(() => []),
  ]);

  const merged = mergeAndSortResults(sportsDB, sofa, wiki);
  return merged.length > 0 ? merged[0].url : null;
};

export const fetchTeamLogoCandidates = async (
  teamName: string,
): Promise<LogoCandidate[]> => {
  if (!teamName || teamName.length < 3) return [];

  // Proboj wszystkie 3 zrodla rownolegle
  const [sportsDB, sofa, wiki] = await Promise.all([
    fetchSportsDBLogos(teamName).catch(() => []),
    fetchSofaScoreLogos(teamName).catch(() => []),
    fetchWikipediaLogos(teamName).catch(() => []),
  ]);

  const merged = mergeAndSortResults(sportsDB, sofa, wiki);

  // Wez top 12 wynikow i zwroc bez pola score (dla kompatybilnosci)
  const topResults = merged.slice(0, 12);
  return topResults.map((r) => ({
    url: r.url,
    source: r.source,
    teamName: r.teamName,
  }));
};
