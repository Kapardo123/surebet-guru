/**
 * SofaScore odds enrichment — silent fallback when SportyTrader's listing
 * serves the hideodd variant (their bot-facing SSR ships without odds values).
 *
 * The app already fetches logos straight from api.sofascore.com in browsers,
 * which pass their Cloudflare rules; Node/TLS-fingerprint clients get 403,
 * so this module ONLY ever runs in the browser and every failure degrades
 * gracefully to null (admin can still type odds manually).
 */

/** lowercase + diacritics stripped + only [a-z0-9] kept */
export const normalizeTeamName = (raw: string): string =>
  (raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]/g, "");

interface SofaTeam {
  id?: number;
  name?: string;
  shortName?: string;
  nameCode?: string;
}
interface SofaEvent {
  id?: number;
  customId?: string;
  startTimestamp?: number;
  homeTeam?: SofaTeam;
  awayTeam?: SofaTeam;
  status?: { type?: string };
}
/** Any node in an odds payload that looks like a bookmaker choice. */
interface OddsChoice {
  marketName: string;
  choiceName: string;
  odds: number;
}

const DAY_CACHE_TTL = 10 * 60 * 1000;
const dayCache = new Map<string, { events: SofaEvent[]; ts: number }>();
const REQUEST_TIMEOUT_MS = 8000;

async function fetchJson(url: string): Promise<any | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const eventDay = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

/**
 * Scheduled-events feed per day is one request shared by every match card,
 * so all same-day lookups cost a single call.
 */
export const getEventsForDay = async (
  isoDate: string,
): Promise<SofaEvent[]> => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return [];
  const hit = dayCache.get(isoDate);
  if (hit && Date.now() - hit.ts < DAY_CACHE_TTL) return hit.events;

  // Expected shape: { events: [{ id, homeTeam:{name}, awayTeam:{name}, ... }] }
  const json = await fetchJson(
    `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${isoDate}`,
  );
  const events: SofaEvent[] = Array.isArray(json?.events) ? json.events : [];
  dayCache.set(isoDate, { events, ts: Date.now() });
  if (dayCache.size > 40) {
    const oldest = [...dayCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest && oldest[0] !== isoDate) dayCache.delete(oldest[0]);
  }
  return events;
};

const teamAliases = (t?: SofaTeam) =>
  [t?.name, t?.shortName].filter(Boolean).map((x) => normalizeTeamName(x as string));

const matchesPair = (ev: SofaEvent, hNorm: string, aNorm: string): boolean => {
  const hs = teamAliases(ev.homeTeam);
  const as = teamAliases(ev.awayTeam);
  const h = hs.find(Boolean);
  const a = as.find(Boolean);
  if (!h || !a) return false;
  const fuzzy = (hay: string, needle: string) =>
    hay === needle || (needle.length >= 4 && hay.includes(needle));
  const forward = fuzzy(h, hNorm) && fuzzy(a, aNorm);
  const reversed = fuzzy(a, hNorm) && fuzzy(h, aNorm);
  return forward || reversed;
};

const findEvent = async (
  home: string,
  away: string,
  kickoffIso: string,
): Promise<SofaEvent | null> => {
  const hNorm = normalizeTeamName(home);
  const aNorm = normalizeTeamName(away);
  if (!hNorm || !aNorm) return null;

  // Check the kick-off day first, then neighbours for timezone drift.
  const baseDate = (kickoffIso || "").slice(0, 10) || eventDay(0);
  const candidates = [
    ...new Set([baseDate, eventDay(0), eventDay(1), eventDay(-1)]),
  ];
  for (const day of candidates) {
    const events = await getEventsForDay(day);
    const found = events.find((ev) => matchesPair(ev, hNorm, aNorm));
    if (found) return found;
  }
  return null;
};

/**
 * Walks arbitrary sofascore odds JSON, collecting every bookmaker choice so
 * parsing survives unannounced API shape changes.
 */
const collectChoices = (node: unknown, marketName: string, out: OddsChoice[]) => {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectChoices(n, marketName, out));
    return;
  }
  const obj = node as Record<string, unknown>;
  const nextMarket =
    typeof obj.name === "string" && obj.name.length > 2 ? obj.name : marketName;

  const rawOdds = obj.odds ?? obj.decimalOdds;
  const rawName = obj.choiceName ?? obj.name ?? obj.label;
  if (
    typeof rawOdds === "number" &&
    rawOdds > 1 &&
    typeof rawName === "string" &&
    rawName.length <= 30
  ) {
    out.push({ marketName, choiceName: rawName, odds: rawOdds });
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") collectChoices(value, nextMarket, out);
  }
};

interface ParsedPick {
  type: "btts" | "total" | "winner";
  side?: "yes" | "no" | "over" | "under" | "home" | "away" | "draw";
  line?: number;
}

