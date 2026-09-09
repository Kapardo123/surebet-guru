import { ArrowRightToLine, ArrowLeftFromLine } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  IconTargetReal,
  IconTicketReal,
  IconGemReal,
} from "@/components/icons/RealisticIcons";

const navItems = [
  { label: "Tips", icon: Crosshair, path: "/" },
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
      <div className="mx-3 mb-3 rounded-3xl border border-white/[0.09] bg-gradient-to-r from-[#0a0015]/95 via-[#1a002e]/95 to-[#0a0015]/95 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(168,85,247,0.12)]">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-pink-500/60 to-transparent" />
        <div className="flex items-stretch px-1.5 py-2 gap-0.5">
          {navItems.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleClick(item)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-2xl transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-b from-pink-500/15 to-purple-500/[0.08]"
                    : "active:bg-white/5"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                )}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    active
                      ? "bg-white/[0.08] scale-110 drop-shadow-[0_0_6px_rgba(236,72,153,0.45)]"
                      : "opacity-60"
                  }`}
                >
                  <Icon size={26} />
                </div>
                <span
                  className={`text-[8.5px] font-display font-black tracking-wider uppercase transition-colors duration-300 ${
                    active ? "text-pink-300" : "text-white/35"
                  }`}
                >
                  {item.label}
                </span>
              </button>
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
              <span className="text-[8.5px] font-display font-black tracking-wider uppercase text-white/35">Logout</span>
            </button>
          ) : (
            <Link to="/auth" className="no-underline flex-1">
              <button className="w-full flex flex-col items-center gap-0.5 px-0.5 py-1.5 rounded-2xl active:bg-white/5 transition-all">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center opacity-60">
                  <ArrowRightToLine className="w-5 h-5 text-white/60" />
                </div>
                <span className="text-[8.5px] font-display font-black tracking-wider uppercase text-white/35">Sign In</span>
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