import { useState, useEffect } from "react";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import CouponCard from "@/components/CouponCard";
import AppHeader from "@/components/AppHeader";
import PageTransition from "@/components/PageTransition";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 🎯 PRZYWRÓCONE: usePremiumStatus - potrzebne do logiki kłódki!
  const { active: isPremium } = usePremiumStatus();

  useEffect(() => {
    const fetchCoupons = async () => {
      console.log('🎫 Coupons: Pobieranie kuponów...');
      setLoading(true);
      setError(null);
      
      try {
        const loaded = await loadCoupons();
        console.log('🎫 Coupons: Pobrano', loaded.length, 'kuponów');
        
        if (loaded.length === 0) {
          console.warn('🎫 Coupons: Brak kuponów');
          setError('No coupons available');
        }
        
        setCoupons(loaded);
      } catch (err) {
        console.error('❌ Coupons: Błąd pobierania:', err);
        setError('Failed to load coupons');
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCoupons();
  }, []);

  return (
    <PageTransition>
    <div className="min-h-screen bg-background pb-12">
      <AppHeader
        right={
          <>
            {!isPremium && (
              <Link to="/premium" className="inline-flex items-center h-8 px-3 rounded-full bg-gold text-accent-foreground text-xs font-semibold">
                Go Premium
              </Link>
            )}
            <Link to="/" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-secondary-foreground hover:text-foreground hover:bg-secondary">
              <ArrowLeft className="w-4 h-4" />
              Tips
            </Link>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-5">
        <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
          <h1 className="font-display font-semibold uppercase text-[32px] leading-none tracking-[0.01em]">Coupons</h1>
          {!loading && <span className="text-sm text-muted-foreground">{coupons.length} total</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : coupons.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 items-start">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} userIsPremium={isPremium} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-foreground">
              {error === "Failed to load coupons" ? "Couldn't load coupons" : "No coupons right now"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {error === "Failed to load coupons"
                ? "Check your connection and try again."
                : "Accumulators go up before the evening fixtures."}
            </p>
          </div>
        )}
      </main>
    </div>
    </PageTransition>
  );
};

export default Coupons;
