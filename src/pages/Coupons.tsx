import { useState, useEffect } from "react";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import CouponCard from "@/components/CouponCard";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, Crown, Receipt, ArrowLeft } from "lucide-react";

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  useEffect(() => {
    setCoupons(loadCoupons());
  }, []);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <Link to="/premium">
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 shadow-lg shadow-accent/20 font-display text-xs uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5" />
                Go Premium
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              Coupons
            </h1>
          </div>
          <span className="text-xs text-muted-foreground font-display uppercase tracking-wider bg-muted px-3 py-1 rounded-full">
            {coupons.length} coupons
          </span>
        </div>

        <div className="flex flex-col gap-4 max-w-sm mx-auto w-full">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>

        {coupons.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-display text-sm">
               No coupons yet. Add your first coupon in the admin panel.
            </p>
            <Link to="/admin">
              <Button variant="outline" size="sm" className="mt-2">
                Open Admin Panel
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
    </PageTransition>
  );
};

export default Coupons;
