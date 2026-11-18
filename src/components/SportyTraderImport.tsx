import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CouponBar, ImportEmpty, ImportGrid, ImportMatchCard, ImportToolbar, OddsValue } from "@/components/import/ImportKit";
import {
  fetchSportyList,
  fetchSportyMatch,
  fetchClientOdds,
  getImportedIds,
  markImported,
  clearImportedIds,
  rewriteAnalysis,
  rewriteWithAI,
  readMatchesCache,
  writeMatchesCache,
  clearMatchesCache,
  ScrapedMatch,
  ImportTarget,
} from "@/lib/sportyTrader";
import { getSofaOdds } from "@/lib/sofaOdds";

interface MatchCard extends ScrapedMatch {
  analysis: string; // rewritten
}

interface Props {
  onImport: (match: ScrapedMatch, analysis: string, target: ImportTarget) => void;
  couponCount?: number;
  onGoToCoupon?: () => void;
}

// Resolve promises with a small concurrency limit to avoid hammering the proxy.
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = [];
  let done = 0;
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await fn(items[i], i);
      } catch {
        // ignore individual failures
      }
      done++;
      onProgress?.(done, items.length);
    }
  });
  await Promise.all(workers);
  return results;
}


const SportyTraderImport = ({ onImport, couponCount = 0, onGoToCoupon }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [matches, setMatches] = useState<MatchCard[]>([]);
  const [fetched, setFetched] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const handleOddsChange = (id: string, value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return;
    setMatches((prev) => {
      const next = prev.map((m) => m.id === id ? { ...m, odds: parsed } : m);
      writeMatchesCache(next, fetchedAt ?? Date.now());
      return next;
    });
  };

const IMPORTED_IDS_KEY = "gsb_sporty_imported_ids";
const SEEN_IDS_KEY = "gsb_sporty_seen_ids";

  // Track which match IDs we've already seen in a previous session (for "new" badge)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Restore from cache and localStorage on mount
  useEffect(() => {
    const cached = readMatchesCache<MatchCard>();
    if (cached) {
      const filtered = cached.cards.filter((c: MatchCard) => c.odds > 0).sort((a, b) => a.kickoff.localeCompare(b.kickoff));
      setMatches(filtered);
      setFetchedAt(cached.ts);
      setFetched(true);
    }
    // Restore imported IDs from localStorage (survives tab switches)
    try {
      const raw = localStorage.getItem(IMPORTED_IDS_KEY);
      if (raw) setImportedIds(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
    // Restore seen IDs
    try {
      const raw = localStorage.getItem(SEEN_IDS_KEY);
      if (raw) setSeenIds(new Set(JSON.parse(raw)));
    } catch { /* ignore */ }
    // Also sync from Supabase (merges with localStorage data)
    getImportedIds().then((ids) => {
      setImportedIds((prev) => {
        const merged = new Set(prev);
        ids.forEach((id) => merged.add(id));
        try { localStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify([...merged])); } catch { /* ignore */ }
        return merged;
      });
    }).catch(() => {});
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setProgress(null);
    try {
      const [list, supabaseImported, clientOddsMap] = await Promise.all([
        fetchSportyList(),
        getImportedIds(),
        fetchClientOdds().catch(() => ({})),
      ]);

      setImportedIds(supabaseImported);
      try { localStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify([...supabaseImported])); } catch { /* ignore */ }

      const fresh = list.filter((m) => !supabaseImported.has(m.id));

      if (fresh.length === 0) {
        setMatches([]);
        setFetched(true);
        setFetchedAt(Date.now());
        writeMatchesCache([], Date.now());
        toast({ title: "Everything is already imported." });
        return;
      }

      const details = await pool(
        fresh,
        4,
        (c) => fetchSportyMatch(c.url).catch(() => null),
        (done, total) => setProgress({ done, total }),
      );

      // Merge: odds from client-side parsing (real browser IP, not blocked),
      // fallback to edge function listing, then match detail page.
      // Only skip no-odds matches when client fetch succeeded (real odds available).
      const hasClientOdds = Object.keys(clientOddsMap).length > 0;
      const cards: MatchCard[] = fresh.map((item, i) => {
        const d = details[i];
        const clientOdds = clientOddsMap[item.id];
        const odds = (clientOdds ?? (item.odds != null ? item.odds : d?.odds)) || 0;
        return {
          id: item.id,
          url: item.url,
          homeTeam: d?.homeTeam || item.homeTeam,
          awayTeam: d?.awayTeam || item.awayTeam,
          sport: d?.sport || "Football",
          league: d?.league || "",
          date: d?.date || item.date,
          time: d?.time || item.time,
          kickoff: d?.kickoff || item.kickoff,
          prediction: item.prediction || d?.prediction || "",
          odds,
          analysisRaw: d?.analysisRaw || "",
          analysis: rewriteAnalysis(d?.analysisRaw || ""),
          homeTeamLogo: item.homeTeamLogo,
          awayTeamLogo: item.awayTeamLogo,
        };
      });

      // SofaScore enrichment: when SportyTrader serves the hideodd variant
      // (no odds in SSR at all), fill missing values from a second source.
      // Silent best-effort — any miss keeps the manual odds input.
      let sofaFilled = 0;
      const zeroOdds = cards.filter((c) => c.odds <= 0);
      if (zeroOdds.length > 0) {
        await pool(
          zeroOdds,
          4,
          async (c) => {
            const o = await getSofaOdds(c.homeTeam, c.awayTeam, c.kickoff, c.prediction);
            if (o != null) {
              c.odds = o;
              sofaFilled++;
            }
          },
        );
      }

      const usable = cards
        .filter((c) => !hasClientOdds || c.odds > 0)
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff));

      // AI rewrite: rewrite all analyses via OpenRouter, fallback to algorithmic
      const rawAnalyses = cards.map((c) => c.analysisRaw).filter((a) => a.length > 50);
      let aiRewrites: string[] = [];
      if (rawAnalyses.length > 0) {
        try {
          aiRewrites = await rewriteWithAI(rawAnalyses);
        } catch {
          // AI failed, will fall back to algorithmic rewriteAnalysis below
        }
      }
      let aiIdx = 0;
      for (const card of cards) {
        if (card.analysisRaw.length > 50 && aiRewrites[aiIdx]) {
          card.analysis = aiRewrites[aiIdx];
          aiIdx++;
        } else {
          card.analysis = rewriteAnalysis(card.analysisRaw);
        }
      }

      const now = Date.now();
      // Track which IDs are new (not in previous fetch)
      const newCount = usable.filter((c) => !seenIds.has(c.id)).length;
      // Save current cards as seen for next comparison
      const currentIds = new Set(usable.map((c) => c.id));
      setSeenIds(currentIds);
      try { localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...currentIds])); } catch { /* ignore */ }
      setMatches(usable);
      setFetched(true);
      setFetchedAt(now);
      writeMatchesCache(usable, now);
      const noOdds = usable.length > 0 && usable.every((c) => c.odds <= 0);
      toast({
        title: `Loaded ${usable.length} matches`,
        description: sofaFilled > 0
          ? `${newCount > 0 ? `${newCount} new · ` : ""}${sofaFilled} odds auto-filled from SofaScore`
          : noOdds
            ? "No odds found: type them on the cards, or set a free corsproxy.io key (localStorage: gsb_corsproxy_key)"
            : newCount > 0
              ? `${newCount} new since last visit`
              : undefined,
      });
    } catch (e: any) {
      toast({
        title: "Fetch failed",
        description: e.message || "Could not reach sportytrader-proxy",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleResetImported = async () => {
    if (!window.confirm("Clear the SportyTrader import history? Every match can then be imported again.")) return;
    setResetting(true);
    try {
      await clearImportedIds();
      setImportedIds(new Set());
      try { localStorage.removeItem(IMPORTED_IDS_KEY); } catch { /* ignore */ }
      toast({ title: "Import history cleared ✅" });
    } catch {
      toast({ title: "Could not clear the history", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleClear = () => {
    setMatches([]);
    setFetched(false);
    setFetchedAt(null);
    setImportedIds(new Set());
    clearMatchesCache();
    try { localStorage.removeItem(IMPORTED_IDS_KEY); } catch { /* ignore */ }
  };

  const handleRoute = async (card: MatchCard, target: ImportTarget) => {
    // Persist imported state BEFORE onImport (which may switch tabs and unmount us)
    setImportedIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      try { localStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    onImport(card, card.analysis, target);
    // Fire-and-forget: mark in Supabase (component may already be unmounting)
    markImported(card, target).catch(() => {});
    if (target === "coupon") {
      toast({
        title: "Added to coupon 🧾",
        description: `${card.homeTeam} vs ${card.awayTeam} — build more or open the Coupons tab to save.`,
      });
    } else {
      const label = target === "tip" ? "Single Tip" : "Hero Pick";
      toast({ title: `Sent to ${label} ✅`, description: `${card.homeTeam} vs ${card.awayTeam}` });
    }
  };

  return (
    <div className="space-y-4">
      <ImportToolbar
        title="SportyTrader"
        count={matches.length > 0 ? `${matches.length} matches` : null}
        subtitle="Picks with odds and an analysis rewritten by AI. Already imported matches are skipped."
        fetched={fetched}
        loading={loading}
        loadingText={progress ? `${progress.done}/${progress.total}` : "Fetching…"}
        onFetch={handleFetch}
        onClear={matches.length > 0 ? handleClear : undefined}
        onReset={handleResetImported}
        resetting={resetting}
      />

      <CouponBar count={couponCount} onOpen={onGoToCoupon} />

      {fetched && !loading && matches.length === 0 && (
        <ImportEmpty>No matches with odds. Already imported matches are skipped. Fetch again to refresh.</ImportEmpty>
      )}

      <ImportGrid>
        {matches.map((m) => {
          const isImported = importedIds.has(m.id);
          const isNew = !seenIds.has(m.id);
          return (
            <ImportMatchCard
              key={m.id}
              sport={m.sport}
              league={m.league}
              homeTeam={m.homeTeam}
              awayTeam={m.awayTeam}
              homeLogo={m.homeTeamLogo}
              awayLogo={m.awayTeamLogo}
              kickoff={m.kickoff}
              prediction={m.prediction || "—"}
              state={isImported ? "imported" : isNew ? "new" : "idle"}
              odds={
                m.odds > 0 ? (
                  <OddsValue value={m.odds} />
                ) : (
                  <input
                    type="number"
                    step="0.01"
                    min="1.01"
                    placeholder="add"
                    aria-label="Odds"
                    className="w-16 h-7 rounded-md bg-white border border-stock-ink/20 text-center num font-black text-[14px] outline-none focus:border-primary"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    onBlur={(e) => e.target.value && handleOddsChange(m.id, e.target.value)}
                  />
                )
              }
              analysis={m.analysis ? <p className="whitespace-pre-line opacity-80">{m.analysis}</p> : undefined}
              analysisLabel="rewritten analysis"
              onRoute={(t) => handleRoute(m, t)}
            />
          );
        })}
      </ImportGrid>
    </div>
  );
};

export default SportyTraderImport;
