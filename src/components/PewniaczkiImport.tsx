import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  Loader2,
  Zap,
  Receipt,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Sparkles,
  ArrowRight,
  CheckCheck,
  X,
  Hourglass,
  Send,
} from "@/components/icons/gsb";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import { markImported, ImportTarget, ScrapedMatch } from "@/lib/sportyTrader";
import {
  fetchPewniaczkiList,
  analyzeMatches,
  applyAnalysisNames,
  toScrapedMatch,
  readPwCache,
  writePwCache,
  clearPwCache,
  getImportedPwIds,
  clearImportedPwIds,
  applyPwFilters,
  defaultPwFilters,
  PewniakMatch,
  PewniakAnalysis,
  PewniakDay,
  PwFilters,
} from "@/lib/pewniaczki";

interface Props {
  onImport: (match: ScrapedMatch, analysis: string, target: ImportTarget) => void;
  couponCount?: number;
  onGoToCoupon?: () => void;
}

// ai-analyze rejects oversized batches to protect the OpenRouter budget.
const MAX_BATCH = 25;

const PewniaczkiImport = ({ onImport, couponCount = 0, onGoToCoupon }: Props) => {
  const { toast } = useToast();
  const [day, setDay] = useState<PewniakDay>("today");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [matches, setMatches] = useState<PewniakMatch[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, PewniakAnalysis>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState<PwFilters>(defaultPwFilters);
  const [fetched, setFetched] = useState(false);
  // Web search + reasoning make the analysis fact-based but slower and ~10x
  // costlier per tip; the admin can switch it off for a cheap, fast pass.
  const [grounded, setGrounded] = useState(true);

  // Restore the last fetch so switching admin tabs does not lose the list (and
  // the already-generated analyses).
  useEffect(() => {
    const cached = readPwCache();
    if (cached) {
      setMatches(cached.matches);
      setAnalyses(cached.analyses || {});
      setDay(cached.day || "today");
      setFetched(true);
    }
    getImportedPwIds().then(setImportedIds).catch(() => {});
  }, []);

  const persist = (
    nextMatches: PewniakMatch[],
    nextAnalyses: Record<string, PewniakAnalysis>,
    nextDay: PewniakDay,
  ) => {
    writePwCache({
      ts: Date.now(),
      day: nextDay,
      matches: nextMatches,
      analyses: nextAnalyses,
    });
  };

  const visible = useMemo(
    () => applyPwFilters(matches, filters, importedIds),
    [matches, filters, importedIds],
  );

  const sports = useMemo(
    () => Array.from(new Set(matches.map((m) => m.sport).filter(Boolean))).sort(),
    [matches],
  );

  const selectedVisible = useMemo(
    () => visible.filter((m) => selected.has(m.id)),
    [visible, selected],
  );

  // Rows whose analysis failed are pending again, so "Generuj" retries them.
  const pendingAnalysis = selectedVisible.filter((m) => !analyses[m.id]?.ok);

  const handleFetch = async (targetDay: PewniakDay = day) => {
    setLoading(true);
    try {
      const [{ matches: fresh, day: usedDay }, imported] = await Promise.all([
        fetchPewniaczkiList(targetDay),
        getImportedPwIds(),
      ]);
      setImportedIds(imported);
      setMatches(fresh);
      setSelected(new Set());
      setFetched(true);
      setDay(usedDay || targetDay);
      // Keep analyses for matches still present, drop the rest.
      const kept: Record<string, PewniakAnalysis> = {};
      for (const m of fresh) if (analyses[m.id]) kept[m.id] = analyses[m.id];
      setAnalyses(kept);
      persist(fresh, kept, usedDay || targetDay);

      const notImported = fresh.filter((m) => !imported.has(m.id)).length;
      toast({
        title: `Pobrano ${fresh.length} typów (${usedDay === "tomorrow" ? "jutro" : "dziś"})`,
        description: `${notImported} niezaimportowanych, bez analiz AI.`,
      });
    } catch (e: any) {
      toast({
        title: "Nie udało się pobrać typów",
        description: e?.message || "pewniaczki-proxy nie odpowiada",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pickDay = (next: PewniakDay) => {
    if (next === day && matches.length > 0) return;
    setDay(next);
    handleFetch(next);
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
        title: `Za dużo naraz (${pendingAnalysis.length})`,
        description: `Maksymalnie ${MAX_BATCH} meczów na jedną generację.`,
        variant: "destructive",
      });
      return;
    }
    setAnalyzing(true);
    try {
      const results = await analyzeMatches(pendingAnalysis, grounded);
      const next = { ...analyses };
      pendingAnalysis.forEach((m, i) => {
        const r = results[i];
        if (r?.analysis) next[m.id] = r;
      });
      setAnalyses(next);
      const renamed = applyAnalysisNames(matches, next);
      setMatches(renamed);
      persist(renamed, next, day);

      const written = pendingAnalysis.filter((m) => next[m.id]?.ok).length;
      const failed = pendingAnalysis.length - written;
      toast({
        title: written > 0 ? `AI napisało ${written} analiz ✍️` : "AI nie napisało żadnej analizy",
        description:
          failed > 0
            ? `${failed} nie powiodło się. Kliknij ponownie, żeby spróbować.`
            : "Możesz teraz wysłać je do Tip / Hero / Coupon.",
        variant: written === 0 ? "destructive" : undefined,
      });
    } catch (e: any) {
      toast({
        title: "Generowanie analiz nie powiodło się",
        description: e?.message || "ai-analyze nie odpowiada",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRoute = (m: PewniakMatch, target: ImportTarget) => {
    const analysis = analyses[m.id];
    if (!analysis?.ok) {
      toast({
        title: analysis ? "Analiza AI nie powiodła się" : "Najpierw wygeneruj analizę",
        description: analysis
          ? "Ten mecz nie ma jeszcze analizy. Wygeneruj ją ponownie."
          : "Zaznacz mecz i kliknij „Generuj analizy AI”.",
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

    if (target === "queue") {
      toast({
        title: "Queued ⏳",
        description: `${m.homeTeam}${m.awayTeam ? ` vs ${m.awayTeam}` : ""} — live at 3:00 (edycja w Queue).`,
      });
      return;
    }
    if (target === "publish") {
      toast({
        title: "Published ✅",
        description: `${m.homeTeam}${m.awayTeam ? ` vs ${m.awayTeam}` : ""} — widoczny od razu.`,
      });
      return;
    }
    if (target === "hero") {
      toast({
        title: "Hero queued ⏳",
        description: `${m.homeTeam}${m.awayTeam ? ` vs ${m.awayTeam}` : ""} — Release w Queue.`,
      });
      return;
    }
    toast({
      title: `Coupon leg added 🧾 (${couponCount + 1})`,
      description: `${m.homeTeam}${m.awayTeam ? ` vs ${m.awayTeam}` : ""} — finish in the Queue tab.`,
    });
  };

  const handleResetImported = async () => {
    if (
      !window.confirm(
        "Wyczyścić historię importu z Pewniaczków? Typy z innych źródeł zostaną nietknięte.",
      )
    )
      return;
    setResetting(true);
    try {
      await clearImportedPwIds();
      setImportedIds(new Set());
      toast({ title: "Historia importu Pewniaczki wyczyszczona ✅" });
    } catch {
      toast({ title: "Błąd czyszczenia historii", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleClear = () => {
    setMatches([]);
    setAnalyses({});
    setSelected(new Set());
    setFetched(false);
    clearPwCache();
  };

  const set = (patch: Partial<PwFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      {/* Header + fetch controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" />
          <h3 className="font-display text-sm font-bold">Pewniaczki Import</h3>
          {matches.length > 0 && (
            <Badge variant="outline" className="text-[9px]">
              {visible.length}/{matches.length} typów
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/30 border border-border/50 rounded-lg p-0.5">
            {(["today", "tomorrow"] as PewniakDay[]).map((d) => (
              <button
                key={d}
                onClick={() => pickDay(d)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                  day === d
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "today" ? "Dziś" : "Jutro"}
              </button>
            ))}
          </div>
          {matches.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 px-2 text-muted-foreground hover:text-loss"
              onClick={handleClear}
              title="Wyczyść pobraną listę"
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
            title="Reset historii importu (tylko Pewniaczki)"
          >
            {resetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            className="h-9 gap-2 bg-accent hover:bg-accent/90"
            onClick={() => handleFetch(day)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pobieram...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Pobierz typy
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Pobieranie nie uruchamia AI — typy są tu jeszcze po polsku. Analiza z podstrony
        meczu jest dołączana automatycznie, a „Generuj analizy AI” tłumaczy ją wiernie na
        angielski (bez wstawek o bukmacherach) — wyłącznie dla zaznaczonych typów.
      </p>

      {/* Coupon builder indicator */}
      {couponCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-blue-500/10 border border-blue-500/25 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-blue-300">
              Kupon: {couponCount} {couponCount === 1 ? "mecz" : "meczów"}
            </span>
          </div>
          {onGoToCoupon && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[10px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
              onClick={onGoToCoupon}
            >
              Otwórz kupony <ArrowRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}

      {/* Filters */}
      {matches.length > 0 && (
        <div className="bg-muted/20 border border-border/50 rounded-xl p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant={filters.sport === "All" ? "default" : "outline"}
              className="h-7 text-[10px] px-2.5"
              onClick={() => set({ sport: "All" })}
            >
              Wszystkie
            </Button>
            {sports.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filters.sport === s ? "default" : "outline"}
                className="h-7 text-[10px] px-2.5"
                onClick={() => set({ sport: s })}
              >
                {s}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-[9px] uppercase text-muted-foreground">Kurs min</span>
              <Input
                type="number"
                step="0.05"
                min="1"
                value={filters.minOdds}
                onChange={(e) => set({ minOdds: parseFloat(e.target.value) || 1 })}
                className="h-8 w-[90px] text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] uppercase text-muted-foreground">Kurs max</span>
              <Input
                type="number"
                step="0.05"
                min="1"
                value={filters.maxOdds}
                onChange={(e) => set({ maxOdds: parseFloat(e.target.value) || 99 })}
                className="h-8 w-[90px] text-xs"
              />
            </label>
            <Input
              placeholder="Szukaj drużyny, typu lub ligi..."
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              className="h-8 text-xs flex-1 min-w-[180px]"
            />
            <label className="flex items-center gap-2 text-[10px] cursor-pointer h-8">
              <Checkbox
                checked={filters.hideSettled}
                onCheckedChange={(v) => set({ hideSettled: Boolean(v) })}
              />
              Ukryj rozstrzygnięte
            </label>
          </div>
        </div>
      )}

      {/* Selection + AI action bar */}
      {visible.length > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 flex-wrap bg-card/95 backdrop-blur border border-accent/30 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-[10px]"
              onClick={selectAllVisible}
              disabled={selectedVisible.length >= MAX_BATCH}
            >
              <CheckCheck className="w-3 h-3" /> Zaznacz widoczne
            </Button>
            {selected.size > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[10px] text-muted-foreground"
                onClick={() => setSelected(new Set())}
              >
                <X className="w-3 h-3" /> Odznacz
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground">
              Zaznaczono {selectedVisible.length}/{MAX_BATCH}
            </span>
            <label className="flex items-center gap-1.5 text-[10px] cursor-pointer text-muted-foreground">
              <Checkbox
                checked={grounded}
                onCheckedChange={(v) => setGrounded(Boolean(v))}
              />
              Web + reasoning (wolniej, ~$0.01/typ)
            </label>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[11px] bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
            onClick={handleGenerate}
            disabled={analyzing || pendingAnalysis.length === 0}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin brightness-0 invert" /> AI pisze analizy...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 brightness-0 invert" />
                Generuj analizy AI ({pendingAnalysis.length})
              </>
            )}
          </Button>
        </div>
      )}

      {fetched && !loading && visible.length === 0 && (
        <div className="text-center py-6 bg-muted/20 rounded-xl border border-dashed border-border/50">
          <p className="text-xs text-muted-foreground">
            {matches.length === 0
              ? "Brak typów na ten dzień."
              : "Żaden typ nie przechodzi filtrów (zaimportowane są ukrywane)."}
          </p>
        </div>
      )}

      {/* Match list */}
      <div className="grid grid-cols-1 gap-3 max-h-[560px] overflow-y-auto pr-1 custom-scrollbar">
        {visible.map((m) => {
          const analysis = analyses[m.id];
          const ready = analysis?.ok === true;
          const aiFailed = !!analysis && !analysis.ok;
          const isSelected = selected.has(m.id);
          return (
            <div
              key={m.id}
              className={`rounded-xl p-3 space-y-2.5 border transition-colors ${
                ready
                  ? "bg-emerald-500/10 border-emerald-500/40"
                  : aiFailed
                    ? "bg-amber-500/10 border-amber-500/50"
                    : isSelected
                      ? "bg-accent/10 border-accent/40"
                      : "bg-card border-border/50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggle(m.id)}
                  className="mt-1 shrink-0"
                  disabled={!isSelected && selectedVisible.length >= MAX_BATCH}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {m.sport}
                    </Badge>
                    {m.league && (
                      <Badge variant="outline" className="text-[9px]">
                        {m.league}
                      </Badge>
                    )}
                    {m.settled && (
                      <Badge variant="outline" className="text-[9px] border-red-500/40 text-red-300">
                        rozegrany
                      </Badge>
                    )}
                    {aiFailed && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-500/50 text-amber-300"
                      >
                        AI nie powiodło się
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-sm font-bold min-w-0">
                    <TeamLogo teamName={m.homeTeam} logoUrl={m.homeTeamLogo || undefined} size={18} />
                    <span className="truncate">{m.homeTeam}</span>
                    {m.awayTeam && (
                      <>
                        <span className="text-muted-foreground font-normal px-0.5">vs</span>
                        <TeamLogo teamName={m.awayTeam} logoUrl={m.awayTeamLogo || undefined} size={18} />
                        <span className="truncate">{m.awayTeam}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 text-primary">
                      <Clock className="w-3 h-3" />
                      {m.date} {m.time}
                    </span>
                    {m.bookmaker && <span>{m.bookmaker}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {(ready && analysis.prediction) || m.predictionRaw || "—"}
                  </div>
                  {ready && analysis.prediction && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      PL: {m.predictionRaw}
                    </div>
                  )}
                </div>
                <span className="text-sm font-black text-accent shrink-0">
                  @ {m.odds.toFixed(2)}
                </span>
              </div>

              {!m.league && ready && analysis.league && (
                <div className="text-[10px] text-muted-foreground">
                  Liga wg AI: <span className="text-foreground">{analysis.league}</span>
                </div>
              )}

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
                  {expanded === m.id ? "Ukryj" : "Pokaż"} analizę AI i oryginał
                </button>
                {expanded === m.id && (
                  <div className="mt-1.5 space-y-2">
                    {ready && (
                      <p className="text-[11px] leading-relaxed whitespace-pre-line border-l-2 border-emerald-500/40 pl-2">
                        {analysis.analysis}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line border-l-2 border-border pl-2">
                      {m.analysisRaw || "(brak analizy źródłowej — AI pisze od zera)"}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-9 gap-1 text-[11px] font-bold bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white col-span-2"
                  disabled={!ready}
                  onClick={() => handleRoute(m, "queue")}
                  title="Dodaj do kolejki — publikacja o 3:00"
                >
                  <Hourglass className="w-3.5 h-3.5 brightness-0 invert" /> Add to Queue (3:00)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[10px] border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                  disabled={!ready}
                  onClick={() => handleRoute(m, "publish")}
                  title="Dodaj i opublikuj natychmiast"
                >
                  <Send className="w-3 h-3" /> Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[10px] border-accent/40 text-accent hover:bg-accent/10"
                  disabled={!ready}
                  onClick={() => handleRoute(m, "hero")}
                  title="Dodaj do kolejki hero"
                >
                  <Zap className="w-3 h-3" /> Hero
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[10px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                  disabled={!ready}
                  onClick={() => handleRoute(m, "coupon")}
                  title="Dodaj nogę do buildera kuponu"
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

export default PewniaczkiImport;
