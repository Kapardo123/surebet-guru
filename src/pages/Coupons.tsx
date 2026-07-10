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
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 md:pb-0 relative overflow-hidden">
      {/* Synthwave glow effects */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
      <div className="fixed top-1/2 right-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />

      {/* Modern Glass Header - Synthwave Style */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/80 via-[#150025]/80 to-[#0a0020]/80 border-b border-purple-500/20 shadow-xl shadow-black/30">
        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 md:gap-3">
            <div className="relative">
              <Logo />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-base font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Coupons
              </h1>
              <p className="text-[10px] text-purple-300/50 font-medium tracking-wider uppercase">
                Premium Accumulators
              </p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-2.5">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 text-purple-300/70 hover:text-pink-400 hover:bg-white/5 transition-all duration-200 rounded-full px-3 md:px-3.5 border border-transparent hover:border-pink-500/30">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            
            {!isPremium && (
              <Link to="/premium">
                <Button size="sm" 
                        className="gap-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:from-pink-400 hover:via-purple-400 hover:to-cyan-400 text-white font-bold uppercase tracking-wider text-[11px] shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-300 hover:scale-105 rounded-full px-4 py-2 border border-white/10 relative overflow-hidden group">
                  <span className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" />
                    Go Premium
                  </span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8 relative z-10">
        {/* Page Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 px-4 py-2 rounded-full border border-pink-500/20 backdrop-blur-sm">
              <Receipt className="w-4 h-4 text-pink-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">Accumulators</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-pink-500 via-purple-500 to-cyan-500 rounded-full" />
              <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight">
                All Coupons
              </h2>
            </div>
            <span className="text-xs text-purple-300/70 font-display uppercase tracking-wider bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 px-4 py-2 rounded-full border border-purple-500/20 font-medium">
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
