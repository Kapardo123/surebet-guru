import { Crosshair, Ticket, Gem, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { LucideIcon } from "lucide-react";

type Item = { label: string; icon: LucideIcon; active: boolean; onClick?: () => void; to?: string };

const NavButton = ({ label, icon: Icon, active, onClick, to }: Item) => {
  const cls = `relative flex-1 flex flex-col items-center justify-center gap-1 h-14 transition-colors ${
    active ? "text-foreground" : "text-muted-foreground hover:text-secondary-foreground"
  }`;
  const inner = (
    <>
      {active && <span className="absolute top-0 h-[2px] w-8 rounded-b bg-primary" />}
      <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[11px] font-medium">{label}</span>
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
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        <NavButton label="Tips" icon={Crosshair} active={onHome && activeTab === "tips"} to={onHome ? undefined : "/"} onClick={() => go("tips")} />
        <NavButton label="Coupons" icon={Ticket} active={onHome && activeTab === "coupons"} to={onHome ? undefined : "/"} onClick={() => go("coupons")} />
        <NavButton label="Premium" icon={Gem} active={pathname === "/premium"} to="/premium" />
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
