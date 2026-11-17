import { ReactNode } from "react";
import Logo from "@/components/Logo";

/** Solid top bar shared by every public screen. */
const AppHeader = ({ right, onLogoClick }: { right?: ReactNode; onLogoClick?: () => void }) => (
  <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top)]">
    <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
      <div onClick={onLogoClick} className={onLogoClick ? "cursor-pointer" : undefined}>
        <Logo />
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  </header>
);

export default AppHeader;
