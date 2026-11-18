import { ReactNode, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { Smartphone } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp, PLAY_STORE_URL } from "@/lib/platform";

/** Desktop navigation (the bottom bar takes over on phones). */
const DesktopNav = () => {
  const { user } = useAuth();
  const items = [
    { to: "/", label: "Cards", end: true },
    { to: "/album", label: "Album" },
    { to: "/premium", label: "Gold" },
    user ? { to: "/account", label: "Account" } : { to: "/auth", label: "Sign in" },
  ];
  return (
    <nav className="hidden md:flex items-center gap-1 p-1 rounded-full bg-white/[0.05] border border-white/[0.07]" aria-label="Main">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            `h-9 px-4 rounded-full grid place-items-center text-[13.5px] font-semibold transition-colors ${
              isActive ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground hover:bg-white/[0.06]"
            }`
          }
        >
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
};

/**
 * Top bar shared by every public screen. Transparent over the stadium at the
 * top of the page; once you scroll it condenses and picks up a glass panel
 * with a gold hairline.
 */
const AppHeader = ({ right }: { right?: ReactNode }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled ? "bg-background/75 backdrop-blur-xl shadow-[0_10px_30px_-18px_rgba(0,0,0,.9)]" : "bg-transparent"
      }`}
    >
      <div className={`max-w-6xl mx-auto px-4 lg:px-8 flex items-center justify-between gap-3 transition-[height] duration-300 ${scrolled ? "h-14" : "h-[68px]"}`}>
        <div className={`origin-left transition-transform duration-300 ${scrolled ? "scale-[.9]" : ""}`}>
          <Logo />
        </div>
        <DesktopNav />
        <div className="flex items-center gap-1.5">
          {!isNativeApp && (
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-foreground/85 bg-white/[0.07] hover:bg-white/[0.12]"
            >
              <Smartphone className="w-4 h-4" /> Get the app
            </a>
          )}
          {right}
        </div>
      </div>
      <div
        className={`absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/.45),transparent)] transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}
        aria-hidden
      />
    </header>
  );
};

export const headerLink =
  // Hidden on desktop, where the header nav covers the same links.
  "inline-flex md:hidden items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-foreground/85 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-md";

export const goldButton =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-full foil-gold text-stock-ink text-[13px] font-bold shadow-[0_4px_14px_-4px_hsl(var(--gold)/.6)]";

export default AppHeader;
