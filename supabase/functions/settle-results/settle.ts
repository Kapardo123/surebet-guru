// Pure settlement logic for yesterday's results — no Deno/browser APIs here.
// Shared by the edge function (Deno) and the vitest suite
// (src/lib/settleResults.test.ts), mirroring the zawodtyper-proxy/parse.ts
// convention. Name matching is ported from parse.ts so "Lech" matches
// "KKS Lech Poznan" the same way at fixture-verification and settlement time.

export type SettledStatus = "won" | "lost" | "void";
export type SettleOutcome = SettledStatus | "unresolved";

// ---------------------------------------------------------------------------
// Team-name matching (ported from zawodtyper-proxy/parse.ts)
// ---------------------------------------------------------------------------

// Characters that NFKD does NOT decompose, so ASCII-folding would silently drop
// them. Polish "ł" is the important one: without this, "Białystok" folds to
// "biaystok" and never matches "Bialystok".
const TRANSLITERATE: Record<string, string> = {
  "ł": "l", "Ł": "l",
  "ø": "o", "Ø": "o",
  "đ": "d", "Đ": "d",
  "ħ": "h", "ı": "i",
  "ß": "s", "æ": "a", "Æ": "a",
  "œ": "o", "Œ": "o",
  "þ": "t", "Þ": "t",
};

// Polish exonyms for cities and countries — the fixture list is English.
const EXONYMS: Record<string, string> = {
  lipsk: "leipzig", praga: "prague", monachium: "munich", kolonia: "cologne",
  mediolan: "milan", rzym: "rome", turyn: "turin", neapol: "naples",
  wieden: "vienna", moskwa: "moscow", kijow: "kyiv", londyn: "london",
  parys: "paris", madryt: "madrid", lizbona: "lisbon", bruksela: "brussels",
  kopenhaga: "copenhagen", sztokholm: "stockholm", genua: "genoa",
  florencja: "florence", sewilla: "seville", bukareszt: "bucharest",
  belgrad: "belgrade", zagrzeb: "zagreb", ateny: "athens", stambul: "istanbul",
  hiszpania: "spain", argentyna: "argentina", niemcy: "germany",
  francja: "france", wlochy: "italy", anglia: "england", polska: "poland",
  portugalia: "portugal", holandia: "netherlands", belgia: "belgium",
  chorwacja: "croatia", szwecja: "sweden", norwegia: "norway",
  dania: "denmark", szwajcaria: "switzerland", czechy: "czechia",
  wegry: "hungary", turcja: "turkey", grecja: "greece", japonia: "japan",
  brazylia: "brazil", meksyk: "mexico", szkocja: "scotland",
  irlandia: "ireland", ukraina: "ukraine", rumunia: "romania",
  serbia: "serbia", bulgaria: "bulgaria", finlandia: "finland",
};

// Club-type noise that appears on one side of a name but not the other.
const NOISE_TOKENS = new Set([
  "fc", "sc", "ks", "cf", "ac", "if", "bk", "sk", "fk", "cd", "ca", "ss",
  "as", "afc", "cfc", "sv", "mks", "gks", "rks", "kks", "pfc", "sd", "ud",
  "cs", "wks", "club", "ii",
]);

export const teamTokens = (name: string): Set<string> => {
  let s = String(name || "").toLowerCase();
  for (const [from, to] of Object.entries(TRANSLITERATE)) {
    s = s.split(from).join(to);
  }
  s = s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  // Scandinavian/German digraphs are written both ways across sources.
  s = s.replace(/oe/g, "o").replace(/ae/g, "a");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  const out = new Set<string>();
  for (const t of s.split(/\s+/)) {
    if (!t || t.length < 2 || NOISE_TOKENS.has(t)) continue;
    out.add(EXONYMS[t] || t);
  }
  return out;
};

// Containment, not Jaccard: the tipster writes "Lech" where the fixture list
// says "KKS Lech Poznan". Penalising the extra tokens would reject a good match.
export const containment = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
};

export const MATCH_THRESHOLD = 0.75;

