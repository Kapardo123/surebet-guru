import { Crosshair, Ticket, Gem, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { LucideIcon } from "lucide-react";

type Item = { label: string; icon: LucideIcon; active: boolean; onClick?: () => void; to?: string };

const NavButton = ({ label, icon: Icon, active, onClick, to }: Item) => {
  const cls = `relative flex-1 flex flex-col items-center justify-center gap-1 h-[58px] transition-colors ${
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
  }`;
  const inner = (
    <>
      {active && <span className="absolute top-[-3px] inset-x-3 h-[3px] bg-red" />}
      <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.6} />
      <span className={`font-mono text-[10px] uppercase tracking-[0.1em] ${active ? "font-semibold" : ""}`}>{label}</span>
    </>
  );
  return to ? (
    <Link to={to} onClick={onClick} className={cls}>{inner}</Link>
  ) : (
    <button onClick={onClick} className={cls}>{inner}</button>
  );
};

const BottomNav = ({ activeTab, onTabChange }: { activeTab?: string; onTabChange?: (tab: string) => void }) => {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const onHome = pathname === "/";

  const go = (tab: string) => {
    onTabChange?.(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/95 backdrop-blur-sm border-t-[3px] border-foreground pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        <NavButton label="Tips" icon={Crosshair} active={onHome && activeTab === "tips"} to={onHome ? undefined : "/"} onClick={() => go("tips")} />
        <NavButton label="Coupons" icon={Ticket} active={onHome && activeTab === "coupons"} to={onHome ? undefined : "/"} onClick={() => go("coupons")} />
        <NavButton label="Members" icon={Gem} active={pathname === "/premium"} to="/premium" />
        {user ? (
          <NavButton label="Sign out" icon={LogOut} active={false} onClick={signOut} />
        ) : (
          <NavButton label="Sign in" icon={LogIn} active={pathname === "/auth"} to="/auth" />
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
