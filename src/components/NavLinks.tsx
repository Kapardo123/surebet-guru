import { Link } from "react-router-dom";

type NavId = "tips" | "coupons" | "premium";

interface NavLinksProps {
  active: NavId;
  /** When provided, the item switches an in-page tab instead of navigating. */
  onTips?: () => void;
  onCoupons?: () => void;
  className?: string;
}

const items = [
  { id: "tips", label: "Tips", to: "/" },
  { id: "coupons", label: "Coupons", to: "/coupons" },
  { id: "premium", label: "Premium", to: "/premium" },
] as const;

/** Desktop-only top navigation. Hidden below `lg`, so mobile/tablet layout is untouched. */
const NavLinks = ({ active, onTips, onCoupons, className = "" }: NavLinksProps) => {
  const base =
    "inline-flex items-center h-9 px-4 rounded-full text-[12px] font-display font-bold uppercase tracking-[0.08em] border transition-colors duration-200";
  const on = "text-white bg-white/[0.08] border-white/10";
  const off = "text-white/55 border-transparent hover:text-white hover:bg-white/[0.05]";

  return (
    <nav className={`hidden lg:flex items-center gap-1 ${className}`}>
      {items.map((item) => {
        const isActive = active === item.id;
        const cls = `${base} ${isActive ? on : off}`;

        if (item.id === "tips" && onTips) {
          return (
            <button key={item.id} type="button" onClick={onTips} className={cls}>
              {item.label}
            </button>
          );
        }
        if (item.id === "coupons" && onCoupons) {
          return (
            <button key={item.id} type="button" onClick={onCoupons} className={cls}>
              {item.label}
            </button>
          );
        }
        return (
          <Link key={item.id} to={item.to} className={cls}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

export default NavLinks;
