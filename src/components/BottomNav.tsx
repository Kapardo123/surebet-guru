import { Layers, BookOpen, Gem, LogIn, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import type { LucideIcon } from "lucide-react";

type Item = { label: string; icon: LucideIcon; active: boolean; onClick?: () => void; to?: string };

const NavButton = ({ label, icon: Icon, active, onClick, to }: Item) => {
  const cls = `relative flex-1 flex flex-col items-center justify-center gap-1 h-[56px] rounded-[18px] transition-colors ${
    active ? "text-primary-foreground" : "text-foreground/60 hover:text-foreground"
  }`;
  const inner = (
    <>
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-1 rounded-[14px] bg-primary shadow-[0_6px_18px_-6px_hsl(var(--primary)/.7)]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <Icon className="relative w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 1.8} />
      <span className="relative text-[11.5px] font-semibold">{label}</span>
    </>
  );
  return to ? (
    <Link to={to} onClick={onClick} className={cls}>{inner}</Link>
  ) : (
    <button onClick={onClick} className={cls}>{inner}</button>
  );
};

const BottomNav = ({ activeTab, onTabChange }: { activeTab?: string; onTabChange?: (tab: string) => void }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const onHome = pathname === "/";

  const go = (tab: string) => {
    onTabChange?.(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="flex p-1 rounded-[22px] bg-[hsl(232_35%_14%/.92)] backdrop-blur-xl border border-white/10 shadow-[0_12px_30px_-8px_rgba(0,0,0,.8)]">
        <NavButton label="Cards" icon={Layers} active={onHome && activeTab === "tips"} to={onHome ? undefined : "/"} onClick={() => go("tips")} />
        <NavButton label="Album" icon={BookOpen} active={pathname === "/album"} to="/album" />
        <NavButton label="Gold" icon={Gem} active={pathname === "/premium"} to="/premium" />
        {user ? (
          <NavButton label="Account" icon={User} active={pathname === "/account"} to="/account" />
        ) : (
          <NavButton label="Sign in" icon={LogIn} active={pathname === "/auth"} to="/auth" />
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
