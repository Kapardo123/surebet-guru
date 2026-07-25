import { TrendingUp, Receipt, Crown, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Tips", icon: TrendingUp, path: "/" },
  { label: "Coupons", icon: Receipt, path: "/#coupons" },
  { label: "Premium", icon: Crown, path: "/premium" },
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
      <div className="mx-4 mb-3 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/90 via-[#150025]/90 to-[#0a0020]/90 border border-purple-500/20 rounded-2xl shadow-2xl shadow-black/40">
        <div className="flex items-stretch py-2.5 px-2 gap-1">
          {navItems.map((item) => {
            const isLink = item.path !== "/" && item.path !== "/#coupons";
            const active = isActive(item);

            const content = (
              <>
                <item.icon className={`w-5 h-5 transition-all duration-300 ${active ? "text-pink-400 scale-110" : "group-hover:scale-105"}`} />
                <span className={`text-[10px] font-display font-bold tracking-wider uppercase transition-colors duration-300 ${active ? "text-pink-400" : ""}`}>{item.label}</span>
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-500" />
                )}
              </>
            );

            const buttonClass = `flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all duration-300 relative ${
              active
                ? "text-pink-400 bg-pink-500/10"
                : "text-purple-300/60 hover:text-pink-300 hover:bg-white/5 group"
            }`;

            if (isLink) {
              return (
                <Link key={item.label} to={item.path} className="no-underline flex-1">
                  <button onClick={() => handleClick(item)} className={`${buttonClass} w-full`}>
                    {content}
                  </button>
                </Link>
              );
            }

            return (
              <button key={item.label} onClick={() => handleClick(item)} className={buttonClass}>
                {content}
              </button>
            );
          })}

          {user ? (
            <button onClick={signOut} className="flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all duration-300 relative text-purple-300/60 hover:text-pink-300 hover:bg-white/5 group">
              <LogOut className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" />
              <span className="text-[10px] font-display font-bold tracking-wider uppercase">Logout</span>
            </button>
          ) : (
            <Link to="/auth" className="no-underline flex-1">
              <button className="flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all duration-300 relative text-purple-300/60 hover:text-pink-300 hover:bg-white/5 group w-full">
                <LogIn className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" />
                <span className="text-[10px] font-display font-bold tracking-wider uppercase">Sign In</span>
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