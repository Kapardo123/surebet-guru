import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  Sparkles,
  ArrowRight,
  CheckCheck,
  Trophy,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import { markImported, ImportTarget, ScrapedMatch } from "@/lib/sportyTrader";
import {
  fetchZawodTyperList,
  analyzeMatches,
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
const CHECK_UI: Record<
  KickoffCheck["status"],
  { label: (c: KickoffCheck) => string; className: string }
> = {
  confirmed: {
    label: () => "termin potwierdzony",
    className: "border-emerald-500/50 text-emerald-300",
  },
  time_mismatch: {
    label: (c) => `zły termin! wg terminarza ${c.officialKickoff}`,
    className: "border-red-500/60 text-red-300",
  },
  cancelled: {
    label: () => "mecz odwołany",
    className: "border-red-500/60 text-red-300",
  },
  not_found: {
    label: () => "nie znaleziono w terminarzu",
    className: "border-muted-foreground/40 text-muted-foreground",
  },
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
  const [expanded, setExpanded] = useState<string | null>(null);
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
        title: `Pobrano ${fresh.length} typów`,
        description:
          `${notImported} niezaimportowanych, bez analiz AI.` +
          (bad > 0 ? ` ⚠️ ${bad} ze złym terminem lub odwołanych.` : ""),
      });
    } catch (e: any) {
      toast({
        title: "Nie udało się pobrać typów",
        description: e?.message || "zawodtyper-proxy nie odpowiada",
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
        title: `Za dużo naraz (${pendingAnalysis.length})`,
        description: `Maksymalnie ${MAX_BATCH} meczów na jedną generację.`,
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
      persist(matches, next, date);

      const written = pendingAnalysis.filter((m) => next[m.id]?.ok).length;
      const failed = pendingAnalysis.length - written;
      toast({
        title: written > 0 ? `AI napisało ${written} analiz ✍️` : "AI nie napisało żadnej analizy",
        description:
          failed > 0
            ? `${failed} nie powiodło się — zostaje surowy polski tekst, nie da się ich zaimportować. Kliknij ponownie, żeby spróbować.`
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

  const handleRoute = (m: ZawodTyperMatch, target: ImportTarget) => {
    const analysis = analyses[m.id];
    if (!analysis?.ok) {
      toast({
        title: analysis ? "Analiza AI nie powiodła się" : "Najpierw wygeneruj analizę",
        description: analysis
          ? "Ten mecz ma tylko surowy polski tekst ze źródła. Wygeneruj analizę ponownie."
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

    const label =
      target === "coupon" ? "kuponu" : target === "hero" ? "Hero Pick" : "Single Tip";
    toast({
      title: `Wysłano do ${label} ✅`,
      description: `${m.homeTeam}${m.awayTeam ? ` vs ${m.awayTeam}` : ""}`,
    });
  };

  const handleResetImported = async () => {
    if (
      !window.confirm(
        "Wyczyścić historię importu z ZawodTyper? Typy ze SportyTradera zostaną nietknięte.",
      )
    )
      return;
    setResetting(true);
    try {
      await clearImportedZTIds();
      setImportedIds(new Set());
      toast({ title: "Historia importu ZawodTyper wyczyszczona ✅" });
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
    clearZTCache();
  };

  const set = (patch: Partial<ZTFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      {/* Header + fetch controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-accent" />
          <h3 className="font-display text-sm font-bold">ZawodTyper Import</h3>
          {matches.length > 0 && (
            <Badge variant="outline" className="text-[9px]">
              {visible.length}/{matches.length} typów
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 w-[150px] text-xs"
          />
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
            title="Reset historii importu (tylko ZawodTyper)"
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
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pobieram...
              </>
            ) : (
              <>
                {fetched ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Pobierz typy
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Pobieranie nie uruchamia AI — typy są tu jeszcze po polsku. Dopiero „Generuj
        analizy AI” tłumaczy typ na angielski i pisze analizę, wyłącznie dla zaznaczonych.
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label className="space-y-1">
              <span className="text-[9px] uppercase text-muted-foreground">Kurs min</span>
              <Input
                type="number"
                step="0.05"
                min="1"
                value={filters.minOdds}
                onChange={(e) => set({ minOdds: parseFloat(e.target.value) || 1 })}
                className="h-8 text-xs"
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
                className="h-8 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] uppercase text-muted-foreground">
                Skuteczność autora min
              </span>
              <Input
                type="number"
                step="5"
                min="0"
                max="100"
                value={Math.round(filters.minRatio * 100)}
                onChange={(e) =>
                  set({ minRatio: (parseFloat(e.target.value) || 0) / 100 })
                }
                className="h-8 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[9px] uppercase text-muted-foreground">
                Min. typów autora
              </span>
              <Input
                type="number"
                step="1"
                min="0"
                value={filters.minBets}
                onChange={(e) => set({ minBets: parseInt(e.target.value, 10) || 0 })}
                className="h-8 text-xs"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="Szukaj drużyny, typu lub autora..."
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              className="h-8 text-xs flex-1 min-w-[180px]"
            />
            <label className="flex items-center gap-2 text-[10px] cursor-pointer">
              <Checkbox
                checked={filters.hideSettled}
                onCheckedChange={(v) => set({ hideSettled: Boolean(v) })}
              />
              Ukryj rozstrzygnięte
            </label>
            <label className="flex items-center gap-2 text-[10px] cursor-pointer">
              <Checkbox
                checked={filters.hideBetbuilder}
                onCheckedChange={(v) => set({ hideBetbuilder: Boolean(v) })}
              />
              Ukryj betbuildery
            </label>
            <label className="flex items-center gap-2 text-[10px] cursor-pointer">
              <Checkbox
                checked={filters.onlyVerified}
                onCheckedChange={(v) => set({ onlyVerified: Boolean(v) })}
              />
              Tylko potwierdzony termin
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
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-[11px] bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
            onClick={handleGenerate}
            disabled={analyzing || pendingAnalysis.length === 0}
          >
            {analyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI pisze analizy...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
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
          // A wrong kickoff or a cancelled game outranks every other state:
          // it is the one thing that must not slip past unnoticed.
          const badKickoff =
            m.check?.status === "time_mismatch" || m.check?.status === "cancelled";
          return (
            <div
              key={m.id}
              className={`rounded-xl p-3 space-y-2.5 border transition-colors ${
                badKickoff
                  ? "bg-red-500/10 border-red-500/50"
                  : ready
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
                    {m.isBetbuilder && (
                      <Badge variant="outline" className="text-[9px] border-purple-500/40 text-purple-300">
                        betbuilder
                      </Badge>
                    )}
                    {m.settled && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          m.result === "1"
                            ? "border-emerald-500/40 text-emerald-300"
                            : "border-red-500/40 text-red-300"
                        }`}
                      >
                        {m.result === "1" ? "trafiony" : "nietrafiony"}
                      </Badge>
                    )}
                    {aiFailed && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-amber-500/50 text-amber-300"
                      >
                        AI nie powiodło się — surowy tekst PL
                      </Badge>
                    )}
                    {m.check && (
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${CHECK_UI[m.check.status].className}`}
                        title={
                          m.check.matchedName
                            ? `Terminarz: ${m.check.matchedName}${
                                m.check.officialLeague ? ` (${m.check.officialLeague})` : ""
                              }`
                            : "Nie dopasowano do żadnego meczu w terminarzu"
                        }
                      >
                        {CHECK_UI[m.check.status].label(m.check)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-sm font-bold min-w-0">
                    <TeamLogo teamName={m.homeTeam} size={18} />
                    <span className="truncate">{m.homeTeam}</span>
                    {m.awayTeam && (
                      <>
                        <span className="text-muted-foreground font-normal px-0.5">vs</span>
                        <TeamLogo teamName={m.awayTeam} size={18} />
                        <span className="truncate">{m.awayTeam}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 text-primary">
                      <Clock className="w-3 h-3" />
                      {m.check?.status === "time_mismatch" ? (
                        <>
                          <span className="line-through text-muted-foreground/60">
                            {m.date} {m.time}
                          </span>
                          <span className="text-red-300 font-semibold">
                            {m.check.officialKickoff}
                          </span>
                        </>
                      ) : (
                        <>
                          {m.date} {m.time}
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {m.authorName} · {Math.round(m.authorRatio * 100)}% z {m.authorBets}
                      {m.authorRank ? ` · #${m.authorRank}` : ""}
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
                  {/* After translation, keep the Polish original in view so the
                      admin can check the market was read correctly. */}
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

              {/* Evidence for the kickoff badge. Shown for every checked match,
                  not just failures: "confirmed" is only trustworthy if you can
                  see which fixture it matched and in which competition. */}
              {m.check?.matchedName && (
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  Terminarz:{" "}
                  <span className="text-foreground">{m.check.matchedName}</span>
                  {m.check.officialLeague && <> · {m.check.officialLeague}</>}
                  {m.check.officialKickoff && (
                    <> · <span className="text-foreground">{m.check.officialKickoff}</span></>
                  )}
                </div>
              )}
              {!m.check?.officialLeague && ready && analysis.league && (
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
                  {expanded === m.id ? "Ukryj" : "Pokaż"}{" "}
                  {ready ? "analizę AI i oryginał" : "oryginalną analizę (PL)"}
                </button>
                {expanded === m.id && (
                  <div className="mt-1.5 space-y-2">
                    {ready && (
                      <p className="text-[11px] leading-relaxed whitespace-pre-line border-l-2 border-emerald-500/40 pl-2">
                        {analysis.analysis}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line border-l-2 border-border pl-2">
                      {m.analysisRaw || "(autor nie dodał opisu)"}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[10px]"
                  disabled={!ready}
                  onClick={() => handleRoute(m, "tip")}
                >
                  <TrendingUp className="w-3 h-3" /> Tip
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[10px] border-accent/40 text-accent hover:bg-accent/10"
                  disabled={!ready}
                  onClick={() => handleRoute(m, "hero")}
                >
                  <Zap className="w-3 h-3" /> Hero
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 text-[10px] border-blue-500/40 text-blue-300 hover:bg-blue-500/10"
                  disabled={!ready}
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

export default ZawodTyperImport;
