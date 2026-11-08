import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bookmark, BookmarkCheck } from "lucide-react";
import TeamLogo, { SportIcon } from "@/components/TeamLogo";
import AnalysisSheet from "@/components/AnalysisSheet";
import { Gem, Lock, Check, X, Minus } from "@/components/icons/gsb";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { toggleTipWatch, unwatchTip, useWatched } from "@/lib/watchStorage";
import { decodeEntities } from "@/lib/text";

export interface Tip {
  id: number;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  kickoff: string;
  status: "upcoming" | "won" | "lost" | "draw" | "void";
  isPremium?: boolean;
  isPublished?: boolean;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  description?: string | null;
  likesCount?: number;
  wonAt?: string | null;
  // "Yesterday's Results": oficjalny wynik meczu (np. "2:1") ustawiany przy rozstrzygnięciu
  finalScore?: string | null;
  // Poczekalnia: tip dodany przez admina, publikowany automatycznie o 3:00
  queued?: boolean;
}

const statusMeta = (status: Tip["status"]) => {
  if (status === "won") return { labelKey: "status.won", cls: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10", Icon: Check };
  if (status === "lost") return { labelKey: "status.lost", cls: "text-red-300 border-red-500/40 bg-red-500/10", Icon: X };
  if (status === "draw" || status === "void") return { labelKey: "status.void", cls: "text-amber-300 border-amber-500/40 bg-amber-500/10", Icon: Minus };
  return null;
};

const formatKickoff = (value: string, locale: string) => {
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(value || "");
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return d.toLocaleString(locale, {
    ...(sameDay ? {} : { day: "2-digit", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const TipCard = ({ tip, userIsPremium = false }: { tip: Tip; userIsPremium?: boolean }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en-GB";
  const locked = !!tip.isPremium && !userIsPremium && tip.status === "upcoming";
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();
  const { isTipWatched } = useWatched();

  const home = decodeEntities(tip.homeTeam);
  const away = decodeEntities(tip.awayTeam);
  const odds = Number(tip.odds);
  const status = statusMeta(tip.status);
  const watched = isTipWatched(tip.id);

  const handleWatch = () => {
    const nowWatched = toggleTipWatch(tip);
    toast({
      title: nowWatched ? t("tip.savedToWatched") : t("tip.removedFromWatched"),
      action: nowWatched ? (
        <ToastAction altText={t("tip.undo")} onClick={() => unwatchTip(tip.id)}>
          {t("tip.undo")}
        </ToastAction>
      ) : undefined,
    });
  };

  const teamRow = (name: string, logo?: string | null) => (
    <div className="flex items-center gap-2 min-w-0">
      <TeamLogo teamName={name} logoUrl={logo} size={18} sport={tip.sport} />
      <span className="font-display font-semibold text-[13px] text-white leading-tight line-clamp-2 break-words min-w-0">
        {name}
      </span>
    </div>
  );

  return (
    <>
      <article className="surface-card overflow-hidden gsb-anim">
        <div className="p-3">
          {/* Meta row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 text-[10px] text-white/55">
              <SportIcon sport={tip.sport} size={12} />
              <span className="truncate">
                {tip.sport}
                {tip.league ? ` · ${decodeEntities(tip.league)}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {tip.isPremium && (
                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-pink-500/15 text-pink-300 border border-pink-500/25">
                  <Gem className="w-2.5 h-2.5" />
                  {t("tip.pro")}
                </span>
              )}
              {status && (
                <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${status.cls}`}>
                  <status.Icon className="w-2.5 h-2.5" />
                  {t(status.labelKey)}
                </span>
              )}
              <span className="text-[10px] text-white/50 tabular-nums">{formatKickoff(tip.kickoff, locale)}</span>
            </div>
          </div>

          {/* Teams */}
          <div className="mt-2 space-y-1">
            {teamRow(home, tip.homeTeamLogo)}
            {teamRow(away, tip.awayTeamLogo)}
          </div>

          {/* Pick + odds / locked CTA */}
          {locked ? (
            <Link
              to="/premium"
              className="mt-2.5 flex items-center justify-between gap-3 rounded-lg border border-pink-500/25 bg-pink-500/[0.06] px-2.5 py-2.5 min-h-[44px] active:bg-pink-500/[0.1] transition-colors"
            >
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pink-300">
                <Lock className="w-3.5 h-3.5" />
                {t("tip.seeInPremium")}
              </span>
              {!isNaN(odds) && odds > 0 && (
                <span className="text-sm font-black text-cyan-400/80 tabular-nums">{odds.toFixed(2)}</span>
              )}
            </Link>
          ) : (
            <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] border border-white/[0.07] px-2.5 py-2">
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.14em] text-white/40 font-semibold">{t("tip.pick")}</p>
                <p className="font-display font-bold text-[13px] text-white leading-snug break-words line-clamp-2">
                  {decodeEntities(tip.prediction)}
                </p>
              </div>
              {!isNaN(odds) && odds > 0 && (
                <span className="shrink-0 font-display font-black text-[17px] text-cyan-400 tabular-nums leading-none">
                  {odds.toFixed(2)}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setSheetOpen(true)}
              disabled={locked}
              className={`flex-1 min-h-[44px] rounded-lg border text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                locked
                  ? "opacity-40 cursor-not-allowed border-white/10 text-white/40"
                  : "border-white/[0.1] bg-white/[0.03] text-white/75 active:bg-white/[0.07]"
              }`}
            >
              {t("tip.analysis")}
            </button>
            <button
              onClick={handleWatch}
              aria-label={watched ? t("tip.removeFromWatched") : t("tip.saveToWatched")}
              aria-pressed={watched}
              className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-colors ${
                watched
                  ? "border-pink-500/40 bg-pink-500/10 text-pink-400"
                  : "border-white/[0.1] bg-white/[0.03] text-white/60 active:bg-white/[0.07]"
              }`}
            >
              {watched ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </article>

      <AnalysisSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        locked={locked}
        data={{
          homeTeam: home,
          awayTeam: away,
          league: decodeEntities(tip.league),
          kickoff: tip.kickoff,
          prediction: decodeEntities(tip.prediction),
          odds: tip.odds,
          description: tip.description,
          status: tip.status,
        }}
      />
    </>
  );
};

export default memo(TipCard);
