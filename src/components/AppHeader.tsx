import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Gem, LogIn } from "@/components/icons/gsb";

const DESKTOP_ITEMS = [
  { to: "/", labelKey: "nav.tips", end: true },
  { to: "/coupons", labelKey: "nav.coupons", end: false },
  { to: "/watched", labelKey: "nav.watched", end: false },
  { to: "/account", labelKey: "nav.account", end: false },
];

// Compact mobile header: GSB mark left, Premium status/CTA, account right.
// The full wordmark only shows when there is room (Logo compact prop).
const AppHeader = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { active, daysLeft } = usePremiumStatus();
  const initial = (user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 tabbar-blur border-b border-white/[0.07] gsb-safe-top">
      <div className="mx-auto max-w-3xl lg:max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Logo compact />
        </div>

        {/* Desktop navigation (the bottom bar is mobile-only). */}
        <nav className="hidden md:flex items-center gap-1" aria-label={t("nav.tips")}>
          {DESKTOP_ITEMS.map(({ to, labelKey, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center transition-colors ${
                  isActive ? "bg-white/[0.08] text-white" : "text-white/55 hover:text-white hover:bg-white/[0.05]"
                }`
              }
            >
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {active ? (
            <Link
              to="/premium"
              className="inline-flex items-center gap-1 h-10 px-3 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-300 text-[11px] font-semibold active:bg-pink-500/15"
            >
              <Gem className="w-3.5 h-3.5" />
              {daysLeft}d
            </Link>
          ) : (
            <Link
              to="/premium"
              className="inline-flex items-center gap-1 h-10 px-3 rounded-full border border-pink-500/35 text-pink-300 text-[11px] font-bold uppercase tracking-wide active:bg-pink-500/10"
            >
              <Gem className="w-3.5 h-3.5" />
              {t("common.premium")}
            </Link>
          )}

          <Link
            to={user ? "/account" : "/auth"}
            aria-label={user ? t("common.account") : t("common.signIn")}
            className="w-10 h-10 rounded-full border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-white/70 active:bg-white/[0.08]"
          >
            {user ? (
              <span className="font-display font-bold text-[13px] leading-none">{initial}</span>
            ) : (
              <LogIn className="w-4 h-4" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
