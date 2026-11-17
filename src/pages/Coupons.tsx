import { useState, useEffect } from "react";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import CouponCard from "@/components/CouponCard";
import AppHeader, { headerLink, goldButton } from "@/components/AppHeader";
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
    <div className="min-h-screen pb-12">
      <AppHeader
        right={
          <>
            {!isPremium && <Link to="/premium" className={goldButton}>Go Gold</Link>}
            <Link to="/" className={headerLink}>
              <ArrowLeft className="w-4 h-4" />
              Cards
            </Link>
          </>
        }
      />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <p className="label">{loading ? "Loading" : `${coupons.length} sets`}</p>
          <h1 className="font-display font-black uppercase text-[30px] leading-[1.02] tracking-[-0.02em] mt-1.5">Card sets</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : coupons.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 items-start">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} userIsPremium={isPremium} />
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/15 px-6 py-12 text-center">
            <p className="font-display font-black uppercase text-[18px]">
              {error === "Failed to load coupons" ? "Couldn't load coupons" : "No coupons right now"}
            </p>
            <p className="text-[15px] text-muted-foreground mt-1.5">
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