// ---------------------------------------------------------------------------
// Fixtures (odds-api.io events, trimmed to what settlement needs)
// ---------------------------------------------------------------------------

export interface Fixture {
  home: string;
  away: string;
  dateUtc: string; // ISO 8601
  league: string;
  status: string; // pending | live | settled | cancelled
  scores?: {
    home?: number;
    away?: number;
    periods?: Record<string, { home?: number; away?: number }> | null;
  } | null;
}

export interface TipLike {
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  sport: string;
}

// Results settle a day later, so the drift budget is wider than the
// 15-minute fixture check. Sequential sports (tennis, MMA, darts...) follow
// the previous match and can slip by hours, hence the flat 5-hour window.
const RESULT_TOLERANCE_MIN = 180;
const SEQUENTIAL_TOLERANCE_MIN = 300;
const SEQUENTIAL_SPORTS = new Set([
  "Tennis", "MMA", "Boxing", "Darts", "Snooker", "Esports", "Table Tennis",
]);

export const resultToleranceForSport = (sport: string): number =>
  SEQUENTIAL_SPORTS.has(sport) ? SEQUENTIAL_TOLERANCE_MIN : RESULT_TOLERANCE_MIN;

export interface EventMatch {
  event: Fixture;
  confidence: number;
  /** true when the fixture lists home/away in reverse order vs the tip */
  swapped: boolean;
}

export const matchEventForTip = (
  tip: TipLike,
  events: Fixture[],
): EventMatch | null => {
  const tipKickoff = new Date(tip.kickoff).getTime();
  if (isNaN(tipKickoff) || !events.length) return null;
  const tipHome = teamTokens(tip.homeTeam);
  const tipAway = teamTokens(tip.awayTeam);
  if (!tipHome.size || !tipAway.size) return null;

  const toleranceMs = resultToleranceForSport(tip.sport) * 60 * 1000;
  let best: EventMatch | null = null;
  let bestConfidence = 0;

  for (const ev of events) {
    const evTime = new Date(ev.dateUtc).getTime();
    if (isNaN(evTime) || Math.abs(evTime - tipKickoff) > toleranceMs) continue;

    const evHome = teamTokens(ev.home);
    const evAway = teamTokens(ev.away);
    if (!evHome.size || !evAway.size) continue;

    const forward = Math.min(
      containment(tipHome, evHome),
      containment(tipAway, evAway),
    );
    const reverse = Math.min(
      containment(tipHome, evAway),
      containment(tipAway, evHome),
    );

    let swapped = false;
    let confidence = forward;
    if (reverse > forward) {
      swapped = true;
      confidence = reverse;
    }
    if (confidence >= MATCH_THRESHOLD && confidence > bestConfidence) {
      bestConfidence = confidence;
      best = { event: ev, confidence, swapped };
    }
  }
  return best;
};

// ---------------------------------------------------------------------------
// Score extraction
// ---------------------------------------------------------------------------

export type MarketKind = "winner" | "total" | "btts";

/** Which score a market settles on. Top-level home/away is OT/penalties
 *  inclusive; periods.ft is the regulation result. */
export const scoreSource = (
  sport: string,
  market: MarketKind,
): "ft" | "top" => {
  const s = String(sport || "").toLowerCase();
  if (market === "btts") return "ft"; // football-only market
  if (s === "football") return "ft";
  if (s === "hockey" || s === "ice-hockey") return market === "total" ? "ft" : "top";
  return "top";
};

export const pickScore = (
  scores: Fixture["scores"],
  sport: string,
  market: MarketKind,
): { home: number; away: number } | null => {
  if (!scores) return null;
  const src = scoreSource(sport, market);
  if (src === "ft") {
    const periods = scores.periods || {};
    const ft = periods.ft || (periods as Record<string, any>).fulltime;
    if (ft && typeof ft.home === "number" && typeof ft.away === "number") {
      return { home: ft.home, away: ft.away };
    }
    // Football has no overtime in the top-level total, so falling back is safe.
    if (String(sport || "").toLowerCase() !== "football") return null;
  }
  if (typeof scores.home === "number" && typeof scores.away === "number") {
    return { home: scores.home, away: scores.away };
  }
  return null;
};

