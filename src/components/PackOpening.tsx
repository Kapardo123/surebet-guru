import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PackArt, { PACK_SIZE, PackStage } from "@/components/PackArt";
import CardArt from "@/components/CardArt";
import GoldBurst from "@/components/GoldBurst";
import SportGlyph from "@/components/SportGlyph";
import { Tip } from "@/components/TipCard";
import { sportTheme } from "@/lib/sport";
import { play } from "@/lib/sfx";

const CARD_W = 92;
const CARD_H = 128;
const MAX_SHOWN = 6;

// Timeline (ms). Each step moves the scene to the next phase.
const T = { shake: 450, leak: 1150, torn: 1720, rise: 1950, fan: 2600, reveal: 3250, flipGap: 420 };

type Phase = "lift" | "shake" | "leak" | "torn" | "rise" | "fan" | "reveal" | "done" | "away";

const buzz = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
};

const CardBack = () => (
  <div className="w-full h-full rounded-[10px] p-[3px] foil-gold shadow-[0_10px_24px_-8px_rgba(0,0,0,.8)]">
    <div className="h-full rounded-[7px] card-back grid place-items-center">
      <span className="font-display font-black text-[13px] foil-gold-text">GSB</span>
    </div>
  </div>
);

const CardFront = ({ tip }: { tip: Tip }) => {
  const t = sportTheme(tip.sport);
  const gold = !!tip.isPremium;
  return (
    <div
      className={`w-full h-full rounded-[10px] p-[3px] shadow-[0_10px_24px_-8px_rgba(0,0,0,.8)] ${gold ? "foil-gold" : ""}`}
      style={gold ? undefined : { background: t.frame }}
    >
      <div className={`h-full rounded-[7px] text-stock-ink overflow-hidden flex flex-col ${gold ? "bg-[linear-gradient(170deg,hsl(44_70%_92%),hsl(40_45%_86%))]" : "paper bg-stock"}`}>
        <CardArt sport={tip.sport} home={tip.homeTeam} away={tip.awayTeam} homeLogo={tip.homeTeamLogo} awayLogo={tip.awayTeamLogo} size={15} holo={gold} className="h-[58px] m-[3px] rounded-[5px]" />
        <div className="px-1.5 min-w-0">
          <p className="font-display font-extrabold uppercase text-[8.5px] leading-[1.15] truncate">{tip.homeTeam}</p>
          <p className="font-display font-extrabold uppercase text-[8.5px] leading-[1.15] truncate opacity-55">{tip.awayTeam}</p>
        </div>
        <div className="mt-auto flex items-center justify-between px-1.5 pb-1.5">
          <span className="grid place-items-center w-4 h-4 rounded-full text-white" style={{ background: gold ? "linear-gradient(135deg,#b98a2a,#f6dc8a)" : t.frame }}>
            <SportGlyph sport={tip.sport} size={10} />
          </span>
          <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${gold ? "text-[#a8781f]" : "opacity-50"}`}>{gold ? "◆ Gold" : "● Common"}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Full-screen pack opening: the pack comes forward, trembles, light leaks
 * through the seam, the strip rips off in a shower of foil, rays burst out,
 * the cards rise, fan out and flip one by one (Gold last, with a flash).
 */
const PackOpening = ({
  tips,
  date,
  onDone,
}: {
  tips: Tip[];
  date: string;
  onDone: () => void;
}) => {
  const [phase, setPhase] = useState<Phase>("lift");
  const [flipped, setFlipped] = useState(0);
  const timers = useRef<number[]>([]);

  // Commons first, Gold last: save the best for the end.
  const order = useMemo(() => [...tips].sort((a, b) => Number(!!a.isPremium) - Number(!!b.isPremium)), [tips]);
  const shown = order.slice(-MAX_SHOWN);
  const extra = order.length - shown.length;
  const goldCount = tips.filter((t) => t.isPremium).length;
  const n = shown.length;

  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    play("rustle");
    at(T.shake, () => {
      setPhase("shake");
      play("rustle");
    });
    at(T.leak, () => {
      setPhase("leak");
      buzz(12);
    });
    at(T.torn, () => {
      setPhase("torn");
      buzz([30, 40, 20]);
      play("rip");
    });
    at(T.rise, () => {
      setPhase("rise");
      play("whoosh");
    });
    at(T.fan, () => {
      setPhase("fan");
      play("whoosh");
    });
    at(T.reveal, () => setPhase("reveal"));
    shown.forEach((tip, i) =>
      at(T.reveal + i * T.flipGap, () => {
        setFlipped(i + 1);
        buzz(tip.isPremium ? [20, 30, 40] : 8);
        play(tip.isPremium ? "chime" : "flip");
      }),
    );
    at(T.reveal + n * T.flipGap + 500, () => setPhase("done"));
    const list = timers.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      list.forEach(clearTimeout);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    play("whoosh");
    setPhase("away");
    window.setTimeout(onDone, 480);
  };

  const after = (p: Phase) => {
    const seq: Phase[] = ["lift", "shake", "leak", "torn", "rise", "fan", "reveal", "done", "away"];
    return seq.indexOf(phase) >= seq.indexOf(p);
  };

  const packStage: PackStage = after("torn") ? "torn" : phase === "leak" ? "leak" : "sealed";

  // Pack choreography.
  const packAnim =
    phase === "lift"
      ? { scale: 1.12, y: 0, opacity: 1, rotate: 0 }
      : phase === "shake"
      ? { scale: [1.12, 1.15, 1.13, 1.16, 1.12], rotate: [0, -2, 2, -3, 3, -4, 4, -2, 0], y: 0, opacity: 1 }
      : phase === "leak"
      ? { rotate: [0, -1, 1, -1, 0], scale: 1.14, y: 0, opacity: 1 }
      : phase === "torn" || phase === "rise"
      ? { y: [0, -10, 0], scale: 1.12, rotate: 0, opacity: 1 }
      : { y: 560, rotate: 10, scale: 1, opacity: 0 };
  const packTrans =
    phase === "lift"
      ? { type: "spring", stiffness: 160, damping: 16 }
      : phase === "shake"
      ? { duration: 0.65, ease: "easeInOut" }
      : phase === "leak"
      ? { duration: 0.25, repeat: Infinity }
      : phase === "torn" || phase === "rise"
      ? { duration: 0.3 }
      : { duration: 0.5, ease: [0.5, 0, 0.75, 0] };

  // Where each card sits in the final fan.
  const fanPos = (i: number) => {
    const mid = (n - 1) / 2;
    const spacing = Math.min(64, 300 / Math.max(n, 1));
    return { x: (i - mid) * spacing, y: Math.abs(i - mid) * 10, rotate: (i - mid) * 7 };
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Opening today's pack"
    >
      <motion.div
        className="absolute inset-0 bg-[hsl(232_45%_4%/.9)] backdrop-blur-md"
        animate={{ opacity: phase === "away" ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      />

      <button
        onClick={onDone}
        className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 z-30 h-9 px-4 rounded-full bg-white/10 border border-white/15 text-[13px] font-semibold"
      >
        Skip
      </button>

      <div className="relative w-full h-[560px] grid place-items-center">
        {/* Glow that builds while the pack trembles */}
        <motion.div
          className="absolute w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,214,120,.35),transparent_62%)]"
          animate={{
            scale: after("leak") ? [1, 1.5] : phase === "shake" ? [0.8, 1.1] : 0.7,
            opacity: phase === "away" ? 0 : after("shake") ? 1 : 0.4,
          }}
          transition={{ duration: 0.6 }}
        />

        {/* God rays once the pack is open */}
        <AnimatePresence>
          {after("torn") && phase !== "away" && (
            <motion.div
              key="rays"
              className="absolute w-[760px] h-[760px] rounded-full"
              style={{
                background: "repeating-conic-gradient(from 0deg, rgba(255,226,140,.28) 0deg 7deg, transparent 7deg 22deg)",
                WebkitMaskImage: "radial-gradient(circle, #000 18%, transparent 62%)",
                maskImage: "radial-gradient(circle, #000 18%, transparent 62%)",
              }}
              initial={{ scale: 0, opacity: 0, rotate: 0 }}
              animate={{ scale: 1, opacity: 1, rotate: 90 }}
              exit={{ opacity: 0 }}
              transition={{ scale: { duration: 0.6, ease: [0.2, 0.9, 0.3, 1] }, opacity: { duration: 0.4 }, rotate: { duration: 14, ease: "linear" } }}
            />
          )}
        </AnimatePresence>

        {/* Cards: hidden in the pack, rise out, fan, flip */}
        <div className="absolute" style={{ width: CARD_W, height: CARD_H }}>
          {shown.map((tip, i) => {
            const f = fanPos(i);
            const stackJitter = ((i * 37) % 9) - 4;
            const anim = !after("rise")
              ? { x: 0, y: 70, rotate: 0, opacity: 0, scale: 0.9 }
              : phase === "rise"
              ? { x: stackJitter, y: -150 - i * 3, rotate: stackJitter / 2, opacity: 1, scale: 1 }
              : phase === "away"
              ? { x: f.x * 0.4, y: 420, rotate: f.rotate * 2, opacity: 0, scale: 0.8 }
              : { x: f.x, y: f.y, rotate: f.rotate, opacity: 1, scale: 1.12 };
            const isFlipped = flipped > i;
            return (
              <motion.div
                key={tip.id}
                className="absolute inset-0 [perspective:800px]"
                style={{ zIndex: i }}
                animate={anim}
                transition={{
                  type: "spring",
                  stiffness: phase === "rise" ? 120 : 150,
                  damping: 17,
                  delay: phase === "rise" ? i * 0.05 : phase === "away" ? i * 0.04 : (n - i) * 0.03,
                }}
              >
                <motion.div
                  className="relative w-full h-full [transform-style:preserve-3d]"
                  animate={{ rotateY: isFlipped ? 180 : 0, scale: isFlipped && tip.isPremium ? [1, 1.18, 1] : 1 }}
                  transition={{ rotateY: { duration: 0.5, ease: [0.3, 0.7, 0.2, 1] }, scale: { duration: 0.5 } }}
                >
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    <CardBack />
                  </div>
                  <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <CardFront tip={tip} />
                    {/* white flash as it turns */}
                    {isFlipped && (
                      <motion.div
                        className="absolute inset-0 rounded-[10px] bg-white"
                        initial={{ opacity: 0.85 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.45, delay: 0.15 }}
                      />
                    )}
                  </div>
                </motion.div>
                {isFlipped && tip.isPremium && <GoldBurst count={14} radius={80} delay={0.2} />}
              </motion.div>
            );
          })}
        </div>

        {/* The pack, in front of the cards until it drops away */}
        <motion.div
          className="relative z-10"
          initial={{ scale: 0.7, y: 120, opacity: 0 }}
          animate={packAnim}
          transition={packTrans as never}
        >
          <PackArt date={date} count={tips.length} goldCount={goldCount} stage={packStage} />

          {/* Foil shreds where the strip ripped */}
          {after("torn") &&
            Array.from({ length: 18 }).map((_, i) => {
              const x = (i / 17) * PACK_SIZE.W;
              const dx = ((i * 53) % 90) - 45;
              return (
                <motion.span
                  key={i}
                  className={`absolute w-[6px] h-[3px] rounded-[1px] ${i % 3 ? "foil-gold" : "bg-white/90"}`}
                  style={{ left: x, top: PACK_SIZE.SEAM }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: dx, y: [-20 - (i % 5) * 18, 120], rotate: 360 + i * 40, opacity: [1, 1, 0] }}
                  transition={{ duration: 1.2, ease: "easeOut", times: [0, 0.4, 1] }}
                />
              );
            })}
        </motion.div>
      </div>

      {/* Footer: summary and continue */}
      <div className="relative h-32 flex flex-col items-center">
        <AnimatePresence>
          {phase === "done" && (
            <motion.div
              key="done"
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              <p className="font-display font-black uppercase text-[20px] tracking-[-0.01em]">
                {tips.length} {tips.length === 1 ? "card" : "cards"} pulled
              </p>
              <p className="text-[14px] text-muted-foreground mt-1">
                {goldCount > 0 ? (
                  <>
                    including <span className="foil-gold-text font-bold">{goldCount} Gold</span>
                  </>
                ) : (
                  "all Common today"
                )}
                {extra > 0 && ` · ${extra} more on the table`}
              </p>
              <button
                onClick={finish}
                className="mt-4 h-14 px-8 rounded-full bg-primary text-primary-foreground font-bold text-[16px] shadow-[0_10px_28px_-8px_hsl(var(--primary)/.7)] active:scale-[0.98] transition-transform"
              >
                Add to binder
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {phase !== "done" && phase !== "away" && (
          <motion.p
            className="label"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {after("reveal") ? "Revealing…" : after("torn") ? "Pulling cards…" : "Opening…"}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};

export default PackOpening;
