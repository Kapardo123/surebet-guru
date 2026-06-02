import { useState, useEffect } from "react";
import PageTransition from "@/components/PageTransition";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import RecentWins from "@/components/RecentWins";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { loadFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { Tip } from "@/components/TipCard";
import { Crown, TrendingUp, Receipt, LogIn, LogOut, Sparkles } from "lucide-react";
import PremiumBadge from "@/components/PremiumBadge";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ScrollReveal from "@/components/ScrollReveal";
import ParticleBackground from "@/components/ParticleBackground";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [allWonCoupons, setAllWonCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState("tips");
  const [recentWins, setRecentWins] = useState<Tip[]>([]);
  const [heroPick, setHeroPick] = useState<FeaturedPick | null>(null);
  const { active: isPremium, daysLeft: premiumDaysLeft, loading: premiumLoading } = usePremiumStatus();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const loadedTips = await loadTips();
      const loadedCoupons = await loadCoupons();
      const loadedHeroPick = await loadFeaturedPick();

      const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
      const now = Date.now();

      const visibleTips = loadedTips.filter(tip => {
        if (tip.status === 'upcoming') return true;
        if (tip.status === 'won' && tip.wonAt) {
          const wonTime = new Date(tip.wonAt).getTime();
          const hoursSinceWin = now - wonTime;
          return hoursSinceWin < EIGHT_HOURS_MS;
        }
        return false;
      });

      const visibleCoupons = loadedCoupons.filter(coupon => {
        // 🎯 ZAWSZE POKAZUJ KUPONY - BEZ BLOKADY PREMIUM!
        if (coupon.status === 'active' || coupon.status === 'pending') {
          return true; // ← ZAWSZE POKAZUJ!
        }
        if (coupon.status === 'won' && coupon.wonAt) {
          const wonTime = new Date(coupon.wonAt).getTime();
          const hoursSinceWin = now - wonTime;
          return hoursSinceWin < EIGHT_HOURS_MS;
        }
        return false;
      });

      const allWonTips = loadedTips.filter(tip => tip.status === 'won');
      const allWonCouponsList = loadedCoupons.filter(coupon => coupon.status === 'won');

      setTips(visibleTips);
      setRecentWins(allWonTips);
      setCoupons(visibleCoupons);
      setAllWonCoupons(allWonCouponsList);
      setHeroPick(loadedHeroPick);
    };

    fetchData();
  }, [isPremium]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 md:pb-0 relative overflow-hidden">
      {/* Synthwave glow effects */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
      <div className="fixed top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }} />

      {/* Modern Glass Header - Synthwave Style */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/80 via-[#150025]/80 to-[#0a0020]/80 border-b border-purple-500/20 shadow-xl shadow-black/30">
        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 md:gap-3">
            <Logo />
          </div>
          
          <div className="flex items-center gap-2 md:gap-2.5">
            <PremiumBadge active={isPremium} daysLeft={premiumDaysLeft} loading={premiumLoading} />
            
            <div className="hidden md:flex items-center gap-2">
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
              
              {user ? (
                <Button variant="ghost" size="sm" className="gap-2 text-purple-300/70 hover:text-pink-400 hover:bg-white/5 transition-all duration-200 rounded-full px-3 md:px-3.5 border border-transparent hover:border-pink-500/30" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs font-medium hidden lg:inline">{user.email?.split("@")[0]}</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-2 text-xs font-medium border-purple-500/30 text-purple-300 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all duration-200 rounded-full px-3 md:px-3.5 shadow-sm">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-10 md:space-y-14 relative z-10">
        
        {/* Hero Section with Today's Hot Tip */}
        <ScrollReveal>
          <div className="space-y-3 mb-8">
            <TodayHotTip />
          </div>
        </ScrollReveal>

        {/* Modern Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/5 backdrop-blur-xl border border-purple-500/20 p-1.5 w-full md:w-auto rounded-2xl shadow-xl shadow-black/20">
            <TabsTrigger value="tips" 
                        className="flex-1 md:flex-none gap-2 font-display text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-purple-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/30 rounded-xl py-3 transition-all duration-300 text-purple-300/70 hover:text-purple-200">
              <TrendingUp className="w-4 h-4" />
              Single Tips
            </TabsTrigger>
            <TabsTrigger value="coupons" 
                        className="flex-1 md:flex-none gap-2 font-display text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-purple-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/30 rounded-xl py-3 transition-all duration-300 text-purple-300/70 hover:text-purple-200">
              <Receipt className="w-4 h-4" />
              Coupons
            </TabsTrigger>
          </TabsList>

          {/* Tips Tab Content */}
          <TabsContent value="tips" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  All Tips
                </h2>
              </div>
              <span className="text-xs text-muted-foreground font-display uppercase tracking-wider bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-4 py-2 rounded-full border border-purple-500/20 font-medium">
                {tips.length} picks
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
              {tips.map((tip, i) => (
                <ScrollReveal key={tip.id} delay={i * 0.08}>
                  <TipCard tip={tip} userIsPremium={isPremium} />
                </ScrollReveal>
              ))}
            </div>

            {tips.length === 0 && (
              <div className="text-center py-20 md:py-28 space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 mx-auto flex items-center justify-center border border-purple-500/20">
                  <TrendingUp className="w-9 h-9 text-purple-400" />
                </div>
                <p className="text-muted-foreground font-display text-base font-medium">
                  No tips yet
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  Check back soon for new predictions
                </p>
              </div>
            )}
          </TabsContent>

          {/* Coupons Tab Content */}
          <TabsContent value="coupons" className="space-y-6">
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

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
              {coupons.map((coupon, i) => (
                <ScrollReveal key={coupon.id} delay={i * 0.08}>
                  <CouponCard coupon={coupon} userIsPremium={isPremium} />
                </ScrollReveal>
              ))}
            </div>

            {coupons.length === 0 && (
              <div className="text-center py-20 md:py-28 space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mx-auto flex items-center justify-center border border-blue-500/20">
                  <Receipt className="w-9 h-9 text-blue-400" />
                </div>
                <p className="text-muted-foreground font-display text-base font-medium">
                  No coupons yet
                </p>
                <p className="text-muted-foreground/60 text-sm">
                  Check back soon for new accumulators
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Recent Wins Section */}
        {(recentWins.length > 0 || allWonCoupons.length > 0 || heroPick?.status === 'won') && (
          <ScrollReveal>
            <RecentWins tips={recentWins} coupons={allWonCoupons} heroPick={heroPick} />
          </ScrollReveal>
        )}
      </main>

      {/* Modern Footer */}
      <footer className="border-t border-border/30 mt-20 pb-24 md:pb-0 bg-background/30 backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-10 flex flex-col items-center justify-center gap-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-purple-400 transition-colors underline underline-offset-4 decoration-purple-500/30 hover:decoration-purple-500/80 font-medium">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-purple-400 transition-colors underline underline-offset-4 decoration-purple-500/30 hover:decoration-purple-500/80 font-medium">
              Terms of Service
            </Link>
            <Link to="/deletion" className="text-xs text-muted-foreground hover:text-purple-400 transition-colors underline underline-offset-4 decoration-purple-500/30 hover:decoration-purple-500/80 font-medium">
              Delete Account
            </Link>
          </div>
          
          <a href="mailto:greatsportbets@gmail.com" 
             className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-pink-400 transition-colors group">
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            Help & Collaboration
          </a>
          
          <div className="pt-3 border-t border-border/20">
            <p className="text-xs text-muted-foreground/60 font-medium">
              © 2026 SureBet Guru. Built with 💜 for winners.
            </p>
          </div>
        </div>
      </footer>

      <BottomNav onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
