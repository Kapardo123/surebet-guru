import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Coupon } from "@/lib/couponStorage";
import { Ticket, Gem, Lock, ChevronDown, ChevronUp, Check, X, Minus, Timer } from "@/components/icons/gsb";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { toggleCouponWatch, unwatchCoupon, useWatched } from "@/lib/watchStorage";
import { decodeEntities } from "@/lib/text";

const statusMeta = (status: Coupon["status"]) => {
  if (status === "won") return { labelKey: "status.won", cls: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10", Icon: Check };
  if (status === "lost") return { labelKey: "status.lost", cls: "text-red-300 border-red-500/40 bg-red-500/10", Icon: X };
  if (status === "pending") return { labelKey: "status.pending", cls: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10", Icon: Minus };
  if (status === "void") return { labelKey: "status.void", cls: "text-amber-300 border-amber-500/40 bg-amber-500/10", Icon: Minus };
  return { labelKey: "status.active", cls: "text-white/70 border-white/15 bg-white/[0.04]", Icon: Minus };
};

const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short" });
};

const formatKickoff = (value: string | undefined, locale: string) => {
  if (!value) return "";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
};

const CouponCard = ({ coupon, userIsPremium = false }: { coupon: Coupon; userIsPremium?: boolean }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage || i18n.language || "en-GB";
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { isCouponWatched } = useWatched();

  const isSettled = coupon.status === "won" || coupon.status === "lost" || coupon.status === "void";
  const locked = Boolean(coupon.isPremium) && !userIsPremium && !isSettled;
  const status = statusMeta(coupon.status);
  const watched = isCouponWatched(coupon.id);
  const legs = coupon.matches?.length || 0;

  const handleWatch = () => {
    const nowWatched = toggleCouponWatch(coupon);
    toast({
      title: nowWatched ? t("coupon.savedToWatched") : t("coupon.removedFromWatched"),
      action: nowWatched ? (
        <ToastAction altText={t("coupon.undo")} onClick={() => unwatchCoupon(coupon.id)}>
          {t("coupon.undo")}
        </ToastAction>
      ) : undefined,
    });
  };

  return (
    <article className="surface-card overflow-hidden gsb-anim">
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
              <Ticket size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-[14px] leading-snug text-white line-clamp-2 break-words">
                {decodeEntities(coupon.name)}
              </h3>
              <p className="text-[10px] text-white/50 mt-0.5">
                {t("coupon.legs", { count: legs })}
                {coupon.createdAt ? ` · ${t("coupon.published", { date: formatDate(coupon.createdAt, locale) })}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {coupon.isPremium && (
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-pink-500/15 text-pink-300 border border-pink-500/25">
                <Gem className="w-2.5 h-2.5" />
                {t("coupon.pro")}
              </span>
            )}
            <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase border ${status.cls}`}>
              <status.Icon className="w-2.5 h-2.5" />
              {t(status.labelKey)}
            </span>
          </div>
        </div>

        {/* Total odds always visible before expanding */}
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.07] px-2.5 py-2">
          <span className="text-[10px] uppercase tracking-[0.14em] text-white/45 font-semibold">{t("coupon.totalOdds")}</span>
          <span className="font-display font-black text-[18px] text-cyan-400 tabular-nums leading-none">
            {Number(coupon.totalOdds || 0).toFixed(2)}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-2 w-full min-h-[44px] rounded-lg border border-white/[0.1] bg-white/[0.03] text-[12px] font-semibold text-white/75 inline-flex items-center justify-center gap-1.5 active:bg-white/[0.07] transition-colors"
        >
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {open ? t("coupon.hideMatches") : t("coupon.showMatches", { count: legs })}
        </button>

        {open && (
          <div className="mt-2 space-y-1.5">
            {locked ? (
              <Link
                to="/premium"
                className="flex items-center justify-between gap-2 rounded-lg border border-pink-500/25 bg-pink-500/[0.06] px-2.5 py-3"
              >
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-pink-300">
                  <Lock className="w-3.5 h-3.5" />
                  {t("coupon.seeAllPicks", { count: legs })}
                </span>
              </Link>
            ) : (
              coupon.matches.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-lg bg-white/[0.03] border border-white/[0.06] px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white leading-snug line-clamp-2 break-words">
                      {decodeEntities(m.homeTeam)} <span className="text-white/40 font-normal">{t("coupon.vs")}</span>{" "}
                      {decodeEntities(m.awayTeam)}
                    </p>
                    <p className="text-[10px] text-white/45 truncate mt-0.5">
                      {decodeEntities(m.league)}
                      {m.kickoff ? ` · ${formatKickoff(m.kickoff, locale)}` : ""}
                      {m.legStatus ? ` · ${m.legStatus}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 max-w-[45%]">
                    <p className="text-[11px] font-semibold text-white/80 line-clamp-2 break-words">
                      {decodeEntities(m.prediction)}
                    </p>
                    <p className="text-[12px] font-bold text-cyan-400 tabular-nums mt-0.5">
                      {Number(m.odds).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-white/45 min-w-0">
            <Timer className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {coupon.matches?.[0]?.kickoff
                ? t("coupon.firstKickoff", { date: formatKickoff(coupon.matches[0].kickoff, locale) })
                : ""}
            </span>
          </div>
          <button
            onClick={handleWatch}
            aria-label={watched ? t("coupon.removeFromWatched") : t("coupon.saveToWatched")}
            aria-pressed={watched}
            className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
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
  );
};

export default memo(CouponCard);
