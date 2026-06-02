import { TrendingUp, Receipt, Crown, LogIn, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Tips", icon: TrendingUp, path: "/" },
  { label: "Coupons", icon: Receipt, path: "/#coupons" },
  { label: "Premium", icon: Crown, path: "/premium" },
];

const buttonClass = "flex-1 flex flex-col items-center gap-1 px-1 py-2 rounded-xl transition-all duration-300 relative group text-purple-300/60 hover:text-pink-300 hover:bg-white/5";

const BottomNav = ({ onTabChange }: { onTabChange?: (tab: string) => void }) => {
  const { user, signOut } = useAuth();

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

            const content = (
              <>
                <item.icon className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" />
                <span className="text-[10px] font-display font-bold tracking-wider uppercase">{item.label}</span>
              </>
            );

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
            <button onClick={signOut} className={buttonClass}>
              <LogOut className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" />
              <span className="text-[10px] font-display font-bold tracking-wider uppercase">Logout</span>
            </button>
          ) : (
            <Link to="/auth" className="no-underline flex-1">
              <button className={`${buttonClass} w-full`}>
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