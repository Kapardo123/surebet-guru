import { useState, useEffect } from "react";
import PageTransition from "@/components/PageTransition";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import RecentWins from "@/components/RecentWins";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { Tip } from "@/components/TipCard";
import { Settings, Crown, TrendingUp, Receipt, LogIn, LogOut, Gift } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("tips");
  const [recentWins, setRecentWins] = useState<Tip[]>([]);
  const { active: isPremium, daysLeft: premiumDaysLeft, loading: premiumLoading } = usePremiumStatus();
  const { user, signOut } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const loadedTips = await loadTips();
      const loadedCoupons = await loadCoupons();
      
      const activeTips = loadedTips.filter(tip => tip.status === 'upcoming');
      const wonTips = loadedTips.filter(tip => tip.status === 'won');
      
      setTips(activeTips);
      setRecentWins(wonTips);
      setCoupons(loadedCoupons);
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 relative">
      {/* <ParticleBackground /> */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <PremiumBadge active={isPremium} daysLeft={premiumDaysLeft} loading={premiumLoading} />
            <Link to="/referral">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Gift className="w-4 h-4" />
              </Button>
            </Link>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/premium">
                <Button size="sm" className="gap-1.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:from-accent/90 hover:to-accent/70 shadow-lg shadow-accent/20 font-display text-xs uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5" />
                  Go Premium
                </Button>
              </Link>
              {user ? (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={signOut}>
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs">{user.email?.split("@")[0]}</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-8 md:space-y-10">
        <ScrollReveal>
          <TodayHotTip />
        </ScrollReveal>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 border border-border/50 p-1 w-full md:w-auto">
            <TabsTrigger value="tips" className="flex-1 md:flex-none gap-1.5 font-display text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              Single Tips
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex-1 md:flex-none gap-1.5 font-display text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Receipt className="w-3.5 h-3.5" />
              Coupons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tips" className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                All Tips
              </h2>
              <span className="text-[10px] md:text-xs text-muted-foreground font-display uppercase tracking-wider bg-muted px-2.5 py-1 rounded-full">
                {tips.length} picks
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {tips.map((tip, i) => (
                <ScrollReveal key={tip.id} delay={i * 0.08}>
                  <TipCard tip={tip} userIsPremium={isPremium} />
                </ScrollReveal>
              ))}
            </div>

            {tips.length === 0 && (
              <div className="text-center py-16 md:py-20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-display text-sm">
                  No tips yet. Check back soon.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="coupons" className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
                All Coupons
              </h2>
              <span className="text-[10px] md:text-xs text-muted-foreground font-display uppercase tracking-wider bg-muted px-2.5 py-1 rounded-full">
                {coupons.length} coupons
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {coupons.map((coupon, i) => (
                <ScrollReveal key={coupon.id} delay={i * 0.08}>
                  <CouponCard coupon={coupon} userIsPremium={isPremium} />
                </ScrollReveal>
              ))}
            </div>

            {coupons.length === 0 && (
              <div className="text-center py-16 md:py-20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-display text-sm">
                  No coupons yet. Check back soon.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {recentWins.length > 0 && (
          <ScrollReveal>
            <RecentWins tips={recentWins} />
          </ScrollReveal>
        )}
      </main>

      <footer className="border-t border-border/50 mt-16 pb-24 md:pb-0">
        <div className="container max-w-5xl mx-auto px-4 py-8 flex flex-col items-center justify-center gap-4 text-center">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
            <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              Terms of Service
            </Link>
            <Link to="/deletion" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
              Delete Account
            </Link>
          </div>
          <a href="mailto:greatsportbets@gmail.com" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Help & Collaboration: greatsportbets@gmail.com
          </a>
          <p className="text-xs text-muted-foreground">© 2026 Great Sport Bets. Built for winners.</p>
        </div>
      </footer>

      <BottomNav onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