const parsePick = (
  prediction: string,
  homeTeam: string,
  awayTeam: string,
): ParsedPick | null => {
  const p = normalizeTeamName(prediction);

  const lineM = p.match(/(?:over|under|ponad|ponizej|nad|pod|\bo|\bu)\s*(\d+(?:[\.,]\d+)?)/);
  if (/over|ponad|powyzej/.test(p) || (lineM && p.includes("over"))) {
    return { type: "total", side: "over", line: parseFloat(lineM![1].replace(",", ".")) };
  }
  if (/under|ponizej/.test(p)) {
    return { type: "total", side: "under", line: parseFloat(lineM![1].replace(",", ".")) };
  }
  if (/btts|bothteams.*(score|toscore)|gg$|^gg\b|obiedwiestrz|oba.*strzel|bobie/.test(p)) {
    return { type: "btts", side: /no|nie/.test(p) ? "no" : "yes" };
  }

  const h = normalizeTeamName(homeTeam);
  const a = normalizeTeamName(awayTeam);
  const mentionsHome = h.length >= 4 && p.includes(h.slice(0, Math.min(h.length, 12)));
  const mentionsAway = a.length >= 4 && p.includes(a.slice(0, Math.min(a.length, 12)));
  if (mentionsHome) return { type: "winner", side: "home" };
  if (mentionsAway) return { type: "winner", side: "away" };
  if (/\bdraw|remis/.test(p)) return { type: "winner", side: "draw" };

  // Bare 1 / X / 2 tips are ambiguous across sites -> resolve 1/2 by order.
  if (/^1\b/.test(p)) return { type: "winner", side: "home" };
  if (/^2\b/.test(p)) return { type: "winner", side: "away" };
  if (/^x\b|^remis\b/.test(p)) return { type: "winner", side: "draw" };

  return null;
};

const normChoice = (s: string) => s.toLowerCase();

const choiceMatches = (choice: string, side: NonNullable<ParsedPick["side"]>) => {
  const c = normChoice(choice);
  switch (side) {
    case "yes":
      return /^(yes|tak)\b/.test(c) || c === "gg";
    case "no":
      return /^(no|nie)\b/.test(c) || c === "ng";
    case "over":
      return /^(over|above|powyzej|ponad)/.test(c);
    case "under":
      return /^(under|below|ponizej|pod)/.test(c);
    case "home":
      return /^(1)$/.test(c.trim()) || /^home/.test(c);
    case "away":
      return /^(2)$/.test(c.trim()) || /^away/.test(c);
    case "draw":
      return /^(x)$/.test(c.trim()) || /^draw|^remis/.test(c);
  }
};

/** Best-effort: exact meaning of each source tip may stay unmatchable. */
const selectBestChoice = (
  choices: OddsChoice[],
  pick: ParsedPick,
  homeTeam: string,
): number | null => {
  let pool = choices;
  if (pick.type === "btts") {
    pool = choices.filter((ch) => /bothteamstoscore|btts/.test(normalizeTeamName(ch.marketName)));
  } else if (pick.type === "total") {
    const target = pick.line != null ? String(pick.line) : "";
    const totalMarkets = choices.filter((ch) =>
      /goals?overunder|totals?|overunder/.test(normalizeTeamName(ch.marketName)),
    );
    const onLine = totalMarkets.filter((ch) =>
      target ? ch.marketName.replace(/[^\d.]/g, "").includes(target.replace(".", "")) : true,
    );
    if (onLine.length) pool = onLine;
  } else if (pick.type === "winner") {
    const ft = choices.filter((ch) =>
      /fulltime|1x2|hometeamawayteam|result/.test(normalizeTeamName(ch.marketName)),
    );
    if (ft.length) pool = ft;
  }

  if (pick.side) {
    const exact = pool.find((ch) => choiceMatches(ch.choiceName, pick.side!));
    if (exact) return exact.odds;
    if (pick.type === "winner" && (pick.side === "home" || pick.side === "away")) {
      const t = normalizeTeamName(homeTeam);
      const teamNamed = pool.find((ch) => normalizeTeamName(ch.choiceName).includes(t.slice(0, 8)));
      if (teamNamed) return teamNamed.odds;
    }
  }
  return null;
};

/**
 * Returns the odds for the recommended pick, or null when either the event
 * cannot be identified or the pick's market isn't offered.
 */
export const getSofaOdds = async (
  homeTeam: string,
  awayTeam: string,
  kickoffIso: string,
  prediction: string,
): Promise<number | null> => {
  try {
    const ev = await findEvent(homeTeam, awayTeam, kickoffIso);
    if (!ev?.id) return null;

    const oddsJson = await fetchJson(
      `https://api.sofascore.com/api/v1/event/${ev.id}/odds`,
    );
    if (!oddsJson) return null;

    const choices: OddsChoice[] = [];
    collectChoices(oddsJson, "", choices);
    if (!choices.length) return null;

    const pick = parsePick(prediction || "", homeTeam, awayTeam);
    if (!pick) return null;

    return selectBestChoice(choices, pick, homeTeam);
  } catch {
    return null;
  }
};
