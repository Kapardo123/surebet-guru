import { ReactNode, useEffect, useState } from "react";
import Logo from "@/components/Logo";

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
      <div className={`max-w-5xl mx-auto px-4 flex items-center justify-between gap-3 transition-[height] duration-300 ${scrolled ? "h-14" : "h-[68px]"}`}>
        <div className={`origin-left transition-transform duration-300 ${scrolled ? "scale-[.9]" : ""}`}>
          <Logo />
        </div>
        <div className="flex items-center gap-1.5">{right}</div>
      </div>
      <div
        className={`absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,hsl(var(--gold)/.45),transparent)] transition-opacity duration-300 ${scrolled ? "opacity-100" : "opacity-0"}`}
        aria-hidden
      />
    </header>
  );
};

export const headerLink =
  "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-foreground/85 bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-md";

export const goldButton =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-full foil-gold text-stock-ink text-[13px] font-bold shadow-[0_4px_14px_-4px_hsl(var(--gold)/.6)]";

export default AppHeader;
