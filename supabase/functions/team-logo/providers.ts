// ============================================================================
// Logo providers — scraped from public team pages, no API keys required.
//
//   1. Transfermarkt — search HTML -> /verein/{id} -> tmssl CDN crest
//   2. FotMob        — apigw suggest -> team id -> images.fotmob.com crest
//   3. SoccerWiki    — search HTML -> cdn.soccerwiki.org crest
//   4. 365Scores     — webws search -> competitor id -> imagecache CDN crest
//
// All live sources are plain requests with a browser User-Agent. Each is
// isolated + time-boxed by the orchestrator, so one failing site never blocks
// the others.
// ============================================================================

import { matches } from "./matching.ts";

export interface RawCandidate {
  url: string;
  source: string;
  teamName: string;
  score: number;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchText(url: string, ms = 7000): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pl;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, ms = 6000): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- 1. Transfermarkt ------------------------------------------------------
// https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=...
// Result rows contain <a title="Legia Warszawa" href="/.../verein/255">.
// Crest: https://tmssl.akamaized.net/images/wappen/head/{id}.png
export const fetchTransfermarkt = async (
  teamName: string,
  queries: string[],
): Promise<RawCandidate[]> => {
  const out: RawCandidate[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 2)) {
    const html = await fetchText(
      `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(q)}`,
      7500,
    );
    if (!html) continue;

    const re = /title="([^"]{2,60})"[^>]*href="[^"]*\/verein\/(\d+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const name = m[1].replace(/\s+/g, " ").trim();
      const id = m[2];
      // Skip the "Squad ..." duplicate links Transfermarkt renders per row.
      if (/^squad\b/i.test(name)) continue;

      const score = matches(name, teamName);
      if (score < 50) continue;

      const url = `https://tmssl.akamaized.net/images/wappen/head/${id}.png`;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ url, source: "Transfermarkt", teamName: name, score });
    }
  }
  return out;
};

// ---- 2. FotMob -------------------------------------------------------------
// https://apigw.fotmob.com/searchapi/suggest?term=...&hits=8
// -> teamSuggest[].options[].payload.id  (e.g. 8673 = Legia Warszawa)
// Crest: https://images.fotmob.com/image_resources/logo/teamlogo/{id}.png
export const fetchFotmob = async (
  teamName: string,
  queries: string[],
): Promise<RawCandidate[]> => {
  const out: RawCandidate[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 2)) {
    const data = await fetchJson(
      `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(q)}&hits=8`,
      6000,
    );
    const groups: any[] = Array.isArray(data?.teamSuggest) ? data.teamSuggest : [];

    for (const group of groups) {
      const options: any[] = Array.isArray(group?.options) ? group.options : [];
      for (const opt of options) {
        const payload = opt?.payload || {};
        const rawText: string = String(opt?.text || "");
        const id = payload.id || rawText.split("|")[1];
        if (!id) continue;

        const name = rawText.split("|")[0].trim() || String(payload.name || "");
        const score = matches(name, teamName);
        if (score < 45) continue;

        const url = `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
        if (seen.has(url)) continue;
        seen.add(url);
        out.push({ url, source: "FotMob", teamName: name, score });
      }
    }
  }
  return out;
};

// ---- 3. SoccerWiki ---------------------------------------------------------
// https://en.soccerwiki.org/search.php?q=...
// Markup: <a href="/squad.php?clubid=651"><img
//   data-src="https://cdn.soccerwiki.org/images/logos/clubs/651.png"
//   alt="Legia Warszawa" ...>
export const fetchSoccerWiki = async (
  teamName: string,
  queries: string[],
): Promise<RawCandidate[]> => {
  const out: RawCandidate[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 2)) {
    const html = await fetchText(
      `https://en.soccerwiki.org/search.php?q=${encodeURIComponent(q)}`,
      7500,
    );
    if (!html) continue;

    const re =
      /data-src="(https:\/\/cdn\.soccerwiki\.org\/images\/logos\/clubs\/\d+\.(?:png|jpg))"[^>]*alt="([^"]*)"/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const url = m[1];
      const name = m[2].replace(/\s+/g, " ").trim();
      const score = matches(name, teamName);
      if (score < 50 || seen.has(url)) continue;
      seen.add(url);
      out.push({ url, source: "SoccerWiki", teamName: name, score });
    }
  }
  return out;
};

// ---- 4. 365Scores ----------------------------------------------------------
// https://webws.365scores.com/web/search/?appTypeId=5&langId=1&query=...&sports=1
// -> competitors[].id (football = sportId 1)
// Crest: https://imagecache.365scores.com/image/upload/Competitors/{id}.png
export const fetch365Scores = async (
  teamName: string,
  queries: string[],
): Promise<RawCandidate[]> => {
  const out: RawCandidate[] = [];
  const seen = new Set<string>();

  for (const q of queries.slice(0, 2)) {
    const data = await fetchJson(
      `https://webws.365scores.com/web/search/?appTypeId=5&langId=1&query=${encodeURIComponent(q)}&sports=1`,
      6000,
    );
    const competitors: any[] = Array.isArray(data?.competitors) ? data.competitors : [];

    for (const c of competitors) {
      if (Number(c?.sportId) !== 1) continue;
      const id = c?.id;
      const name = String(c?.name || "").trim();
      if (!id || !name) continue;

      const score = matches(name, teamName);
      if (score < 50) continue;

      const url = `https://imagecache.365scores.com/image/upload/Competitors/${id}.png`;
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ url, source: "365Scores", teamName: name, score });
    }
  }
  return out;
};
