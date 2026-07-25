import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Crown, Clock, Sparkles, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { addPremiumDay, addPremiumDays } from "@/lib/premiumStorage";

const SPIN_KEY = "gsb_last_spin";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const SEGMENTS = [
  { label: "Free Tip", prize: "1 free premium tip", icon: Gift },
  { label: "Premium\n1 Day", prize: "1 day premium free", icon: Crown },
  { label: "Premium\n7 Days", prize: "7 days premium free", icon: Crown },
  { label: "Try\nAgain", prize: "Try again", icon: Clock },
  { label: "Free Tip", prize: "1 free premium tip", icon: Gift },
  { label: "Try\nAgain", prize: "Try again", icon: Clock },
];

const SEGMENT_COLORS = [
  { fill: "#ec4899", glow: "#f472b6" },
  { fill: "#a855f7", glow: "#c084fc" },
  { fill: "#f59e0b", glow: "#fbbf24" },
  { fill: "#6366f1", glow: "#818cf8" },
  { fill: "#06b6d4", glow: "#22d3ee" },
  { fill: "#8b5cf6", glow: "#a78bfa" },
];

const SPIN_DURATION = 4000;

const DailySpin = ({ isLoggedIn = false, userId, onFreeTip }: { isLoggedIn?: boolean; userId?: string; onFreeTip?: () => void }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    try {
      const raw = localStorage.getItem(SPIN_KEY);
      if (raw) {
        const lastSpin = parseInt(raw, 10);
        if (Date.now() - lastSpin < COOLDOWN_MS) {
          setBlocked(true);
        }
      }
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  const handleSpin = useCallback(() => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    if (spinning || blocked) return;
    setSpinning(true);
    setResult(null);

    // Record spin timestamp
    try { localStorage.setItem(SPIN_KEY, String(Date.now())); } catch { /* ignore */ }
    setBlocked(true);

    // Free Tip: 20%, Premium 1d: 0.05%, Premium 7d: 0.0001%, Try Again: ~79.95%
    const r = Math.random();
    let targetIdx: number;
    if (r < 0.1) targetIdx = 0; // Free Tip (10%)
    else if (r < 0.2) targetIdx = 4; // Free Tip (10%)
    else if (r < 0.2005) targetIdx = 1; // Premium 1d (0.05%)
    else if (r < 0.200501) targetIdx = 2; // Premium 7d (0.0001%)
    else if (r < 0.6) targetIdx = 3; // Try Again (~39.95%)
    else targetIdx = 5; // Try Again (~39.95%)

    const segmentAngle = 360 / SEGMENTS.length;
    const targetAngle = 360 - (segmentAngle * targetIdx + segmentAngle / 2);
    const totalRotation = rotation + 360 * 5 + targetAngle - (rotation % 360);

    setRotation(totalRotation);

    setTimeout(() => {
      setSpinning(false);
      const prize = SEGMENTS[targetIdx].prize;
      setResult(targetIdx === 3 || targetIdx === 5 ? null : prize);
      if (targetIdx === 1) {
        if (userId) addPremiumDay(userId);
      }
      if (targetIdx === 2) {
        if (userId) addPremiumDays(userId, 7);
      }
      if (targetIdx === 0 || targetIdx === 4) {
        onFreeTip?.();
      }
    }, SPIN_DURATION);
  }, [spinning, blocked, rotation, isLoggedIn, userId, onFreeTip]);

  const radius = 120;
  const center = 140;
  const segmentAngle = (2 * Math.PI) / SEGMENTS.length;

  // Precompute segment paths
  const segmentPaths = SEGMENTS.map((seg, i) => {
    const startAngle = segmentAngle * i - Math.PI / 2;
    const endAngle = startAngle + segmentAngle;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArc = segmentAngle > Math.PI ? 1 : 0;
    const midAngle = startAngle + segmentAngle / 2;
    const textR = radius * 0.55;
    const textX = center + textR * Math.cos(midAngle);
    const textY = center + textR * Math.sin(midAngle);
    return { i, seg, startAngle, endAngle, x1, y1, x2, y2, largeArc, midAngle, textX, textY };
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-950/40 via-pink-950/30 to-background border border-purple-500/20 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="font-display text-sm font-bold text-amber-400">Daily Reward</h3>
      </div>
      <p className="text-[11px] text-muted-foreground mb-4">Spin the wheel and win a prize!</p>

      <div className="flex flex-col items-center gap-4">
        {/* Wheel */}
        <div className="relative">
          <svg width="280" height="280" viewBox="0 0 280 280">
            <defs>
              {/* Glow filter */}
              <filter id="wheelGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Shine gradient for center */}
              <radialGradient id="centerShine" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#2a1540" />
                <stop offset="100%" stopColor="#0d0015" />
              </radialGradient>
              {/* Outer ring gradient */}
              <linearGradient id="outerRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="25%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              {/* Segment radial gradients */}
              {SEGMENT_COLORS.map((c, i) => (
                <radialGradient key={`seg${i}`} id={`segGrad${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={c.fill} />
                  <stop offset="90%" stopColor={c.fill} stopOpacity="0.85" />
                </radialGradient>
              ))}
            </defs>

            {/* Outer decorative ring with bumps */}
            <circle cx={center} cy={center} r={radius + 12} fill="none" stroke="url(#outerRing)" strokeWidth="3" opacity="0.6" />
            {/* Outer ring dots */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (2 * Math.PI * i) / 24 - Math.PI / 2;
              const dotR = radius + 12;
              const cx = center + dotR * Math.cos(a);
              const cy = center + dotR * Math.sin(a);
              return (
                <circle
                  key={`dot${i}`}
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill={i % 2 === 0 ? "#fbbf24" : "#ffffff"}
                  filter="url(#wheelGlow)"
                  opacity="0.9"
                />
              );
            })}

            {/* Main spinning group */}
            <g
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: `${center}px ${center}px`,
                transition: spinning
                  ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                  : "none",
              }}
            >
              {/* Segment fills */}
              {segmentPaths.map(({ i, seg, x1, y1, x2, y2, largeArc }) => (
                <g key={i}>
                  <path
                    d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                    fill={`url(#segGrad${i})`}
                    stroke="#1a0030"
                    strokeWidth="1.5"
                    filter="url(#wheelGlow)"
                  />
                </g>
              ))}

              {/* Segment text */}
              {segmentPaths.map(({ i, textX, textY, midAngle, seg }) => (
                <text
                  key={`txt${i}`}
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="'DM Sans', sans-serif"
                  transform={`rotate(${(midAngle * 180) / Math.PI + 90}, ${textX}, ${textY})`}
                  style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                >
                  {seg.label.split("\n").map((line, li, arr) => (
                    <tspan
                      key={li}
                      x={textX}
                      dy={li === 0 ? `${-(arr.length - 1) * 5.5}px` : "11px"}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              ))}
            </g>

            {/* Center hub - layered */}
            <circle cx={center} cy={center} r="28" fill="#0d0015" stroke="#a855f7" strokeWidth="2.5" />
            <circle cx={center} cy={center} r="22" fill="url(#centerShine)" stroke="#ec4899" strokeWidth="1.5" opacity="0.8" />
            <circle cx={center} cy={center} r="15" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
            {/* Center star/diamond */}
            <polygon
              points={`${center},${center - 8} ${center + 6.5},${center} ${center},${center + 8} ${center - 6.5},${center}`}
              fill="#fbbf24"
              opacity="0.9"
            />
          </svg>

          {/* Pointer / arrow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <svg width="28" height="24" viewBox="0 0 28 24" className="drop-shadow-lg">
              <defs>
                <linearGradient id="arrowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
              <polygon points="14,24 0,0 28,0" fill="url(#arrowGrad)" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {!isLoggedIn ? (
          <Link to="/auth">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-full font-display font-bold text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Log in to spin
            </motion.button>
          </Link>
        ) : showLogin ? (
          <Link to="/auth">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-8 py-3 rounded-full font-display font-bold text-sm bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 shadow-lg shadow-purple-500/30 transition-all flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Log in to spin
            </motion.button>
          </Link>
        ) : (
        <button
          onClick={handleSpin}
          disabled={!isLoggedIn || spinning || blocked}
          className={`px-8 py-3 rounded-full font-display font-bold text-sm transition-all ${
            isLoggedIn && !spinning && !blocked
              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 shadow-lg shadow-purple-500/30"
              : "bg-muted/50 text-muted-foreground cursor-not-allowed"
          }`}
        >
          {spinning ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">🎰</span> Spinning...
            </span>
          ) : result ? (
            <span className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> {result}
            </span>
          ) : blocked ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Come back in 24h
            </span>
          ) : (
            "SPIN THE WHEEL 🎰"
          )}
        </button>
        )}

        {result && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-amber-400 font-semibold text-center"
          >
            🎉 You won: {result}!
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default DailySpin;
