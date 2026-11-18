import { useState, useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCheck, Loader2, Sparkles, Trophy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CouponBar, FilterChip, ImportEmpty, ImportGrid, ImportMatchCard, ImportToolbar, OddsValue, Tag, TagTone } from "@/components/import/ImportKit";
import { markImported, ImportTarget, ScrapedMatch } from "@/lib/sportyTrader";
import {
  fetchZawodTyperList,
  analyzeMatches,
  applyAnalysisNames,
  toScrapedMatch,
  readZTCache,
  writeZTCache,
  clearZTCache,
  getImportedZTIds,
  clearImportedZTIds,
  applyZTFilters,
  defaultZTFilters,
  ZawodTyperMatch,
  ZawodTyperAnalysis,
  ZTFilters,
  KickoffCheck,
} from "@/lib/zawodTyper";

// How a verified kickoff is presented on the card.
const CHECK_UI: Record<KickoffCheck["status"], { label: (c: KickoffCheck) => string; tone: TagTone }> = {
  confirmed: { label: () => "Kick-off confirmed", tone: "green" },
  time_mismatch: { label: (c) => `Wrong kick-off! Fixture list: ${c.officialKickoff}`, tone: "red" },
  cancelled: { label: () => "Match cancelled", tone: "red" },
  not_found: { label: () => "Not in fixture list", tone: "muted" },
};

interface Props {
  onImport: (match: ScrapedMatch, analysis: string, target: ImportTarget) => void;
  couponCount?: number;
  onGoToCoupon?: () => void;
}

// ai-analyze rejects oversized batches to protect the OpenRouter budget.
const MAX_BATCH = 25;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

