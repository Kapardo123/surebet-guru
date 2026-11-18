import { ReactNode, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Crosshair,
  Download,
  Loader2,
  Receipt,
  RefreshCw,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import CardArt from "@/components/CardArt";
import SportGlyph from "@/components/SportGlyph";
import { sportTheme } from "@/lib/sport";
import { kickoffParts } from "@/lib/format";
import type { ImportTarget } from "@/lib/sportyTrader";

/*
 * Shared building blocks for every match scraper in the admin Import tab,
 * so each source looks and behaves the same and matches the app's cards.
 */

// ---------------------------------------------------------------------------
// Toolbar: source title, count, source-specific controls, clear/reset, fetch
// ---------------------------------------------------------------------------
export const ImportToolbar = ({
  title,
  subtitle,
  count,
  controls,
  fetched,
  loading,
  loadingText,
  fetchLabel = "Fetch matches",
  onFetch,
  onClear,
  onReset,
  resetting,
}: {
  title: string;
  subtitle?: ReactNode;
  count?: string | null;
  controls?: ReactNode;
  fetched: boolean;
  loading: boolean;
  loadingText?: string;
  fetchLabel?: string;
  onFetch: () => void;
  onClear?: () => void;
  onReset: () => void;
  resetting: boolean;
}) => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-2 min-w-0">
      <h3 className="font-display font-black uppercase text-[16px] tracking-[-0.01em] truncate">
        {title}
      </h3>
      {count && (
        <span className="h-6 px-2.5 rounded-full bg-white/[0.08] text-[11px] font-bold grid place-items-center whitespace-nowrap">
          {count}
        </span>
      )}
    </div>
    {subtitle && (
      <p className="text-[12px] text-muted-foreground leading-snug">
        {subtitle}
      </p>
    )}
    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
      {controls && <div className="w-full sm:w-auto flex">{controls}</div>}
      {onClear && (
        <IconButton
          title="Clear the fetched list"
          onClick={onClear}
          tone="danger"
        >
          <Trash2 className="w-4 h-4" />
        </IconButton>
      )}
      <IconButton
        title="Reset import history so matches can be imported again"
        onClick={onReset}
        disabled={resetting}
      >
        {resetting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
      </IconButton>
      <button
        onClick={onFetch}
        disabled={loading}
        className="flex-1 sm:flex-none justify-center whitespace-nowrap h-10 px-5 rounded-full bg-primary text-primary-foreground font-bold text-[13px] flex items-center gap-2 shadow-[0_8px_20px_-8px_hsl(var(--primary)/.7)] active:scale-[0.97] transition-transform disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : fetched ? (
          <RefreshCw className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {loading ? loadingText || "Fetching…" : fetchLabel}
      </button>
    </div>
  </div>
);

const IconButton = ({
  children,
  title,
  onClick,
  disabled,
  tone,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "danger";
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    disabled={disabled}
    className={`shrink-0 w-10 h-10 rounded-full grid place-items-center bg-white/[0.06] border border-white/10 text-foreground/70 transition-colors disabled:opacity-50 ${
      tone === "danger"
        ? "hover:text-red hover:border-red/40"
        : "hover:text-primary hover:border-primary/40"
    }`}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------
// Coupon builder bar
// ---------------------------------------------------------------------------
export const CouponBar = ({
  count,
  onOpen,
}: {
  count: number;
  onOpen?: () => void;
}) =>
  count > 0 ? (
    <div className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-2 bg-[hsl(214_80%_55%/.12)] border border-[hsl(214_80%_60%/.3)]">
      <span className="flex items-center gap-2 text-[13px] font-semibold">
        <Receipt className="w-4 h-4 text-[hsl(214_90%_70%)]" />
        Coupon: {count} {count === 1 ? "match" : "matches"}
      </span>
      {onOpen && (
        <button
          onClick={onOpen}
          className="h-8 px-3 rounded-full bg-white/10 text-[12px] font-bold flex items-center gap-1"
        >
          Open coupons <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  ) : null;

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export const ImportEmpty = ({ children }: { children: ReactNode }) => (
  <div className="text-center py-8 px-4 rounded-[16px] border border-dashed border-white/15 bg-white/[0.03]">
    <p className="text-[13px] text-muted-foreground">{children}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Chip used for sport filters and states
// ---------------------------------------------------------------------------
export const FilterChip = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`h-8 px-3 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${
      active
        ? "bg-foreground text-background"
        : "bg-white/[0.06] text-foreground/75 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

/** Small status tag on an import card. */
export type TagTone = "green" | "amber" | "red" | "blue" | "violet" | "muted";
const TAG: Record<TagTone, string> = {
  green: "bg-[hsl(145_60%_38%/.14)] text-[hsl(145_60%_26%)]",
  amber: "bg-[hsl(38_90%_50%/.18)] text-[hsl(30_80%_32%)]",
  red: "bg-[hsl(355_75%_50%/.14)] text-[hsl(355_70%_38%)]",
  blue: "bg-[hsl(214_80%_50%/.14)] text-[hsl(214_70%_36%)]",
  violet: "bg-[hsl(275_60%_50%/.14)] text-[hsl(275_50%_38%)]",
  muted: "bg-stock-ink/[0.07] text-stock-ink/60",
};
export const Tag = ({
  tone,
  children,
  title,
}: {
  tone: TagTone;
  children: ReactNode;
  title?: string;
}) => (
  <span
    title={title}
    className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold whitespace-nowrap ${TAG[tone]}`}
  >
    {children}
  </span>
);

// ---------------------------------------------------------------------------
// The match, as a card in the app's style
// ---------------------------------------------------------------------------
export type CardState =
  | "idle"
  | "new"
  | "selected"
  | "ready"
  | "imported"
  | "warn"
  | "bad";

const STATE: Record<CardState, { ring: string; stamp?: [string, string] }> = {
  idle: { ring: "" },
  new: {
    ring: "ring-2 ring-[hsl(42_95%_58%)]",
    stamp: ["New", "bg-[hsl(42_95%_58%)] text-stock-ink"],
  },
  selected: {
    ring: "ring-2 ring-primary",
    stamp: ["Selected", "bg-primary text-primary-foreground"],
  },
  ready: {
    ring: "ring-2 ring-[hsl(145_60%_45%)]",
    stamp: ["Ready", "bg-[hsl(145_60%_40%)] text-white"],
  },
  imported: {
    ring: "ring-2 ring-[hsl(145_60%_45%)] opacity-70",
    stamp: ["Imported", "bg-[hsl(145_60%_40%)] text-white"],
  },
  warn: {
    ring: "ring-2 ring-[hsl(32_95%_55%)]",
    stamp: ["Check", "bg-[hsl(32_95%_55%)] text-stock-ink"],
  },
  bad: { ring: "ring-2 ring-red", stamp: ["Wrong date", "bg-red text-white"] },
};

export const ImportMatchCard = ({
  sport,
  league,
  homeTeam,
  awayTeam,
  homeLogo,
  awayLogo,
  kickoff,
  kickoffText,
  prediction,
  predictionNote,
  odds,
  state = "idle",
  stampText,
  leading,
  tags,
  meta,
  analysis,
  analysisLabel = "analysis",
  actionsDisabled,
  onRoute,
}: {
  sport: string;
  league?: string;
  homeTeam: string;
  awayTeam?: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  /** ISO kickoff, shown like on the app's cards. */
  kickoff?: string;
  /** Overrides the kickoff line (e.g. a corrected time). */
  kickoffText?: ReactNode;
  prediction: ReactNode;
  predictionNote?: ReactNode;
  /** The odds, or an input when they're missing. */
  odds: ReactNode;
  state?: CardState;
  stampText?: string;
  /** e.g. a selection checkbox, shown on the art window. */
  leading?: ReactNode;
  tags?: ReactNode;
  meta?: ReactNode;
  /** Expandable text (one or more paragraphs). */
  analysis?: ReactNode;
  analysisLabel?: string;
  actionsDisabled?: boolean;
  onRoute: (target: ImportTarget) => void;
}) => {
  const [open, setOpen] = useState(false);
  const theme = sportTheme(sport);
  const ko = kickoffParts(kickoff);
  const st = STATE[state];
  const stamp = st.stamp && [stampText || st.stamp[0], st.stamp[1]];

  return (
    <article
      className={`rounded-[16px] p-[5px] bevel transition-shadow ${st.ring} ring-offset-2 ring-offset-background`}
      style={{
        backgroundColor: theme.frame,
        backgroundImage: `linear-gradient(145deg, hsl(${theme.hue} 60% 62% / .9), transparent 38%, transparent 62%, hsl(${theme.hue} 60% 18% / .85))`,
      }}
    >
      <div className="relative h-full rounded-[12px] paper bg-stock text-stock-ink overflow-hidden flex flex-col">
        <span
          className="pointer-events-none absolute inset-[3px] rounded-[9px] border border-stock-ink/10"
          aria-hidden
        />

        {/* Title bar: sport and league, odds as the headline stat */}
        <div className="relative flex items-center gap-1.5 pl-2.5 pr-2.5 h-10">
          <span
            className="grid place-items-center w-6 h-6 rounded-full text-white shrink-0"
            style={{ background: theme.frame }}
          >
            <SportGlyph sport={sport} size={13} />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-[0.08em] truncate">
              {sport}
            </span>
            {league && (
              <span className="block text-[11px] opacity-60 truncate">
                {league}
              </span>
            )}
          </span>
          <span className="shrink-0 flex flex-col items-end leading-none">
            <span className="text-[7px] font-black uppercase tracking-[0.14em] opacity-50 mb-0.5">
              Odds
            </span>
            {odds}
          </span>
        </div>

        {/* Art window with crests; selection and state on top */}
        <div className="relative mx-[7px]">
          <CardArt
            sport={sport}
            home={homeTeam}
            away={awayTeam || homeTeam}
            homeLogo={homeLogo}
            awayLogo={awayLogo}
            size={34}
            className="h-[84px] rounded-[8px]"
          />
          {leading && (
            <div className="absolute left-1.5 top-1.5 z-10 rounded-md bg-white/90 p-1 shadow">
              {leading}
            </div>
          )}
          {stamp && (
            <span
              className={`absolute right-1.5 top-1.5 z-10 h-5 px-2 rounded-full text-[10px] font-black uppercase tracking-[0.08em] grid place-items-center shadow ${stamp[1]}`}
            >
              {stamp[0]}
            </span>
          )}
        </div>

        {/* Name ribbon */}
        <div
          className="relative -mt-2 mx-[3px] px-3 py-1.5 text-center bg-[linear-gradient(180deg,hsl(232_32%_20%),hsl(232_38%_12%))] shadow-[0_3px_6px_rgba(0,0,0,.25)]"
          style={{
            clipPath:
              "polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%, 6px 50%)",
          }}
        >
          <p
            className="font-display font-extrabold uppercase text-[12.5px] leading-[1.2] truncate text-white"
            title={homeTeam}
          >
            {homeTeam}
          </p>
          {awayTeam && (
            <p
              className="font-display font-extrabold uppercase text-[12.5px] leading-[1.2] truncate text-white/60"
              title={awayTeam}
            >
              {awayTeam}
            </p>
          )}
        </div>

        <div className="px-2.5 pt-2 flex flex-col gap-2 flex-1">
          {tags && <div className="flex flex-wrap gap-1">{tags}</div>}

          {/* Pick box, as on the cards */}
          <div
            className="relative rounded-[8px] pl-3 pr-2 py-1.5 overflow-hidden"
            style={{ background: `hsl(${theme.hue} 50% 40% / .10)` }}
          >
            <span
              className="absolute left-0 inset-y-0 w-[3px]"
              style={{ background: theme.frame }}
              aria-hidden
            />
            <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.14em] opacity-55">
              <Crosshair className="w-2.5 h-2.5" /> Pick
            </p>
            <p className="text-[14px] font-semibold leading-snug">
              {prediction}
            </p>
            {predictionNote && (
              <p className="text-[11px] opacity-55 truncate">
                {predictionNote}
              </p>
            )}
          </div>

          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px]">
            <span className="flex items-center gap-1 font-semibold tabular-nums whitespace-nowrap">
              <Clock3 className="w-3 h-3 opacity-50" />
              {kickoffText ?? (
                <>
                  {ko.time}{" "}
                  <span className="font-medium opacity-55">{ko.day}</span>
                </>
              )}
            </span>
            {meta}
          </div>

          {analysis && (
            <div>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.1em] opacity-60 hover:opacity-100"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
                {open ? "Hide" : "Show"} {analysisLabel}
              </button>
              {open && (
                <div className="mt-1.5 space-y-2 text-[12px] leading-relaxed">
                  {analysis}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Routing bar, in place of the card's Inspect bar */}
        <div className="mt-2.5 grid grid-cols-3 border-t border-stock-ink/[0.08] bg-stock-ink/[0.035] divide-x divide-stock-ink/[0.08]">
          {(
            [
              ["tip", "Tip", TrendingUp],
              ["hero", "Hero", Zap],
              ["coupon", "Coupon", Receipt],
            ] as const
          ).map(([target, label, Icon]) => (
            <button
              key={target}
              type="button"
              disabled={actionsDisabled}
              onClick={() => onRoute(target)}
              className="h-10 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-stock-ink/[0.06] disabled:opacity-35 disabled:hover:bg-transparent"
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
};

/** Big odds number for the card's title bar. */
export const OddsValue = ({ value }: { value: number }) => (
  <span className="num font-black text-[19px] leading-none">
    {value.toFixed(2)}
  </span>
);

/** Grid the cards sit in: one column on phones, two from tablet up. */
export const ImportGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start [&>*]:min-w-0">
    {children}
  </div>
);
