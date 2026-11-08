import { NavLink } from "react-router-dom";
import { Target, Ticket } from "@/components/icons/gsb";
import { Bookmark, User } from "lucide-react";

// Compact 4-tab bottom navigation. Premium lives in the header / account, and
// logout moved to the Account tab (per the mobile information architecture).
const items = [
  { to: "/", label: "Tips", icon: Target, end: true },
  { to: "/coupons", label: "Coupons", icon: Ticket, end: false },
  { to: "/watched", label: "Watched", icon: Bookmark, end: false },
  { to: "/account", label: "Account", icon: User, end: false },
];

const BottomNav = () => (
  <nav
    className="fixed bottom-0 left-0 right-0 z-50 md:hidden tabbar-blur border-t border-white/[0.08]"
    aria-label="Primary"
  >
    <div className="flex items-stretch px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `relative flex-1 min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition-colors duration-200 ${
              isActive ? "text-pink-400" : "text-white/55 active:text-white/80"
            }`
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[10px] font-display font-semibold tracking-wide">{label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-7 rounded-full bg-pink-500" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
);

export default BottomNav;
