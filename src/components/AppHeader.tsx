import { ReactNode } from "react";
import Logo from "@/components/Logo";

/** Compact top bar for inner pages: wordmark + actions, double rule underneath. */
const AppHeader = ({ right }: { right?: ReactNode }) => (
  <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm pt-[env(safe-area-inset-top)]">
    <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
      <Logo />
      <div className="flex items-center gap-1">{right}</div>
    </div>
    <div className="max-w-5xl mx-auto px-4">
      <div className="border-t-[3px] border-foreground" />
      <div className="mt-[2px] border-t border-foreground" />
    </div>
  </header>
);

export const headerLink =
  "inline-flex items-center gap-1.5 h-8 px-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-foreground hover:bg-secondary";

export default AppHeader;
