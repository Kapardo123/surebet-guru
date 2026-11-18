import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Loader2, Lock, X } from "lucide-react";
import { Tip } from "@/components/TipCard";
import { kickoffParts } from "@/lib/format";
import { buySingleTip, buyWeekendPack, nativeSingleTipPrice } from "@/lib/tipUnlocks";
import { PLANS, SINGLE_TIP_CENTS, WEEKEND_PACK_CENTS, usd } from "@/lib/pricing";
import { isWeekendTip, redeemCredit } from "@/lib/engagement";
import { track } from "@/lib/analytics";

/**
 * Bottom sheet shown when a locked Gold card is tapped: buy just this card
 * for $0.99, or get the Gold pass for every card.
 */
const UnlockSheet = ({
  tip,
  signedIn,
  credits = 0,
  onClose,
  onUnlocked,
}: {
  tip: Tip | null;
  signedIn: boolean;
  credits?: number;
  onClose: () => void;
  onUnlocked: (tip: Tip) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storePrice, setStorePrice] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setBusy(false);
    if (tip) nativeSingleTipPrice().then(setStorePrice);
  }, [tip]);

  const price = storePrice ?? usd(SINGLE_TIP_CENTS);
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

  useEffect(() => {
    if (!tip) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [tip, onClose]);
  const ko = tip ? kickoffParts(tip.kickoff) : null;

  const weekend = tip ? isWeekendTip(tip) : false;

  const useCredit = async () => {
    if (!tip) return;
    setBusy(true);
    setError(null);
    try {
      await redeemCredit(tip.id);
      track("free_card_used", { tip: tip.id });
      onUnlocked(tip);
    } catch (e: any) {
      setError(e?.message || "Couldn't use the free card");
    } finally {
      setBusy(false);
    }
  };

  const buyWeekend = async () => {
    if (!tip) return;
    setBusy(true);
    setError(null);
    track("weekend_pack_started", { from: "sheet" });
    const res = await buyWeekendPack();
    if (res.status === "unlocked") onUnlocked(tip);
    else if (res.status === "error") setError(res.message);
    if (res.status !== "redirect") setBusy(false);
  };

  const buy = async () => {
    if (!tip) return;
    setBusy(true);
    setError(null);
    track("unlock_started", { tip: tip.id, kind: "single" });
    const res = await buySingleTip(tip.id);
    if (res.status === "unlocked") onUnlocked(tip);
    else if (res.status === "error") setError(res.message);
    if (res.status !== "redirect") setBusy(false);
  };

  return (
    <AnimatePresence>
      {tip && (
        <motion.div key="sheet" className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label="Unlock this card">
          <motion.button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[hsl(232_45%_5%/.75)] backdrop-blur-sm cursor-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative w-full max-w-md rounded-t-[28px] md:rounded-[28px] bg-card border-t border-x md:border border-white/10 px-5 pt-3 md:pt-6 pb-[max(20px,env(safe-area-inset-bottom))] md:pb-6 shadow-[0_-20px_50px_-10px_rgba(0,0,0,.7)] md:shadow-[0_40px_90px_-20px_rgba(0,0,0,.9)]"
            // Bottom sheet on phones, centred dialog on wide screens.
            initial={wide ? { y: 24, opacity: 0, scale: 0.96 } : { y: "100%" }}
            animate={wide ? { y: 0, opacity: 1, scale: 1 } : { y: 0 }}
            exit={wide ? { y: 24, opacity: 0, scale: 0.96 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            drag={wide ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => i.offset.y > 120 && onClose()}
          >
            <div className="absolute inset-x-0 top-0 h-px foil-gold opacity-70" />
            <div className="mx-auto w-10 h-1.5 rounded-full bg-white/20 md:hidden" />
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/[0.07] grid place-items-center">
              <X className="w-4 h-4" />
            </button>

            {/* The face-down card, waiting */}
            <div className="mt-5 flex items-center gap-4">
              <motion.div
                className="shrink-0 w-[84px] h-[118px] rounded-[12px] p-[4px] foil-gold shadow-[0_12px_24px_-8px_rgba(0,0,0,.8)] foil-shimmer"
                animate={{ rotate: [-4, 3, -4], y: [0, -3, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="h-full rounded-[8px] card-back grid place-items-center">
                  <Lock className="w-6 h-6 text-[hsl(var(--gold))]" />
                </div>
              </motion.div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] foil-gold-text">◆ Gold card</p>
                <p className="font-display font-black uppercase text-[17px] leading-[1.1] tracking-[-0.01em] mt-1.5">
                  {tip.homeTeam}
                  <span className="text-muted-foreground"> v </span>
                  {tip.awayTeam}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1.5">
                  {tip.league} · {ko?.time} {ko?.day}
                </p>
              </div>
            </div>

            <ul className="mt-5 grid grid-cols-3 gap-2 text-center">
              {["The pick", "The odds", "Analysis"].map((x) => (
                <li key={x} className="rounded-[12px] bg-white/[0.05] border border-white/[0.06] py-2.5 text-[12.5px] font-semibold">
                  <span className="block mx-auto w-10 h-2.5 rounded bg-white/20 mb-2" />
                  {x}
                </li>
              ))}
            </ul>

            {signedIn && credits > 0 && (
              <button
                onClick={useCredit}
                disabled={busy}
                className="mt-5 w-full h-[60px] rounded-full foil-gold foil-shimmer text-stock-ink pl-6 pr-2 flex items-center justify-between gap-3 shadow-[0_10px_28px_-8px_hsl(var(--gold)/.7)] active:scale-[0.99] transition-transform disabled:opacity-70"
              >
                <span className="text-[16px] font-bold flex items-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Use a free card
                </span>
                <span className="h-11 px-4 rounded-full bg-stock-ink text-[hsl(var(--gold))] grid place-items-center text-[13px] font-bold">
                  {credits} left
                </span>
              </button>
            )}
            {signedIn ? (
              <button
                onClick={buy}
                disabled={busy}
                className={`${credits > 0 ? "mt-3" : "mt-5"} w-full h-[60px] rounded-full bg-primary text-primary-foreground pl-6 pr-2 flex items-center justify-between gap-3 shadow-[0_10px_28px_-8px_hsl(var(--primary)/.7)] active:scale-[0.99] transition-transform disabled:opacity-70`}
              >
                <span className="text-[16px] font-bold flex items-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Unlock this card
                </span>
                <span className="h-11 px-4 rounded-full bg-primary-foreground text-primary grid place-items-center num font-black text-[17px]">
                  {price}
                </span>
              </button>
            ) : (
              <Link
                to="/auth?redirect=/"
                className="mt-5 w-full h-[60px] rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[16px] font-bold shadow-[0_10px_28px_-8px_hsl(var(--primary)/.7)]"
              >
                Sign in to unlock for {price}
              </Link>
            )}
            <p className="text-center text-[12.5px] text-muted-foreground mt-2">One-off payment. The card stays yours.</p>
            {error && <p className="text-center text-[13px] text-red mt-2">{error}</p>}

            <div className="my-4 flex items-center gap-3 text-[12px] font-semibold text-muted-foreground">
              <span className="h-px flex-1 bg-white/10" /> or every card <span className="h-px flex-1 bg-white/10" />
            </div>

            {weekend && signedIn && (
              <button
                onClick={buyWeekend}
                disabled={busy}
                className="mb-2.5 w-full h-14 rounded-full border border-white/15 bg-white/[0.05] px-5 flex items-center justify-between disabled:opacity-60"
              >
                <span className="text-left">
                  <span className="block text-[15px] font-bold">Weekend pack</span>
                  <span className="block text-[11.5px] text-muted-foreground -mt-0.5">Every Gold card, Friday to Sunday</span>
                </span>
                <span className="num font-black text-[16px]">{usd(WEEKEND_PACK_CENTS)}</span>
              </button>
            )}
            <Link
              to="/premium"
              className="w-full h-14 rounded-full border border-[hsl(var(--gold)/.5)] bg-[hsl(var(--gold)/.08)] px-5 flex items-center justify-between"
            >
              <span className="text-[15px] font-bold foil-gold-text">Go Gold</span>
              <span className="text-[13px] font-semibold text-foreground/80">from {usd(PLANS[0].cents)} / week</span>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UnlockSheet;
