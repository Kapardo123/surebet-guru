import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCw, Share2, X, Loader2 } from "lucide-react";
import { shareCard } from "@/lib/shareCard";
import { track } from "@/lib/analytics";
import TipCard, { Tip } from "@/components/TipCard";
import HoloCard from "@/components/HoloCard";
import GoldBurst from "@/components/GoldBurst";
import { play } from "@/lib/sfx";

const BASE_WIDTH = 190;

/**
 * Full-screen inspector. The tapped card flies out of the grid (shared
 * layoutId), grows to fill the screen, tilts under the finger and flips to
 * show the analysis on its back.
 */
const CardInspector = ({ tip, userIsPremium, onClose, celebrate = false }: { tip: Tip | null; userIsPremium: boolean; onClose: () => void; celebrate?: boolean }) => {
  const [flipped, setFlipped] = useState(false);
  const [zoom, setZoom] = useState(1.7);

  useEffect(() => {
    setFlipped(false);
    if (!tip) return;
    play(celebrate ? "chime" : "whoosh");
    const fit = () => setZoom(Math.max(1.2, Math.min(1.9, (window.innerWidth - 56) / BASE_WIDTH, (window.innerHeight - 210) / 320)));
    fit();
    window.addEventListener("resize", fit);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip, onClose]);

  const canFlip = !!tip?.description;
  const [sharing, setSharing] = useState(false);
  const share = async () => {
    if (!tip || sharing) return;
    setSharing(true);
    try {
      track("card_shared", { tip: tip.id });
      await shareCard(tip, userIsPremium || !tip.isPremium || tip.status !== "upcoming");
    } finally {
      setSharing(false);
    }
  };

  return (
    <AnimatePresence>
      {tip && (
        <motion.div
          key="inspector"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6"
          initial={{ opacity: 1 }}
          exit={{ opacity: 1 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${tip.homeTeam} v ${tip.awayTeam}`}
        >
          <motion.button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-[hsl(232_45%_5%/.82)] backdrop-blur-md cursor-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          {/* Spotlight behind the card */}
          <motion.div
            className="pointer-events-none absolute w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,hsl(45_100%_62%/.18),transparent_60%)]"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div layoutId={`card-${tip.id}`} className="relative" transition={{ type: "spring", stiffness: 220, damping: 26 }}>
            {celebrate && <GoldBurst radius={170} delay={0.45} />}
            {celebrate && (
              <motion.p
                className="absolute -top-12 inset-x-0 text-center text-[12px] font-black uppercase tracking-[0.2em] foil-gold-text"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
              >
                ◆ Card unlocked ◆
              </motion.p>
            )}
            <HoloCard holo={false} maxTilt={12}>
              <div style={{ width: BASE_WIDTH, zoom }} onClick={() => {
                  if (!canFlip) return;
                  play("flip");
                  setFlipped((f) => !f);
                }}>
                <TipCard tip={tip} userIsPremium={userIsPremium} still flipped={flipped} />
              </div>
            </HoloCard>
          </motion.div>

          <motion.div
            className="relative mt-6 flex items-center gap-2.5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            exit={{ opacity: 0, y: 16 }}
          >
            {canFlip && (
              <button
                onClick={() => {
                  play("flip");
                  setFlipped((f) => !f);
                }}
                className="h-12 px-6 rounded-full bg-primary text-primary-foreground font-bold text-[15px] flex items-center gap-2 shadow-[0_8px_24px_-6px_hsl(var(--primary)/.6)] active:scale-[0.97] transition-transform"
              >
                <RotateCw className="w-4 h-4" />
                {flipped ? "Front" : "Flip for analysis"}
              </button>
            )}
            <button
              onClick={share}
              aria-label="Share card"
              className="h-12 w-12 rounded-full bg-white/10 border border-white/15 grid place-items-center active:scale-[0.95] transition-transform"
            >
              {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-12 w-12 rounded-full bg-white/10 border border-white/15 grid place-items-center active:scale-[0.95] transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CardInspector;
