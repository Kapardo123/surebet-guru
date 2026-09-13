import { ArrowRightToLine, ArrowLeftFromLine, Target, Ticket, Gem } from "@/components/icons/gsb";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Tips", icon: Target, path: "/" },
  { label: "Coupons", icon: Ticket, path: "/#coupons" },
  { label: "Premium", icon: Gem, path: "/premium" },
];

const BottomNav = ({ activeTab, onTabChange }: { activeTab?: string; onTabChange?: (tab: string) => void }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const isActive = (item: typeof navItems[0]) => {
    if (item.path === "/premium") return location.pathname === "/premium";
    if (item.path === "/#coupons") return activeTab === "coupons" && location.pathname === "/";
    if (item.path === "/") return activeTab === "tips" && location.pathname === "/";
    return false;
  };

  const handleClick = (item: typeof navItems[0]) => {
    if (item.path === "/#coupons" && onTabChange) {
      onTabChange("coupons");
    }
    if (item.path === "/" && onTabChange) {
      onTabChange("tips");
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="mx-3 mb-3 rounded-3xl border border-white/[0.09] bg-card/95 shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        <div className="flex items-stretch px-1.5 py-2 gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            const isTab = item.path === "/" || item.path === "/#coupons";
            const inner = (
              <>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-pink-500" />
                )}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    active
                      ? "bg-white/[0.08] scale-105"
                      : "opacity-60"
                  }`}
                >
                  <Icon size={26} />
                </div>
                <span
                  className={`text-[10px] font-display font-black tracking-wider uppercase transition-colors duration-300 ${
                    active ? "text-pink-300" : "text-white/45"
                  }`}
                >
                  {item.label}
                </span>
              </>
            );
            const className = `relative flex-1 flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-2xl transition-all duration-300 ${
              active
                ? "bg-gradient-to-b from-pink-500/15 to-pink-500/[0.06]"
                : "active:bg-white/5"
            }`;

            if (isTab) {
              return (
                <button key={item.label} onClick={() => handleClick(item)} className={className}>
                  {inner}
                </button>
              );
            }
            return (
              <Link key={item.label} to={item.path} className={className}>
                {inner}
              </Link>
            );
          })}

          {user ? (
            <button
              onClick={signOut}
              className="flex-1 flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-2xl active:bg-white/5 transition-all"
            >
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center opacity-60">
                <ArrowLeftFromLine className="w-5 h-5 text-white/60" />
              </div>
              <span className="text-[10px] font-display font-black tracking-wider uppercase text-white/45">Logout</span>
            </button>
          ) : (
            <Link to="/auth" className="no-underline flex-1">
              <button className="w-full flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-2xl active:bg-white/5 transition-all">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center opacity-60">
                  <ArrowRightToLine className="w-5 h-5 text-white/60" />
                </div>
                <span className="text-[10px] font-display font-black tracking-wider uppercase text-white/45">Sign In</span>
              </button>
            </Link>
          )}
        </div>
      </div>
      <div className="h-[max(0.5rem,env(safe-area-inset-bottom))]" />
    </nav>
  );
};

export default BottomNav;