import { useState, useEffect } from "react";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import CouponCard from "@/components/CouponCard";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Crown, Receipt, ArrowLeft, Sparkles } from "lucide-react";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Coupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { active: isPremium, loading: premiumLoading } = usePremiumStatus();

  useEffect(() => {
    const fetchCoupons = async () => {
      console.log('🎫 Coupons: Pobieranie kuponów...');
      setLoading(true);
      setError(null);
      
      try {
        const loaded = await loadCoupons();
        console.log('🎫 Coupons: Pobrano', loaded.length, 'kuponów:', loaded);
        
        if (loaded.length === 0) {
          console.warn('🎫 Coupons: Brak kuponów - sprawdzam przyczyny');
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

  useEffect(() => {
    console.log('🎫 Coupons: Status premium zmieniony - isPremium:', isPremium, 'loading:', premiumLoading);
  }, [isPremium, premiumLoading]);

  // Debug: Loguj stan komponentu
  console.log('🎫 Coupons Render:', { 
    couponsCount: coupons.length, 
    loading, 
    error, 
    isPremium, 
    premiumLoading,
    showEmptyState: !loading && coupons.length === 0
  });

  return (
    <PageTransition>
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-950/5 to-cyan-950/5 pb-20 md:pb-0 relative overflow-hidden">
      {/* Blue glow effects */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

      {/* Modern Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/30 shadow-lg shadow-black/5">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <Logo />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-base font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Coupons
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Premium Accumulators
              </p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2.5">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 rounded-full px-4">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            
            <Link to="/premium">
              <Button size="sm" 
                      className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold uppercase tracking-wider text-xs shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105 rounded-full px-5 py-2.5 border border-purple-400/20">
                <Crown className="w-4 h-4" />
                Go Premium
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8 relative z-10">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2 rounded-full border border-blue-500/20">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Accumulators</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full" />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                All Coupons
              </h2>
            </div>
            <span className="text-xs text-muted-foreground font-display uppercase tracking-wider bg-gradient-to-r from-blue-500/10 to-cyan-500/10 px-4 py-2 rounded-full border border-blue-500/20 font-medium">
              {coupons.length} coupons
            </span>
          </div>
        </div>

        {/* Coupons Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-muted-foreground font-display text-sm font-semibold">Loading coupons...</p>
            </div>
          </div>
        ) : coupons.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2 max-w-5xl mx-auto">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} userIsPremium={isPremium} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24 space-y-5 max-w-md mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mx-auto flex items-center justify-center border border-blue-500/20">
              <Receipt className="w-11 h-11 text-blue-400" />
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground font-display text-lg font-semibold">
                {error || 'No coupons yet'}
              </p>
              <p className="text-muted-foreground/60 text-sm leading-relaxed">
                {error === 'Failed to load coupons' 
                  ? 'There was an error loading coupons. Please try again later.'
                  : 'Check back soon for new premium accumulators with high odds'
                }
              </p>
            </div>
            <div className="pt-4">
              <Link to="/premium">
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold uppercase tracking-wider text-sm shadow-xl shadow-blue-500/25 transition-all duration-300 hover:scale-105 rounded-full px-6 py-3">
                  <Sparkles className="w-4 h-4" />
                  Unlock Premium Coupons
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
    </PageTransition>
  );
};

export default Coupons;
