import { Link } from "react-router-dom";
import { Gem, Sparkles, Crosshair, Ticket, Bell } from "@/components/icons/gsb";

interface PremiumUpsellProps {
  /** How many premium tips are locked for this user right now. */
  lockedCount?: number;
  className?: string;
}

const benefits = [
  { icon: Crosshair, label: "Every premium tip unlocked" },
  { icon: Ticket, label: "Premium accumulators" },
  { icon: Sparkles, label: "Expert, precise match analysis" },
  { icon: Bell, label: "Push alerts for new tips" },
];

// Home-page upgrade prompt, shown to non-premium users. Lightweight: a static
// gradient card with one soft animated shine on the CTA (see index.css).
const PremiumUpsell = ({ lockedCount = 0, className = "" }: PremiumUpsellProps) => (
  <div
    className={`relative overflow-hidden rounded-3xl border border-pink-500/20 ${className}`}
    style={{
      background:
        "linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(168,85,247,0.10) 45%, rgba(6,182,212,0.10) 100%)",
    }}
  >
    {/* Soft radial touches, pure gradients (no blur filter). */}
    <div
      className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(236,72,153,0.32), transparent 70%)" }}
    />
    <div
      className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(6,182,212,0.22), transparent 70%)" }}
    />

    <div className="relative p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-8">
      <div className="flex-1 min-w-0 space-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 px-3 py-1 text-[10px] font-display font-bold uppercase tracking-[0.14em] text-pink-300">
          <Gem className="w-3 h-3" /> Premium
        </span>

        <h2 className="font-display text-2xl sm:text-3xl font-black leading-tight text-white">
          Unlock every premium pick
        </h2>

        <p className="text-sm text-white/60 max-w-xl">
          {lockedCount > 0
            ? `${lockedCount} premium ${lockedCount === 1 ? "tip is" : "tips are"} locked today. Go Premium to reveal every pick, accumulator and the full analysis.`
            : "Go Premium to reveal every pick, accumulator and the full analysis."}
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {benefits.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13px] text-white/75">
              <span className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-pink-400" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 lg:w-56">
        <Link to="/premium" className="block">
          <button
            className="premium-upsell__cta w-full h-12 rounded-2xl font-display font-bold text-sm text-white inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #ec4899 0%, #db2777 55%, #a855f7 100%)" }}
          >
            <Gem className="w-4 h-4 brightness-0 invert" /> Go Premium
          </button>
        </Link>
        <p className="mt-2 text-center text-[11px] text-white/40">
          From 7 days · cancel anytime
        </p>
      </div>
    </div>
  </div>
);

export default PremiumUpsell;
