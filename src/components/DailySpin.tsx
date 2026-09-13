import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Gem, Timer, Sparkles, ArrowRightToLine } from "@/components/icons/gsb";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const SPIN_KEY = "gsb_last_spin";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const SEGMENTS = [
  { label: "Free Tip", prize: "1 free premium tip", icon: Gift },
  { label: "Premium\n1 Day", prize: "1 day premium free", icon: Gem },
  { label: "Premium\n7 Days", prize: "7 days premium free", icon: Gem },
  { label: "Try\nAgain", prize: "Try again", icon: Timer },
  { label: "Free Tip", prize: "1 free premium tip", icon: Gift },
  { label: "Try\nAgain", prize: "Try again", icon: Timer },
];

// Disciplined palette: pink = premium prizes (accent), cyan = free tip (data),
// neutral slate = "Try again" so losing segments read as inactive.
const SEGMENT_COLORS = [
  { fill: "#06b6d4", glow: "#22d3ee" }, // Free Tip
  { fill: "#ec4899", glow: "#f472b6" }, // Premium 1 Day
  { fill: "#db2777", glow: "#f472b6" }, // Premium 7 Days
  { fill: "#475569", glow: "#64748b" }, // Try Again
  { fill: "#0891b2", glow: "#22d3ee" }, // Free Tip
  { fill: "#64748b", glow: "#94a3b8" }, // Try Again
];

const SPIN_DURATION = 4200;

type Prize = "free_tip" | "premium_1d" | "premium_7d" | "try_again";

// Two wheel slots share each of "Free Tip" and "Try Again" — pick one at random.
const segmentForPrize = (prize: Prize): number => {
  switch (prize) {
    case "free_tip": return Math.random() < 0.5 ? 0 : 4;
    case "premium_1d": return 1;
    case "premium_7d": return 2;
    default: return Math.random() < 0.5 ? 3 : 5;
  }
};

const radius = 128;
const center = 148;
const segmentAngle = (2 * Math.PI) / SEGMENTS.length;