const ZawodTyperImport = ({ onImport, couponCount = 0, onGoToCoupon }: Props) => {
  const { toast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [matches, setMatches] = useState<ZawodTyperMatch[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, ZawodTyperAnalysis>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ZTFilters>(defaultZTFilters);
  const [fetched, setFetched] = useState(false);

  // Restore the last fetch so switching admin tabs does not lose the day's list
  // (and, more importantly, does not lose already-generated analyses).
  useEffect(() => {
    const cached = readZTCache();
    if (cached) {
      setMatches(cached.matches);
      setAnalyses(cached.analyses || {});
      setDate(cached.date || todayISO());
      setFetched(true);
    }
    getImportedZTIds().then(setImportedIds).catch(() => {});
  }, []);

  const persist = (
    nextMatches: ZawodTyperMatch[],
    nextAnalyses: Record<string, ZawodTyperAnalysis>,
    nextDate: string,
  ) => {
    writeZTCache({
      ts: Date.now(),
      date: nextDate,
      matches: nextMatches,
      analyses: nextAnalyses,
    });
  };

  const visible = useMemo(
    () => applyZTFilters(matches, filters, importedIds),
    [matches, filters, importedIds],
  );

  const sports = useMemo(
    () => Array.from(new Set(matches.map((m) => m.sport).filter(Boolean))).sort(),
    [matches],
  );

  // Only count selections that survive the current filters.
  const selectedVisible = useMemo(
    () => visible.filter((m) => selected.has(m.id)),
    [visible, selected],
  );

  // Rows whose analysis failed are pending again, so "Generuj" retries them.
  const pendingAnalysis = selectedVisible.filter((m) => !analyses[m.id]?.ok);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const [{ matches: fresh, date: usedDate }, imported] = await Promise.all([
        fetchZawodTyperList(date),
        getImportedZTIds(),
      ]);
      setImportedIds(imported);
      setMatches(fresh);
      setSelected(new Set());
      setFetched(true);
      setDate(usedDate || date);
      // Keep analyses for matches still present, drop the rest.
      const kept: Record<string, ZawodTyperAnalysis> = {};
      for (const m of fresh) if (analyses[m.id]) kept[m.id] = analyses[m.id];
      setAnalyses(kept);
      persist(fresh, kept, usedDate || date);

      const notImported = fresh.filter((m) => !imported.has(m.id)).length;
      const bad = fresh.filter(
        (m) => m.check?.status === "time_mismatch" || m.check?.status === "cancelled",
      ).length;
      toast({
        title: `Fetched ${fresh.length} picks`,
        description:
          `${notImported} not imported yet, no AI analyses.` +
          (bad > 0 ? ` ⚠️ ${bad} with a wrong kick-off or cancelled.` : ""),
      });
    } catch (e: any) {
      toast({
        title: "Could not fetch picks",
        description: e?.message || "zawodtyper-proxy is not responding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const room = MAX_BATCH - selectedVisible.length;
    if (room <= 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of visible) {
        if (next.size >= MAX_BATCH) break;
        next.add(m.id);
      }
      return next;
    });
  };

  // THE AI STEP — runs here and nowhere else, on the current selection only.
  const handleGenerate = async () => {
    if (pendingAnalysis.length === 0) return;
    if (pendingAnalysis.length > MAX_BATCH) {
      toast({
        title: `Too many at once (${pendingAnalysis.length})`,
        description: `At most ${MAX_BATCH} matches per run.`,
        variant: "destructive",
      });
      return;
    }
    setAnalyzing(true);
    try {
      const results = await analyzeMatches(pendingAnalysis);
      const next = { ...analyses };
      pendingAnalysis.forEach((m, i) => {
        const r = results[i];
        if (r?.analysis) next[m.id] = r;
      });
      setAnalyses(next);
      // Same step also fixes the team names: successful analyses carry back
      // canonical (English Wikipedia style) spellings, so cards show — and
      // TeamLogo searches — names the logo sources actually recognise.
      const renamed = applyAnalysisNames(matches, next);
      const nameFixes = renamed.reduce(
        (n, m, i) =>
          n +
          (m.homeTeam !== matches[i].homeTeam || m.awayTeam !== matches[i].awayTeam
            ? 1
            : 0),
        0,
      );
      setMatches(renamed);
      persist(renamed, next, date);

      const written = pendingAnalysis.filter((m) => next[m.id]?.ok).length;
      const failed = pendingAnalysis.length - written;
      toast({
        title: written > 0 ? `AI wrote ${written} analyses ✍️` : "AI wrote no analyses",
        description:
          (failed > 0
            ? `${failed} failed and keep the raw Polish text, so they can't be imported. Generate again to retry. `
            : "You can now send them to Tip / Hero / Coupon. ") +
          (nameFixes > 0 ? `Fixed ${nameFixes} team names.` : ""),
        variant: written === 0 ? "destructive" : undefined,
      });
    } catch (e: any) {
      toast({
        title: "Generating analyses failed",
        description: e?.message || "ai-analyze is not responding",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRoute = (m: ZawodTyperMatch, target: ImportTarget) => {
    const analysis = analyses[m.id];
    if (!analysis?.ok) {
      toast({
        title: analysis ? "The AI analysis failed" : "Generate the analysis first",
        description: analysis
          ? "This match only has the raw Polish text from the source. Generate the analysis again."
          : "Select the match and tap Generate AI analyses.",
        variant: "destructive",
      });
      return;
    }

    setImportedIds((prev) => new Set(prev).add(m.id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(m.id);
      return next;
    });

    const scraped = toScrapedMatch(m, analysis);
    onImport(scraped, analysis.analysis, target);
    markImported(scraped, target).catch(() => {});

    const label =
      target === "coupon" ? "the coupon" : target === "hero" ? "Hero Pick" : "Single Tip";
    toast({
      title: `Sent to ${label} ✅`,
      description: `${m.homeTeam}${m.awayTeam ? ` vs ${m.awayTeam}` : ""}`,
    });
  };

  const handleResetImported = async () => {
    if (
      !window.confirm(
        "Clear the ZawodTyper import history? SportyTrader stays untouched.",
      )
    )
      return;
    setResetting(true);
    try {
      await clearImportedZTIds();
      setImportedIds(new Set());
      toast({ title: "ZawodTyper import history cleared ✅" });
    } catch {
      toast({ title: "Could not clear the history", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleClear = () => {
    setMatches([]);
    setAnalyses({});
    setSelected(new Set());
    setFetched(false);
    clearZTCache();
  };

  const set = (patch: Partial<ZTFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const field = "h-9 w-full rounded-[10px] bg-white/[0.06] border border-white/10 px-3 text-[13px] outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      <ImportToolbar
        title="ZawodTyper"
        count={matches.length > 0 ? `${visible.length}/${matches.length} picks` : null}
        subtitle="Fetching doesn't run AI: picks stay in Polish until you select them and generate the analyses, which also translate the pick to English."
        controls={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Day"
            className="h-10 w-full sm:w-[150px] [color-scheme:dark] rounded-full bg-white/[0.06] border border-white/10 px-3 text-[13px] font-semibold outline-none focus:border-primary"
          />
        }
        fetched={fetched}
        loading={loading}
        fetchLabel="Fetch picks"
        onFetch={handleFetch}
        onClear={matches.length > 0 ? handleClear : undefined}
        onReset={handleResetImported}
        resetting={resetting}
      />

      <CouponBar count={couponCount} onOpen={onGoToCoupon} />

      {/* Filters */}
      {matches.length > 0 && (
        <div className="rounded-[16px] bg-white/[0.04] border border-white/[0.08] p-3 space-y-3">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
            <FilterChip active={filters.sport === "All"} onClick={() => set({ sport: "All" })}>
              Every sport
            </FilterChip>
            {sports.map((s) => (
              <FilterChip key={s} active={filters.sport === s} onClick={() => set({ sport: s })}>
                {s}
              </FilterChip>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(
              [
                ["Min odds", filters.minOdds, "0.05", (v: string) => set({ minOdds: parseFloat(v) || 1 })],
                ["Max odds", filters.maxOdds, "0.05", (v: string) => set({ maxOdds: parseFloat(v) || 99 })],
                ["Author hit rate min %", Math.round(filters.minRatio * 100), "5", (v: string) => set({ minRatio: (parseFloat(v) || 0) / 100 })],
                ["Author picks min", filters.minBets, "1", (v: string) => set({ minBets: parseInt(v, 10) || 0 })],
              ] as const
            ).map(([label, value, step, onChange]) => (
              <label key={label} className="space-y-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{label}</span>
                <input type="number" step={step} min="0" value={value} onChange={(e) => onChange(e.target.value)} className={field} />
              </label>
            ))}
          </div>

          <input
            placeholder="Search team, pick or author…"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            className={field}
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filters.hideSettled} onClick={() => set({ hideSettled: !filters.hideSettled })}>
              Hide settled
            </FilterChip>
            <FilterChip active={filters.hideBetbuilder} onClick={() => set({ hideBetbuilder: !filters.hideBetbuilder })}>
              Hide bet builders
            </FilterChip>
            <FilterChip active={filters.onlyVerified} onClick={() => set({ onlyVerified: !filters.onlyVerified })}>
              Confirmed kick-off only
            </FilterChip>
          </div>
        </div>
      )}

      {/* Selection + AI action bar */}
      {visible.length > 0 && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-2 flex-wrap rounded-[16px] bg-card/95 backdrop-blur border border-white/10 px-3 py-2 shadow-[0_10px_30px_-12px_rgba(0,0,0,.7)]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={selectAllVisible}
              disabled={selectedVisible.length >= MAX_BATCH}
              className="h-8 px-3 rounded-full bg-white/[0.08] text-[12px] font-bold flex items-center gap-1 disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Select visible
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="h-8 px-2.5 rounded-full text-[12px] font-bold text-muted-foreground flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <span className="text-[12px] text-muted-foreground num">
              {selectedVisible.length}/{MAX_BATCH}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={analyzing || pendingAnalysis.length === 0}
            className="h-9 px-4 rounded-full foil-gold text-stock-ink font-bold text-[13px] flex items-center gap-1.5 shadow-[0_8px_20px_-8px_hsl(var(--gold)/.8)] disabled:opacity-50"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? "AI is writing…" : `Generate AI analyses (${pendingAnalysis.length})`}
          </button>
        </div>
      )}

      {fetched && !loading && visible.length === 0 && (
        <ImportEmpty>
          {matches.length === 0 ? "No picks for this day." : "No pick passes the filters (imported picks are hidden)."}
        </ImportEmpty>
      )}

      <ImportGrid>
        {visible.map((m) => {
          const analysis = analyses[m.id];
          const ready = analysis?.ok === true;
          const aiFailed = !!analysis && !analysis.ok;
          const isSelected = selected.has(m.id);
          // A wrong kickoff or a cancelled game outranks every other state:
          // it is the one thing that must not slip past unnoticed.
          const badKickoff = m.check?.status === "time_mismatch" || m.check?.status === "cancelled";
          const state = badKickoff ? "bad" : ready ? "ready" : aiFailed ? "warn" : isSelected ? "selected" : "idle";
          return (
            <ImportMatchCard
              key={m.id}
              sport={m.sport}
              league={m.check?.officialLeague || (ready ? analysis.league : undefined) || undefined}
              homeTeam={m.homeTeam}
              awayTeam={m.awayTeam || undefined}
              homeLogo={m.homeTeamLogo}
              awayLogo={m.awayTeamLogo}
              kickoff={m.kickoff}
              kickoffText={
                m.check?.status === "time_mismatch" ? (
                  <>
                    <span className="line-through opacity-45">
                      {m.date} {m.time}
                    </span>
                    <span className="text-red">{m.check.officialKickoff}</span>
                  </>
                ) : undefined
              }
              prediction={(ready && analysis.prediction) || m.predictionRaw || "—"}
              predictionNote={ready && analysis.prediction ? `PL: ${m.predictionRaw}` : undefined}
              odds={<OddsValue value={m.odds} />}
              state={state}
              stampText={m.check?.status === "cancelled" ? "Cancelled" : aiFailed ? "AI failed" : undefined}
              leading={
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(m.id)}
                  disabled={!isSelected && selectedVisible.length >= MAX_BATCH}
                  aria-label="Select for AI analysis"
                  className="block border-stock-ink/40"
                />
              }
              tags={
                <>
                  {m.isBetbuilder && <Tag tone="violet">Bet builder</Tag>}
                  {m.settled && <Tag tone={m.result === "1" ? "green" : "red"}>{m.result === "1" ? "Hit" : "Missed"}</Tag>}
                  {aiFailed && <Tag tone="amber">AI failed: raw Polish text</Tag>}
                  {m.check && (
                    <Tag
                      tone={CHECK_UI[m.check.status].tone}
                      title={
                        m.check.matchedName
                          ? `Fixture list: ${m.check.matchedName}${m.check.officialLeague ? ` (${m.check.officialLeague})` : ""}${
                              m.check.officialKickoff ? ` · ${m.check.officialKickoff}` : ""
                            }`
                          : "Not matched to any fixture"
                      }
                    >
                      {CHECK_UI[m.check.status].label(m.check)}
                    </Tag>
                  )}
                </>
              }
              meta={
                <>
                  <span className="flex items-center gap-1 opacity-70 min-w-0">
                    <Trophy className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {m.authorName} · {Math.round(m.authorRatio * 100)}% of {m.authorBets}
                      {m.authorRank ? ` · #${m.authorRank}` : ""}
                    </span>
                  </span>
                  {m.bookmaker && <span className="opacity-55">{m.bookmaker}</span>}
                </>
              }
              analysis={
                <>
                  {m.check?.matchedName && (
                    <p className="text-[11px] opacity-60">
                      Fixture list: <b>{m.check.matchedName}</b>
                      {m.check.officialLeague && <> · {m.check.officialLeague}</>}
                      {m.check.officialKickoff && <> · {m.check.officialKickoff}</>}
                    </p>
                  )}
                  {ready && <p className="whitespace-pre-line border-l-2 border-[hsl(145_60%_40%)] pl-2">{analysis.analysis}</p>}
                  <p className="whitespace-pre-line border-l-2 border-stock-ink/20 pl-2 opacity-60">
                    {m.analysisRaw || "(the author added no description)"}
                  </p>
                </>
              }
              analysisLabel={ready ? "AI analysis and original" : "original analysis (PL)"}
              actionsDisabled={!ready}
              onRoute={(t) => handleRoute(m, t)}
            />
          );
        })}
      </ImportGrid>
    </div>
  );
};

export default ZawodTyperImport;
