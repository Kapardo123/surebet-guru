import { useState, useEffect } from "react";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import CouponCard from "@/components/CouponCard";
import AppHeader, { headerLink } from "@/components/AppHeader";
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
              <Link to="/premium" className="inline-flex items-center h-7 px-2 bg-red text-background font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                Subscribe
              </Link>
            )}
            <Link to="/" className={headerLink}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Tips
            </Link>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        <div className="flex items-end justify-between gap-3 border-b-[3px] border-foreground pb-2">
          <h1 className="font-display font-black uppercase text-[44px] leading-[0.85]">Coupons</h1>
          {!loading && <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">{coupons.length} slips</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : coupons.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} userIsPremium={isPremium} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="font-display font-black uppercase text-[28px] leading-none">
              {error === "Failed to load coupons" ? "Couldn't load coupons" : "No coupons right now"}
            </p>
            <p className="font-serif italic text-[16px] text-muted-foreground mt-2">
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