const DailySpin = ({ isLoggedIn = false, userId, onFreeTip, onPremiumWon }: { isLoggedIn?: boolean; userId?: string; onFreeTip?: () => void; onPremiumWon?: () => void }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [nextSpinAt, setNextSpinAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Server is the source of truth for the 24h cooldown.
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("daily-reward", {
          body: { action: "status" },
        });
        if (cancelled || error || !data) return;
        if (!data.canSpin && data.nextSpinAt) {
          setNextSpinAt(Number(data.nextSpinAt));
          setBlocked(true);
        } else {
          setBlocked(false);
          setNextSpinAt(null);
        }
      } catch {
        /* offline — leave unlocked, the spin call will re-check */
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  // Timer do odliczania cooldownu
  useEffect(() => {
    if (!blocked) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [blocked]);

  const handleSpin = useCallback(async () => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    if (spinning || blocked) return;
    setSpinning(true);
    setResult(null);

    try {
      // Prize + cooldown are decided server-side; the client only animates to it.
      const { data, error } = await supabase.functions.invoke("daily-reward", {
        body: { action: "spin", deviceId: userId },
      });
      if (error) throw error;

      if (!data?.ok) {
        setNextSpinAt(Number(data?.nextSpinAt) || Date.now() + COOLDOWN_MS);
        setBlocked(true);
        setSpinning(false);
        return;
      }

      const prize = data.prize as Prize;
      const targetIdx = segmentForPrize(prize);
      const segmentAngle = 360 / SEGMENTS.length;
      const targetAngle = 360 - (segmentAngle * targetIdx + segmentAngle / 2);
      const totalRotation = rotation + 360 * 5 + targetAngle - (rotation % 360);
      setRotation(totalRotation);

      setNextSpinAt(Number(data.nextSpinAt) || Date.now() + COOLDOWN_MS);
      setBlocked(true);
      try { localStorage.setItem(SPIN_KEY, String(Date.now())); } catch { /* ignore */ }

      setTimeout(() => {
        setSpinning(false);
        if (prize === "try_again") {
          setResult(null);
          return;
        }
        setResult(
          prize === "premium_7d" ? "7 days premium free"
            : prize === "premium_1d" ? "1 day premium free"
            : "1 free premium tip",
        );
        if (prize === "premium_1d" || prize === "premium_7d") onPremiumWon?.();
        if (prize === "free_tip") onFreeTip?.();
      }, SPIN_DURATION);
    } catch {
      setSpinning(false);
    }
  }, [spinning, blocked, rotation, isLoggedIn, userId, onFreeTip, onPremiumWon]);

  // Precompute segment paths
  const segmentPaths = useMemo(() => SEGMENTS.map((seg, i) => {
    const startAngle = segmentAngle * i - Math.PI / 2;
    const endAngle = startAngle + segmentAngle;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = segmentAngle > Math.PI ? 1 : 0;
    const midAngle = startAngle + segmentAngle / 2;
    const textR = radius * 0.6;
    const textX = center + textR * Math.cos(midAngle);
    const textY = center + textR * Math.sin(midAngle);
    return { i, seg, startAngle, endAngle, x1, y1, x2, y2, largeArc, midAngle, textX, textY };
  }), []);

  // Cooldown countdown
  const remainingMs = blocked && nextSpinAt ? Math.max(0, nextSpinAt - now) : 0;
  const remH = Math.floor(remainingMs / 3600000);
  const remM = Math.floor((remainingMs % 3600000) / 60000);

  const canSpin = isLoggedIn && !spinning && !blocked;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pink-500/20 bg-gradient-to-r from-[#12001f]/90 via-[#1a002e]/90 to-[#0a0015]/90 shadow-lg shadow-pink-500/10">
      {/* Tło: poświata */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ background: "radial-gradient(ellipse 55% 100% at 50% 0%, rgba(236,72,153,0.14), transparent 70%)" }}
      />
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-pink-500 to-transparent" />

      <div className="relative p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 ring-1 ring-pink-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-white leading-none">Daily Reward</h3>
              <p className="text-[10px] text-white/35 mt-1">One free spin every 24 hours</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[9px] font-display font-bold uppercase tracking-[0.2em] text-white/25 border border-white/[0.06] px-2.5 py-1 rounded-full">
            🎰 Free spin
          </span>
        </div>

        <div className="flex flex-col items-center gap-5 mt-4">
          {/* ==================== WHEEL ==================== */}
          <div className="relative">
            {/* Aura pod kołem */}
            <div
              className="absolute -inset-6 rounded-full pointer-events-none opacity-50"
              style={{ background: "radial-gradient(circle, rgba(236,72,153,0.25) 0%, rgba(168,85,247,0.12) 45%, transparent 70%)" }}
            />

            <svg width="296" height="296" viewBox="0 0 296 296" className="relative">
              <defs>
                {/* Środek */}
                <radialGradient id="centerShine" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#2d1547" />
                  <stop offset="100%" stopColor="#0d0015" />
                </radialGradient>
                {/* Zewnętrzny ring */}
                <linearGradient id="outerRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="50%" stopColor="#db2777" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                {/* Segmenty: ciemna baza z neonowym odcieniem */}
                {SEGMENT_COLORS.map((c, i) => (
                  <radialGradient key={`seg${i}`} id={`segGrad${i}`} cx="50%" cy="50%" r="75%">
                    <stop offset="0%" stopColor="#150022" />
                    <stop offset="55%" stopColor="#150022" stopOpacity="0.92" />
                    <stop offset="100%" stopColor={c.fill} stopOpacity="0.55" />
                  </radialGradient>
                ))}
              </defs>

              {/* Zewnętrzny neonowy ring — glow emulowany drugim, szerszym
                  obrysem (brak SVG blur = brak repaintu przy rotacji). */}
              <circle cx={center} cy={center} r={radius + 14} fill="none" stroke="#ec4899" strokeWidth="9" opacity="0.10" />
              <circle cx={center} cy={center} r={radius + 14} fill="none" stroke="url(#outerRing)" strokeWidth="3" opacity="0.75" />
              <circle cx={center} cy={center} r={radius + 20} fill="none" stroke="#ec4899" strokeWidth="0.5" opacity="0.15" />

              {/* LED dots na ringu */}
              {Array.from({ length: 24 }, (_, i) => {
                const a = (2 * Math.PI * i) / 24 - Math.PI / 2;
                const dotR = radius + 14;
                const cx = center + dotR * Math.cos(a);
                const cy = center + dotR * Math.sin(a);
                const isPink = i % 2 === 0;
                return (
                  <circle
                    key={`dot${i}`}
                    cx={cx}
                    cy={cy}
                    r={i % 3 === 0 ? 3.2 : 2.2}
                    fill={isPink ? "#f9a8d4" : "#67e8f9"}
                    opacity={spinning ? 0.95 : 0.6}
                  />
                );
              })}

              {/* Wewnętrzna tarcza (ciemne tło pod segmentami) */}
              <circle cx={center} cy={center} r={radius} fill="#0d0015" />

              {/* Spinning group — promowany na własną warstwę GPU */}
              <g
                style={{
                  transform: `translateZ(0) rotate(${rotation}deg)`,
                  transformOrigin: `${center}px ${center}px`,
                  willChange: "transform",
                  backfaceVisibility: "hidden",
                  transition: spinning
                    ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                    : "none",
                }}
              >
                {/* Segmenty */}
                {segmentPaths.map(({ i, x1, y1, x2, y2, largeArc }) => (
                  <path
                    key={`seg${i}`}
                    d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                    fill={`url(#segGrad${i})`}
                    stroke={SEGMENT_COLORS[i].glow}
                    strokeWidth="1.2"
                    strokeOpacity="0.55"
                  />
                ))}

                {/* Neonowe promienie między segmentami */}
                {segmentPaths.map(({ i, x1, y1, x2, y2 }) => (
                  <g key={`ray${i}`}>
                    <line x1={center} y1={center} x2={x1} y2={y1} stroke={SEGMENT_COLORS[i].glow} strokeWidth="0.8" strokeOpacity="0.35" />
                  </g>
                ))}

                {/* Etykiety */}
                {segmentPaths.map(({ i, textX, textY, midAngle, seg }) => (
                  <text
                    key={`txt${i}`}
                    x={textX}
                    y={textY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10.5"
                    fontWeight="800"
                    fontFamily="'DM Sans', sans-serif"
                    letterSpacing="0.5"
                    transform={`rotate(${(midAngle * 180) / Math.PI + 90}, ${textX}, ${textY})`}
                    style={{ pointerEvents: "none" }}
                    stroke="rgba(0,0,0,0.55)"
                    strokeWidth="2.5"
                    paintOrder="stroke"
                  >
                    {seg.label.split("\n").map((line, li, arr) => (
                      <tspan
                        key={li}
                        x={textX}
                        dy={li === 0 ? `${-(arr.length - 1) * 6}px` : "12px"}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                ))}
              </g>

              {/* Hub — wielowarstwowy */}
              <circle cx={center} cy={center} r="34" fill="#ec4899" opacity="0.10" />
              <circle cx={center} cy={center} r="30" fill="#0d0015" stroke="#ec4899" strokeWidth="2" />
              <circle cx={center} cy={center} r="24" fill="url(#centerShine)" stroke="#ec4899" strokeWidth="1" opacity="0.9" />
              <circle cx={center} cy={center} r="16" fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.4" />
              <polygon
                points={`${center},${center - 8.5} ${center + 7},${center} ${center},${center + 8.5} ${center - 7},${center}`}
                fill="#f9a8d4"
                opacity="0.95"
              />
            </svg>

            {/* Wskazówka na górze */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1.5 z-10">
              <svg width="30" height="26" viewBox="0 0 30 26">
                <defs>
                  <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f9a8d4" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
                <polygon points="15,26 2,2 28,2" fill="url(#arrowGrad)" stroke="#831843" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="15" cy="7" r="2.2" fill="#fdf2f8" opacity="0.9" />
              </svg>
            </div>
          </div>

          {/* ==================== CTA ==================== */}
          {!isLoggedIn || showLogin ? (
            <Link to="/auth">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 rounded-full font-display font-black text-[11px] uppercase tracking-[0.2em] text-white flex items-center gap-2 shadow-[0_0_24px_rgba(236,72,153,0.35)]"
                style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" }}
              >
                <ArrowRightToLine className="w-4 h-4 brightness-0 invert" /> Log in to spin
              </motion.button>
            </Link>
          ) : (
            <motion.button
              whileHover={canSpin ? { scale: 1.04 } : {}}
              whileTap={canSpin ? { scale: 0.96 } : {}}
              onClick={handleSpin}
              disabled={!canSpin}
              className={`px-9 py-3.5 rounded-full font-display font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                canSpin
                  ? "text-white shadow-[0_0_28px_rgba(236,72,153,0.4)]"
                  : "bg-white/[0.04] text-white/25 cursor-not-allowed border border-white/[0.06]"
              }`}
              style={canSpin ? { background: "linear-gradient(135deg, #ec4899 0%, #db2777 100%)" } : undefined}
            >
              {spinning ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin">🎰</span> Spinning…
                </span>
              ) : blocked ? (
                <span className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  {remainingMs > 0 ? `Next spin in ${remH}h ${remM}m` : "Next spin in 24h"}
                </span>
              ) : (
                "SPIN THE WHEEL"
              )}
            </motion.button>
          )}

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-pink-500/40 bg-pink-500/10 shadow-lg shadow-black/20"
              >
                <Gem className="w-5 h-5 text-pink-300" />
                <span className="text-sm font-bold text-white">🎉 You won: {result}!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DailySpin;