import { ReactNode } from "react";
import Logo from "@/components/Logo";

/** Top bar shared by every public screen. */
const AppHeader = ({ right }: { right?: ReactNode }) => (
  <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/[0.06] pt-[env(safe-area-inset-top)]">
    <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
      <Logo />
      <div className="flex items-center gap-1.5">{right}</div>
    </div>
  </header>
);

export const headerLink =
  "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold text-foreground/85 bg-white/[0.06] hover:bg-white/[0.1]";

export const goldButton =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-full foil-gold text-stock-ink text-[13px] font-bold shadow-[0_4px_14px_-4px_hsl(var(--gold)/.6)]";

export default AppHeader;
