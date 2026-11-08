import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/drawer";
import { X, Lock, Timer } from "@/components/icons/gsb";
import { decodeEntities } from "@/lib/text";

export interface AnalysisData {
  homeTeam: string;
  awayTeam: string;
  league?: string | null;
  kickoff?: string | null;
  prediction?: string | null;
  odds?: number | string | null;
  description?: string | null;
  status?: string | null;
}

interface AnalysisSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnalysisData | null;
  /** True for a premium pick the viewer cannot unlock. */
  locked?: boolean;
}

const formatKickoff = (value: string | null | undefined, locale: string) => {
  if (!value) return null;
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const AnalysisSheet = ({ open, onOpenChange, data, locked = false }: AnalysisSheetProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en-GB";
  const paragraphs = useMemo(() => {
    const text = decodeEntities(data?.description).trim();
    if (!text) return [];
    return text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [data?.description]);

  const summary = useMemo(() => {
    const text = paragraphs[0] || "";
    if (!text) return "";
    const m = text.match(/^.+?[.!?](\s|$)/);
    return m ? m[0].trim() : text;
  }, [paragraphs]);

  const kickoff = formatKickoff(data?.kickoff, locale);
  const odds = data?.odds != null && data?.odds !== "" ? Number(data.odds) : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#17141f] border-t border-white/10 text-white">
        <div className="mx-auto w-full max-w-2xl flex flex-col max-h-[90dvh]">
          {/* Sticky header */}
          <div className="sticky top-0 z-10 bg-[#17141f]/95 backdrop-blur px-4 pt-3 pb-3 border-b border-white/[0.07]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {data?.league && (
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold truncate">
                    {decodeEntities(data.league)}
                  </p>
                )}
                <h2 className="font-display font-bold text-base leading-snug mt-0.5 break-words">
                  {decodeEntities(data?.homeTeam)} <span className="text-white/40 font-normal">vs</span>{" "}
                  {decodeEntities(data?.awayTeam)}
                </h2>
              </div>
              <DrawerClose asChild>
                <button
                  aria-label={t("analysis.close")}
                  className="shrink-0 w-11 h-11 -mr-1 rounded-full flex items-center justify-center text-white/60 hover:text-white active:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </DrawerClose>
            </div>
            {kickoff && (
              <div className="flex items-center gap-1.5 text-[11px] text-white/50 mt-1.5">
                <Timer className="w-3 h-3" />
                <span>{t("analysis.kickoff", { date: kickoff })}</span>
                {data?.status && data.status !== "upcoming" && (
                  <span className="ml-2 uppercase tracking-wide text-white/60">
                    · {t(`status.${data.status === "draw" ? "void" : data.status}`, { defaultValue: data.status })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-4">
            {(data?.prediction || odds) && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-2.5">
                <p className="font-display font-bold text-sm min-w-0 break-words">
                  {decodeEntities(data?.prediction) || t("analysis.title")}
                </p>
                {odds != null && !isNaN(odds) && (
                  <span className="shrink-0 font-display font-black text-cyan-400 tabular-nums">
                    {odds.toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {locked ? (
              <div className="rounded-2xl border border-pink-500/25 bg-pink-500/[0.06] p-4 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-pink-500/10 border border-pink-500/25 flex items-center justify-center mx-auto">
                  <Lock className="w-4 h-4 text-pink-400" />
                </div>
                <p className="text-sm text-white/75">{t("analysis.premiumLocked")}</p>
                <Link to="/premium" onClick={() => onOpenChange(false)}>
                  <button className="w-full h-11 rounded-xl bg-pink-500 text-white font-display font-bold text-sm active:scale-[0.98] transition-transform">
                    {t("analysis.seePremium")}
                  </button>
                </Link>
              </div>
            ) : paragraphs.length === 0 ? (
              <p className="text-sm text-white/55 leading-relaxed">{t("analysis.empty")}</p>
            ) : (
              <>
                {summary && paragraphs.length > 1 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-semibold">
                      {t("analysis.summary")}
                    </p>
                    <p className="text-[15px] leading-relaxed text-white/85">{summary}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/40 font-semibold">
                    {t("analysis.title")}
                  </p>
                  <div className="space-y-3">
                    {paragraphs.map((p, i) => (
                      <p key={i} className="text-[14px] leading-[1.7] text-white/70">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AnalysisSheet;
