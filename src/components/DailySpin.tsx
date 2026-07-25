import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Crown, Clock, Sparkles, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { addPremiumDay, addPremiumDays } from "@/lib/premiumStorage";

const DEVICE_KEY = "gsb_device_id";
const SPIN_KEY = "gsb_last_spin";
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

const SEGMENTS = [
  { label: "Free Tip", prize: "1 free premium tip", color: "#ec4899", icon: Gift },
  { label: "Premium 1d", prize: "1 day premium free", color: "#a855f7", icon: Crown },
  { label: "Premium 7d", prize: "7 days premium free", color: "#f59e0b", icon: Crown },
  { label: "Try Again", prize: "Try again", color: "#6b7280", icon: Clock },
  { label: "Free Tip", prize: "1 free premium tip", color: "#06b6d4", icon: Gift },
  { label: "Try Again", prize: "Try again", color: "#4b5563", icon: Clock },
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

  const radius = 145;
  const center = 150;
  const segmentAngle = (2 * Math.PI) / SEGMENTS.length;

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
          <svg width="300" height="300" viewBox="0 0 300 300">
            <g
              style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: `${center}px ${center}px`,
                transition: spinning
                  ? `transform ${SPIN_DURATION}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`
                  : "none",
              }}
            >
              {SEGMENTS.map((seg, i) => {
                const startAngle = segmentAngle * i - Math.PI / 2;
                const endAngle = startAngle + segmentAngle;
                const x1 = center + radius * Math.cos(startAngle);
                const y1 = center + radius * Math.sin(startAngle);
                const x2 = center + radius * Math.cos(endAngle);
                const y2 = center + radius * Math.sin(endAngle);
                const largeArc = segmentAngle > Math.PI ? 1 : 0;
                const midAngle = startAngle + segmentAngle / 2;
                const textX = center + (radius * 0.65) * Math.cos(midAngle);
                const textY = center + (radius * 0.65) * Math.sin(midAngle);

                return (
                  <g key={i}>
                    <path
                      d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                      fill={seg.color}
                      stroke="#1a0030"
                      strokeWidth="1.5"
                    />
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="10"
                      fontWeight="bold"
                      transform={`rotate(${(midAngle * 180) / Math.PI + 90}, ${textX}, ${textY})`}
                      style={{ pointerEvents: "none" }}
                    >
                      {seg.label}
                    </text>
                  </g>
                );
              })}
            </g>
            <circle cx={center} cy={center} r="22" fill="#1a0030" stroke="#a855f7" strokeWidth="2" />
          </svg>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-pink-500 drop-shadow-lg" />
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
