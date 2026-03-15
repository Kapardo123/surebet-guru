import { TrendingUp, Receipt, Crown, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "Tips", icon: TrendingUp, path: "/" },
  { label: "Coupons", icon: Receipt, path: "/#coupons" },
  { label: "Premium", icon: Crown, path: "/premium" },
];

const BottomNav = ({ onTabChange }: { onTabChange?: (tab: string) => void }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const handleClick = (item: typeof navItems[0]) => {
    if (item.path === "/#coupons" && onTabChange) {
      onTabChange("coupons");
    }
    if (item.path === "/" && onTabChange) {
      onTabChange("tips");
    }
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.path === "/" || item.path === "/#coupons") return location.pathname === "/";
    return location.pathname === item.path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t border-border/50">
      <div className="flex items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const active = isActive(item);
          const isLink = item.path !== "/" && item.path !== "/#coupons";

          const content = (
            <div
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => handleClick(item)}
            >
              <item.icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} />
              <span className="text-[10px] font-display font-medium tracking-wide">{item.label}</span>
            </div>
          );

          if (isLink) {
            return (
              <Link key={item.label} to={item.path}>
                {content}
              </Link>
            );
          }

          return (
            <button key={item.label} className="bg-transparent border-none cursor-pointer">
              {content}
            </button>
          );
        })}
        {/* Auth button */}
        {user ? (
          <button onClick={signOut} className="bg-transparent border-none cursor-pointer">
            <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground">
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-display font-medium tracking-wide">Log Out</span>
            </div>
          </button>
        ) : (
          <Link to="/auth">
            <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground">
              <LogIn className="w-5 h-5" />
              <span className="text-[10px] font-display font-medium tracking-wide">Sign In</span>
            </div>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
