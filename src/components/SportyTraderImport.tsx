import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Loader2,
  TrendingUp,
  Zap,
  Receipt,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);
  const [editingOdds, setEditingOdds] = useState<string>("");
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const handleOddsChange = (id: string, value: string) => {
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) return;
    setMatches((prev) => {
      const next = prev.map((m) => m.id === id ? { ...m, odds: parsed } : m);
      writeMatchesCache(next, fetchedAt ?? Date.now());
      return next;
    });
    setEditingOdds("");
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
      // Skip matches that have no odds on the site.
      const cards: MatchCard[] = fresh
        .map((item, i) => {
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
        })
        .filter((c) => c.odds > 0)
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
      const newCount = cards.filter((c) => !seenIds.has(c.id)).length;
      // Save current cards as seen for next comparison
      const currentIds = new Set(cards.map((c) => c.id));
      setSeenIds(currentIds);
      try { localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...currentIds])); } catch { /* ignore */ }
      setMatches(cards);
      setFetched(true);
      setFetchedAt(now);
      writeMatchesCache(cards, now);
      toast({
        title: `Loaded ${cards.length} matches`,
        description: newCount > 0 ? `${newCount} new since last visit` : undefined,
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
    if (!window.confirm("Usunąć historię zaimportowanych meczy? Po tym wszystkie mecze będą dostępne do ponownego importu.")) return;
    setResetting(true);
    try {
      await clearImportedIds();
      setImportedIds(new Set());
      try { localStorage.removeItem(IMPORTED_IDS_KEY); } catch { /* ignore */ }
      toast({ title: "Historia importu wyczyszczona ✅" });
    } catch {
      toast({ title: "Błąd czyszczenia historii", variant: "destructive" });
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" />
          <h3 className="font-display text-sm font-bold">SportyTrader Import</h3>
          {matches.length > 0 && (
            <Badge variant="outline" className="text-[9px]">
              {matches.length} matches
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {matches.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 px-2 text-muted-foreground hover:text-loss"
              onClick={handleClear}
              title="Clear fetched list"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-9 px-2 text-muted-foreground hover:text-amber-400"
            onClick={handleResetImported}
            disabled={resetting}
            title="Reset import history — allows re-importing matches"
          >
            {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 bg-accent hover:bg-accent/90"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {progress ? `${progress.done}/${progress.total}` : "Loading..."}
              </>
            ) : (
              <>
                {fetched ? <RefreshCw className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                Pobierz mecze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Coupon builder indicator */}
      {couponCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-blue-300">
              Coupon builder: {couponCount} {couponCount === 1 ? "match" : "matches"}
            </span>
          </div>
          {onGoToCoupon && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[10px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
              onClick={onGoToCoupon}
            >
              Open Coupons <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {fetched && !loading && matches.length === 0 && (
        <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/50">
          <p className="text-xs text-muted-foreground">
            No matches with odds. Already-imported matches are skipped. Hit "Pobierz mecze" to refresh.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
        {matches.map((m) => {
          const isImported = importedIds.has(m.id);
          const isNew = !seenIds.has(m.id);
          return (
          <div
            key={m.id}
            className={`rounded-xl p-3 space-y-2.5 border transition-colors ${
              isImported
                ? "bg-emerald-500/10 border-emerald-500/40"
                : isNew
                  ? "bg-amber-500/5 border-amber-500/30"
                  : "bg-card border-border/50"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {m.sport}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">{m.league}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-bold min-w-0">
                  <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo || undefined} size={18} />
                  <span className="truncate">{m.homeTeam}</span>
                  <span className="text-muted-foreground font-normal px-0.5">vs</span>
                  <TeamLogo teamName={m.awayTeam} logoUrl={m.awayTeamLogo || undefined} size={18} />
                  <span className="truncate">{m.awayTeam}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-primary justify-end">
                  <Clock className="w-3 h-3" />
                  {m.date} {m.time}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <span className="text-xs font-semibold truncate">{m.prediction || "—"}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {m.odds > 0 ? (
                  <span className="text-sm font-black text-accent">@ {m.odds.toFixed(2)}</span>
                ) : (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-muted-foreground/50">Odds:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1.01"
                      placeholder="—"
                      className="w-16 h-7 text-xs font-bold text-center bg-muted/50 border border-border/50 rounded-md outline-none focus:border-accent"
                      value={editingOdds === m.id ? undefined : ""}
                      onFocus={() => setEditingOdds(m.id)}
                      onBlur={() => setTimeout(() => setEditingOdds(""), 200)}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) handleOddsChange(m.id, val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const val = (e.target as HTMLInputElement).value;
                          if (val) handleOddsChange(m.id, val);
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {m.analysis && (
              <div>
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                >
                  {expanded === m.id ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {expanded === m.id ? "Hide" : "Show"} rewritten analysis
                </button>
                {expanded === m.id && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5 whitespace-pre-line">
                    {m.analysis}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[10px]"
                onClick={() => handleRoute(m, "tip")}
              >
                <TrendingUp className="w-3 h-3" /> Tip
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[10px] border-accent/40 text-accent hover:bg-accent/10"
                onClick={() => handleRoute(m, "hero")}
              >
                <Zap className="w-3 h-3" /> Hero
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1 text-[10px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                onClick={() => handleRoute(m, "coupon")}
              >
                <Receipt className="w-3 h-3" /> Coupon
              </Button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default SportyTraderImport;
