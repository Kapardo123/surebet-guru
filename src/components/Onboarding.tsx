import { useState } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import PackArt from "@/components/PackArt";
import MiniCard, { MiniCardData } from "@/components/MiniCard";
import StreakBar from "@/components/StreakBar";
import { track } from "@/lib/analytics";

const KEY = "gsb_onboarded";

export const needsOnboarding = () => {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return false;
  }
};

const sample = (over: Partial<MiniCardData>): MiniCardData => ({
  sport: "Football", homeTeam: "Arsenal", awayTeam: "Chelsea", prediction: "Over 2.5 goals", odds: 1.85,
  kickoff: new Date(Date.now() + 3 * 3600e3).toISOString(), ...over,
});

const SLIDES = [
  {
    title: "A fresh pack every day",
    body: "Each morning the day's picks are sealed in a pack. Tear it open to deal them onto the table.",
    art: (
      <div className="scale-[.62] origin-center -my-14">
        <PackArt date={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} count={5} goldCount={2} />
      </div>
    ),
  },
  {
    title: "Common and Gold cards",
    body: "Common cards are free. Gold cards are our strongest picks: unlock one for $0.99 or go Gold for all of them.",
    art: (
      <div className="relative h-[200px] w-[260px]">
        <div className="absolute left-6 top-4 -rotate-[10deg]">
          <MiniCard card={sample({})} className="w-[118px] h-[166px]" />
        </div>
        <div className="absolute right-6 top-2 rotate-[8deg]">
          <MiniCard card={sample({ homeTeam: "Real Betis", awayTeam: "Sevilla", prediction: "Betis to win", odds: 2.4 })} gold className="w-[118px] h-[166px]" />
        </div>
      </div>
    ),
  },
  {
    title: "Collect and keep your streak",
    body: "Every card you open goes into your album. Open a pack seven days in a row and a Gold card is on us.",
    art: (
      <div className="w-[300px]">
        <StreakBar streak={6} credits={0} local={false} />
      </div>
    ),
  },
];

/** First-run walkthrough: three swipeable slides, shown once per device. */
const Onboarding = ({ onDone }: { onDone: () => void }) => {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const last = i === SLIDES.length - 1;

  const finish = (skipped: boolean) => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* storage unavailable */
    }
    track(skipped ? "onboarding_skipped" : "onboarding_completed", { slide: i + 1 });
    onDone();
  };
  const go = (n: number) => {
    if (n < 0 || n >= SLIDES.length) return;
    setDir(n > i ? 1 : -1);
    setI(n);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) go(i + 1);
    else if (info.offset.x > 60) go(i - 1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex flex-col bg-[radial-gradient(120%_80%_at_50%_20%,hsl(250_50%_22%),hsl(var(--background))_60%)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Great Sport Bets"
    >
      <div className="flex justify-end p-4 pt-[max(16px,env(safe-area-inset-top))]">
        <button onClick={() => finish(true)} className="h-9 px-4 rounded-full bg-white/10 text-[13px] font-semibold">
          Skip
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={i}
            custom={dir}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center"
            initial={{ x: dir * 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -dir * 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={onDragEnd}
          >
            <div className="h-[230px] grid place-items-center">{SLIDES[i].art}</div>
            <h2 className="font-display font-black uppercase text-[26px] leading-[1.05] tracking-[-0.02em] mt-6">{SLIDES[i].title}</h2>
            <p className="text-[16px] leading-relaxed text-muted-foreground mt-3 max-w-[320px]">{SLIDES[i].body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex justify-center gap-2 mb-5" role="tablist" aria-label="Slides">
          {SLIDES.map((_, n) => (
            <button
              key={n}
              role="tab"
              aria-selected={n === i}
              aria-label={`Slide ${n + 1}`}
              onClick={() => go(n)}
              className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-primary" : "w-2 bg-white/25"}`}
            />
          ))}
        </div>
        <button
          onClick={() => (last ? finish(false) : go(i + 1))}
          className="w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-[16px] shadow-[0_10px_28px_-8px_hsl(var(--primary)/.7)] active:scale-[0.99] transition-transform"
        >
          {last ? "Open today's pack" : "Next"}
        </button>
      </div>
    </motion.div>
  );
};

export default Onboarding;
