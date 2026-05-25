import { TrendingUp, Receipt, Crown, LogIn, LogOut, Home, Sparkles } from "lucide-react";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glassmorphism container */}
      <div className="mx-4 mb-3 backdrop-blur-xl bg-background/80 border border-border/30 rounded-2xl shadow-2xl shadow-black/20">
        <div className="flex items-center justify-around py-2.5 px-2">
          {navItems.map((item) => {
            const active = isActive(item);
            const isLink = item.path !== "/" && item.path !== "/#coupons";

            const content = (
              <button
                onClick={() => handleClick(item)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 relative group ${
                  active
                    ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 text-purple-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg shadow-purple-500/50" />
                )}
                
                <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
                  <item.icon className={`w-5 h-5 ${active ? "drop-shadow-lg drop-shadow-purple-500/50" : ""}`} />
                </div>
                
                <span className={`text-[10px] font-display font-bold tracking-wider uppercase ${
                  active ? "text-purple-400" : ""
                }`}>
                  {item.label}
                </span>
              </button>
            );

            if (isLink) {
              return (
                <Link key={item.label} to={item.path} className="no-underline">
                  {content}
                </Link>
              );
            }

            return <div key={item.label}>{content}</div>;
          })}
          
          {/* Auth button */}
          <div className="w-px h-10 bg-border/30 mx-1" />
          
          {user ? (
            <button 
              onClick={signOut}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/5 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-display font-medium tracking-wide">Logout</span>
            </button>
          ) : (
            <Link to="/auth" className="no-underline">
              <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl text-muted-foreground hover:text-purple-400 hover:bg-purple-500/5 transition-all duration-200">
                <LogIn className="w-5 h-5" />
                <span className="text-[10px] font-display font-bold tracking-wide">Sign In</span>
              </div>
            </Link>
          )}
        </div>
      </div>
      
      {/* Safe area padding */}
      <div className="h-[max(0.5rem,env(safe-area-inset-bottom))]" />
    </nav>
  );
};

export default BottomNav;