/** Human-readable final score for the results tab (football: 90 min). */
export const displayScore = (
  scores: Fixture["scores"],
  sport: string,
): string | null => {
  const s = pickScore(scores, sport, "winner");
  if (!s) return null;
  return `${s.home}:${s.away}`;
};

// ---------------------------------------------------------------------------
// Market parsing + settlement
// ---------------------------------------------------------------------------

export interface ParsedMarket {
  kind: MarketKind;
  side?: "home" | "away" | "draw" | "over" | "under" | "yes" | "no" | "home_draw" | "draw_away" | "no_draw";
  line?: number;
  /** Draw No Bet: remis zwraca stawkę zamiast przegrywać */
  dnb?: boolean;
}

const outcomeOf = (s: { home: number; away: number }): "home" | "away" | "draw" =>
  s.home > s.away ? "home" : s.home < s.away ? "away" : "draw";

const parseLine = (raw: string): number => parseFloat(raw.replace(",", "."));

/**
 * Rozpoznaje rynek z tekstu typu. Zwraca null, gdy rynek jest nietypowy
 * (handicapy, corner'y, strzelcy, HT...) — takie trafiają do fallbacku AI,
 * które dostaje realny wynik meczu i tylko interpretuje zakład.
 */
export const parseMarket = (
  prediction: string,
  homeTeam: string,
  awayTeam: string,
): ParsedMarket | null => {
  const p = String(prediction || "")
    .toLowerCase()
    .split("ł").join("l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  if (!p.trim()) return null;

  // Markets we deliberately don't settle deterministically.
  if (
    /handicap|\bah\b|asian|corner|rzut(y)? ro|kartk|yellow|red card|correct score|dokladny wynik|first half|second half|polczas|ht\b|player|strzelec|shootout|race to|to qualify|method of victory|minutes|minut|frame|set betting|sety \d/.test(p)
  ) {
    return null;
  }

  const mentionsTeam = (team: string): boolean => {
    const tt = teamTokens(team);
    const pt = teamTokens(p);
    if (!tt.size || !pt.size) return false;
    let shared = 0;
    for (const t of tt) if (pt.has(t)) shared++;
    return shared > 0;
  };
  const homeMentioned = mentionsTeam(homeTeam);
  const awayMentioned = mentionsTeam(awayTeam);

  const totalM = p.match(
    /(?:over|under|ponad|ponizej|powyzej|ponizej|nad|pod)\s*(\d+(?:[.,]\d+)?)/,
  );
  const shortM = p.match(/(?:^|[^a-z])([ou])\s*(\d+(?:[.,]\d+)?)(?:[^a-z]|$)/);

  // Combined bets ("Real over 2.5", "Lech + BTTS") are ambiguous — AI decides.
  if ((totalM || shortM) && (homeMentioned || awayMentioned)) return null;

  if (totalM || shortM) {
    // Keyword form decides by the word; short form (O2.5 / U 3) by its letter.
    const side: "over" | "under" = totalM
      ? /under|ponizej|pod/.test(p) ? "under" : "over"
      : shortM![1] === "u" ? "under" : "over";
    const line = parseLine((totalM ? totalM[1] : shortM![2]));
    if (!Number.isFinite(line)) return null;
    return { kind: "total", side, line };
  }

  if (/btts|both team|obie (druzyn|strzel)|obaj|oboje|(?<![a-z])gg(?![a-z])|(?<![a-z])ng(?![a-z])|bien.?.?tre/.test(p)) {
    // BTTS z dodatkową nogą ("Lech win & both teams to score") to betbuilder — AI.
    if (homeMentioned !== awayMentioned) return null;
    const no = /(?<![a-z])(no|ng|nie)(?![a-z])/.test(p);
    return { kind: "btts", side: no ? "no" : "yes" };
  }

  // Draw no bet: "Lech DNB" — draw voids the stake instead of losing it.
  if (/draw\s*no\s*bet|(?<![a-z])dnb(?![a-z])/.test(p) && (homeMentioned || awayMentioned)) {
    return {
      kind: "winner",
      side: homeMentioned ? "home" : "away",
      dnb: true,
    };
  }

  // Double chance
  const noDraw =
    /no draw|remis nie|nie remis|(?<![\d.,])12(?![\d.,])|home or away|away or home/.test(p);
  const homeOrDraw =
    /(?<![\d.,])1x(?![\d.,])|(?<![\d.,])x1(?![\d.,])|home or draw|draw or home/.test(p);
  const drawOrAway =
    /(?<![\d.,])x2(?![\d.,])|(?<![\d.,])2x(?![\d.,])|draw or away|away or draw/.test(p);
  if (noDraw) return { kind: "winner", side: "no_draw" };
  if (homeOrDraw) return { kind: "winner", side: "home_draw" };
  if (drawOrAway) return { kind: "winner", side: "draw_away" };

  // Explicit draw
  if (/\bdraw\b|remis/.test(p)) return { kind: "winner", side: "draw" };

  // Winner by team mention (both mentioned -> ambiguous, let AI decide)
  if (homeMentioned && awayMentioned) return null;
  if (homeMentioned) {
    // "Lech or draw" to 1X, nie czysta jedynka.
    if (/or draw|draw or|lub remis|remis lub/.test(p)) return { kind: "winner", side: "home_draw" };
    return { kind: "winner", side: "home" };
  }
  if (awayMentioned) {
    if (/or draw|draw or|lub remis|remis lub/.test(p)) return { kind: "winner", side: "draw_away" };
    return { kind: "winner", side: "away" };
  }

  // Home/away words and bare 1/2/X codes
  if (/home win|win for home|home team/.test(p)) return { kind: "winner", side: "home" };
  if (/away win|win for away|away team/.test(p)) return { kind: "winner", side: "away" };
  if (/(?:^|[^a-z\d])1(?:[^a-z\d]|$)/.test(p)) return { kind: "winner", side: "home" };
  if (/(?:^|[^a-z\d])2(?:[^a-z\d]|$)/.test(p)) return { kind: "winner", side: "away" };
  if (/(?:^|[^a-z\d])x(?:[^a-z\d]|$)/.test(p)) return { kind: "winner", side: "draw" };

  return null;
};

/**
 * Rozstrzyga typ na podstawie realnego wyniku. Zwraca "unresolved", gdy rynek
 * jest nietypowy — wywołujący decyduje, czy pyta AI o interpretację zakładu.
 */
export const settleMarket = (
  prediction: string,
  sport: string,
  homeTeam: string,
  awayTeam: string,
  score: { home: number; away: number },
): SettleOutcome => {
  const market = parseMarket(prediction, homeTeam, awayTeam);
  if (!market) return "unresolved";
  const outcome = outcomeOf(score);

  if (market.kind === "total") {
    const total = score.home + score.away;
    const line = market.line!;
    if (market.side === "over") {
      if (total > line) return "won";
      if (total < line) return "lost";
      return "void"; // exact hit on a whole-number line -> push
    }
    if (total < line) return "won";
    if (total > line) return "lost";
    return "void";
  }

  if (market.kind === "btts") {
    const both = score.home > 0 && score.away > 0;
    if (market.side === "yes") return both ? "won" : "lost";
    return both ? "lost" : "won";
  }

  // winner-family sides
  switch (market.side) {
    case "home":
      if (outcome === "draw") return market.dnb ? "void" : "lost";
      return outcome === "home" ? "won" : "lost";
    case "away":
      if (outcome === "draw") return market.dnb ? "void" : "lost";
      return outcome === "away" ? "won" : "lost";
    case "draw":
      return outcome === "draw" ? "won" : "lost";
    case "no_draw":
      return outcome !== "draw" ? "won" : "lost";
    case "home_draw":
      return outcome === "home" || outcome === "draw" ? "won" : "lost";
    case "draw_away":
      return outcome === "away" || outcome === "draw" ? "won" : "lost";
  }
  return "unresolved";
};

/** Full settlement of one tip against one matched event. */
export const settleTipAgainstEvent = (
  tip: TipLike,
  prediction: string,
  match: EventMatch,
): { status: SettleOutcome; method: "auto" | "ai"; finalScore: string | null } => {
  const { event, swapped } = match;
  const finalScore = displayScore(event.scores, tip.sport);

  if (event.status === "cancelled" || event.status === "postponed") {
    return { status: "void", method: "auto", finalScore: null };
  }

  // The score must match the market: hockey 1X2 settles on the OT-inclusive
  // result while hockey totals settle on regulation, football on 90 min etc.
  const market = parseMarket(prediction, event.home, event.away);
  const marketKind: MarketKind = market ? market.kind : "total";
  let score = pickScore(event.scores, tip.sport, marketKind);
  if (!score && marketKind !== "winner") {
    score = pickScore(event.scores, tip.sport, "winner");
  }
  if (swapped && score) score = { home: score.away, away: score.home };
  if (!score || event.status !== "settled") {
    return { status: "unresolved", method: "auto", finalScore };
  }

  // settleMarket zawsze pracuje w orientacji TIPA: przy swapped wynik został
  // już odwrócony do jego orientacji, więc i nazwy drużyn muszą być jego.
  return {
    status: settleMarket(prediction, tip.sport, tip.homeTeam, tip.awayTeam, score),
    method: "auto",
    finalScore,
  };
};

/** Kupon: lost dominuje, wygrana wymaga pełnego kompletu, void zwraca stawkę. */
export const aggregateCoupon = (
  statuses: (SettledStatus | null)[],
): SettledStatus | null => {
  if (!statuses.length) return null;
  if (statuses.some((s) => s === null)) return null; // nie wszystko rozstrzygnięte
  if (statuses.some((s) => s === "lost")) return "lost";
  if (statuses.every((s) => s === "won")) return "won";
  return "void"; // won + void
};

// ---------------------------------------------------------------------------
// Match events (SofaScore incidents) — kontekst dla fallbacku AI. Typy
// playerskie (strzelec, kartka, asysta) nie dadzą się rozstrzygnąć z samego
// wyniku 2:1, więc AI dostaje listę strzelców/kartek realnego meczu.
// ---------------------------------------------------------------------------

export interface RawIncident {
  incidentType?: string;
  incidentClass?: string;
  time?: number;
  isHome?: boolean;
  player?: { name?: string } | null;
  assist1?: { name?: string } | null;
  homeScore?: number | null;
  awayScore?: number | null;
}

/** Zwarta, jednowierszowa lista zdarzeń meczu dla promptu AI. */
export const describeIncidents = (incidents: RawIncident[]): string | null => {
  if (!Array.isArray(incidents) || !incidents.length) return null;
  const lines: string[] = [];

  for (const inc of incidents) {
    const minute = typeof inc.time === "number" ? `${inc.time}'` : "?";
    const name = String(inc.player?.name || "").trim();
    const score =
      typeof inc.homeScore === "number" && typeof inc.awayScore === "number"
        ? ` [${inc.homeScore}:${inc.awayScore}]`
        : "";

    if (inc.incidentType === "goal") {
      if (!name) continue;
      const cls = String(inc.incidentClass || "");
      const tag = cls === "owngoal" ? " (own goal)" : cls === "penalty" ? " (pen)" : "";
      const assist = inc.assist1?.name ? ` (assist: ${inc.assist1.name})` : "";
      const side = inc.isHome ? "home" : "away";
      lines.push(`GOAL ${minute} ${name}${tag}${assist}${score}`);
    } else if (inc.incidentType === "card" && name) {
      const cls = String(inc.incidentClass || "");
      const card = cls === "red" || cls === "yellowred" ? "RED" : "YELLOW";
      lines.push(`${card} ${minute} ${name}`);
    }
  }

  return lines.length ? lines.join("\n") : null;
};

/** Yesterday (Europe/Warsaw) as "YYYY-MM-DD". */
export const yesterdayInWarsaw = (now: Date = new Date()): string => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
