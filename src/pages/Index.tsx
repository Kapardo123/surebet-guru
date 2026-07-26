import { useState, useEffect } from "react";
import TipCard from "@/components/TipCard";
import CouponCard from "@/components/CouponCard";
import DailySpin from "@/components/DailySpin";
import TodayHotTip from "@/components/TodayHotTip";
import BottomNav from "@/components/BottomNav";
import { loadTips } from "@/lib/tipsStorage";
import { loadCoupons, Coupon } from "@/lib/couponStorage";
import { loadFeaturedPick, FeaturedPick } from "@/lib/featuredPickStorage";
import { Tip } from "@/components/TipCard";
import { Gem, Crosshair, Ticket, ArrowRightToLine, ArrowLeftFromLine, Sparkles, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import PremiumBadge from "@/components/PremiumBadge";
import FilterBar, { PremiumFilter } from "@/components/FilterBar";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ScrollReveal from "@/components/ScrollReveal";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState("tips");
  const [tipSport, setTipSport] = useState("All");
  const [tipPremium, setTipPremium] = useState<PremiumFilter>("all");
  const [couponPremium, setCouponPremium] = useState<PremiumFilter>("all");
  const [heroPick, setHeroPick] = useState<FeaturedPick | null>(null);
  const [freeTip, setFreeTip] = useState<Tip | null>(null);
  const [allLoadedTips, setAllLoadedTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const { active: isPremium, daysLeft: premiumDaysLeft, loading: premiumLoading } = usePremiumStatus();
  const { user, signOut, loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      const loadedTips = await loadTips();
      const loadedCoupons = await loadCoupons();
      const loadedHeroPick = await loadFeaturedPick();

      const TIP_EXPIRY_MS = 8 * 60 * 60 * 1000;   // mecze: po 8h znikaja i sa TRWALE usuwane
      const COUPON_WINDOW_MS = 12 * 60 * 60 * 1000; // kupony: bez zmian (okno 12h)
      const now = Date.now();

      // Bezpiecznik widoku - wlasciwe usuwanie (baza + cache) robi purgeExpiredTips w loadTips().
      const visibleTips = loadedTips.filter(tip => {
        if (tip.status === 'upcoming') {
          const kickoffTime = new Date(tip.kickoff).getTime();
          if (!isNaN(kickoffTime) && now - kickoffTime > TIP_EXPIRY_MS) return false;
          return true;
        }
        if (tip.status === 'won' && tip.wonAt) {
          const wonTime = new Date(tip.wonAt).getTime();
          return (now - wonTime) < TIP_EXPIRY_MS;
        }
        return false;
      }).sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || ""));

      const visibleCoupons = loadedCoupons.filter(coupon => {
        if (coupon.status === 'active' || coupon.status === 'pending') return true;
        if (coupon.status === 'won' && coupon.wonAt) {
          return (now - new Date(coupon.wonAt).getTime()) < COUPON_WINDOW_MS;
        }
        return false;
      });

      setTips(visibleTips);
      setAllLoadedTips(loadedTips);
      setCoupons(visibleCoupons);
      setHeroPick(loadedHeroPick);
      setLoading(false);
    };

    fetchData();
  }, [isPremium]);

  const tipSports = Array.from(
    new Set(tips.map((t) => t.sport).filter(Boolean) as string[])
  ).sort();

  const filteredTips = tips.filter((tip) => {
    if (tipSport !== "All" && tip.sport !== tipSport) return false;
    if (tipPremium === "premium" && !tip.isPremium) return false;
    if (tipPremium === "free" && tip.isPremium) return false;
    return true;
  });

  const filteredCoupons = coupons.filter((coupon) => {
    if (couponPremium === "premium" && !coupon.isPremium) return false;
    if (couponPremium === "free" && coupon.isPremium) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 md:pb-0 relative overflow-hidden">
      {/* Synthwave glow effects */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
      <div className="fixed top-1/2 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none" 
           style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }} />

      {/* Glass Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl border-b border-white/[0.06] shadow-2xl shadow-black/40"
        style={{ background: "linear-gradient(135deg, rgba(10,0,21,0.85) 0%, rgba(21,0,37,0.9) 50%, rgba(10,0,32,0.85) 100%)" }}>
        {/* Top accent line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />
        
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          
          <div className="flex items-center gap-2">
            <PremiumBadge active={isPremium} daysLeft={premiumDaysLeft} loading={premiumLoading} />
            
            {/* Mobile: small icon buttons */}
            <div className="flex md:hidden items-center gap-1.5">
              {!isPremium && (
                <Link to="/premium">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20 flex items-center justify-center">
                    <Gem className="w-4 h-4 text-pink-400" />
                  </div>
                </Link>
              )}
              {user ? (
                <button onClick={signOut} className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <ArrowLeftFromLine className="w-4 h-4 text-white/60" />
                </button>
              ) : (
                <Link to="/auth">
                  <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                    <ArrowRightToLine className="w-4 h-4 text-white/60" />
                  </div>
                </Link>
              )}
            </div>
            
            {/* Desktop: full buttons */}
            <div className="hidden md:flex items-center gap-2">
              {!isPremium && (
                <Link to="/premium">
                  <Button size="sm" 
                          className="gap-1.5 font-bold uppercase tracking-wider text-[11px] text-white rounded-full px-5 py-2 border border-white/10 relative overflow-hidden group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-pink-500/20"
                          style={{ background: "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #06b6d4 100%)" }}>
                    <Gem className="w-3.5 h-3.5" />
                    Go Premium
                  </Button>
                </Link>
              )}
              
              {user ? (
                <Button variant="ghost" size="sm" className="gap-2 text-white/50 hover:text-white hover:bg-white/[0.06] transition-all duration-200 rounded-full px-3 border border-transparent hover:border-white/10" onClick={signOut}>
                  <ArrowLeftFromLine className="w-4 h-4" />
                  <span className="text-xs font-medium hidden lg:inline">{user.email?.split("@")[0]}</span>
                </Button>
              ) : (
                <Link to="/auth">
                  <Button size="sm" className="gap-2 text-xs font-semibold rounded-full px-4 py-2 bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/[0.1] border border-white/10 hover:border-white/20 transition-all duration-200">
                    <ArrowRightToLine className="w-4 h-4" />
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] p-1.5 w-full md:w-auto rounded-2xl shadow-lg shadow-black/10">
            <TabsTrigger value="tips" 
                        className="flex-1 md:flex-none gap-2 font-display text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-purple-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/20 rounded-xl py-3 transition-all duration-300 text-white/40 hover:text-white/70">
              <Crosshair className="w-4 h-4" />
              Single Tips
            </TabsTrigger>
            <TabsTrigger value="coupons" 
                        className="flex-1 md:flex-none gap-2 font-display text-xs uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:via-purple-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/20 rounded-xl py-3 transition-all duration-300 text-white/40 hover:text-white/70">
              <Ticket className="w-4 h-4" />
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
              <span className="text-xs text-white/40 font-display uppercase tracking-wider bg-white/[0.04] px-4 py-2 rounded-full border border-white/[0.06] font-medium">
                {filteredTips.length} picks
              </span>
            </div>

            {tipSports.length > 0 && (
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-3 md:p-4 shadow-lg shadow-black/5">
                <FilterBar
                  sports={tipSports}
                  activeSport={tipSport}
                  onSportChange={setTipSport}
                  activePremium={tipPremium}
                  onPremiumChange={setTipPremium}
                  totalItems={tips.length}
                  filteredItems={filteredTips.length}
                  accent="purple"
                />
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-${i}`} className="rounded-2xl border border-purple-500/10 bg-white/[0.03] p-4 space-y-4 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 rounded-full bg-white/5" />
                      <div className="h-5 w-20 rounded-full bg-white/5" />
                    </div>
                    <div className="flex items-center justify-center gap-4 py-3">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-white/5" />
                        <div className="h-4 w-20 rounded bg-white/5" />
                      </div>
                      <div className="h-5 w-8 rounded bg-white/5" />
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-white/5" />
                        <div className="h-4 w-20 rounded bg-white/5" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 h-12 rounded-lg bg-white/5" />
                      <div className="flex-1 h-12 rounded-lg bg-white/5" />
                    </div>
                  </div>
                ))
              ) : filteredTips.map((tip, i) => (
                <ScrollReveal key={tip.id} delay={i * 0.08}>
                  <TipCard tip={tip} userIsPremium={isPremium} />
                </ScrollReveal>
              ))}
            </div>

            {filteredTips.length === 0 && (
              <div className="text-center py-20 md:py-28 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] mx-auto flex items-center justify-center border border-white/[0.06]">
                  <Crosshair className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-white/40 font-display text-base font-medium">
                  No tips yet
                </p>
                <p className="text-white/20 text-sm">
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
              <span className="text-xs text-white/40 font-display uppercase tracking-wider bg-white/[0.04] px-4 py-2 rounded-full border border-white/[0.06] font-medium">
                {filteredCoupons.length} coupons
              </span>
            </div>

            {coupons.length > 0 && (
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-3 md:p-4 shadow-lg shadow-black/5">
                <FilterBar
                  activePremium={couponPremium}
                  onPremiumChange={setCouponPremium}
                  totalItems={coupons.length}
                  filteredItems={filteredCoupons.length}
                  accent="blue"
                />
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-c-${i}`} className="rounded-2xl border border-blue-500/10 bg-white/[0.03] p-4 space-y-3 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-16 rounded-full bg-white/5" />
                      <div className="h-5 w-24 rounded-full bg-white/5" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-white/5" />
                      <div className="h-4 w-3/4 rounded bg-white/5" />
                      <div className="h-4 w-5/6 rounded bg-white/5" />
                    </div>
                    <div className="flex justify-between">
                      <div className="h-6 w-20 rounded-full bg-white/5" />
                      <div className="h-6 w-16 rounded bg-white/5" />
                    </div>
                  </div>
                ))
              ) : filteredCoupons.map((coupon, i) => (
                <ScrollReveal key={coupon.id} delay={i * 0.08}>
                  <CouponCard coupon={coupon} userIsPremium={isPremium} />
                </ScrollReveal>
              ))}
            </div>

            {filteredCoupons.length === 0 && (
              <div className="text-center py-20 md:py-28 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] mx-auto flex items-center justify-center border border-white/[0.06]">
                  <Ticket className="w-7 h-7 text-white/20" />
                </div>
                <p className="text-white/40 font-display text-base font-medium">
                  No coupons yet
                </p>
                <p className="text-white/20 text-sm">
                  Check back soon for new accumulators
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Daily Spin - spin requires login */}
        <ScrollReveal>
          <DailySpin
            isLoggedIn={!!user}
            userId={user?.id}
            onFreeTip={() => {
              const premiumTips = allLoadedTips.filter((t) => t.isPremium && t.status === "upcoming");
              if (premiumTips.length > 0) {
                const random = premiumTips[Math.floor(Math.random() * premiumTips.length)];
                setFreeTip(random);
              } else {
                // Fallback: show any upcoming tip
                const anyTips = allLoadedTips.filter((t) => t.status === "upcoming");
                if (anyTips.length > 0) {
                  const random = anyTips[Math.floor(Math.random() * anyTips.length)];
                  setFreeTip(random);
                }
              }
            }}
          />
        </ScrollReveal>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] mt-20 pb-24 md:pb-0 bg-white/[0.01] backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto px-4 py-10 flex flex-col items-center justify-center gap-5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-white/30 font-medium">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-white/30 font-medium">
              Terms of Service
            </Link>
            <Link to="/deletion" className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-4 decoration-white/10 hover:decoration-white/30 font-medium">
              Delete Account
            </Link>
          </div>
          
          <a href="mailto:greatsportbets@gmail.com" 
             className="inline-flex items-center gap-2 text-xs text-white/25 hover:text-white/50 transition-colors group">
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            Help & Collaboration
          </a>
          
          <div className="pt-3 border-t border-white/[0.04]">
            <p className="text-xs text-white/20 font-medium">
              © 2026 Great Sport Bets
            </p>
          </div>
        </div>
      </footer>

      {/* First-visit login prompt - shown once */}
      {!user && !authLoading && !localStorage.getItem("gsb_spin_prompt_dismissed") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-[#0d001a] via-[#12001f] to-[#0a0015] border border-white/10 rounded-2xl p-6 max-w-xs w-full shadow-2xl shadow-black/50 text-center space-y-4"
          >
            <span className="text-5xl">🎰</span>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Win Free Tips!</h3>
              <p className="text-xs text-white/40 mt-1">Log in or create an account to spin the wheel and win premium tips every day.</p>
            </div>
            <div className="space-y-2">
              <Link to="/auth">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3 rounded-full font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)" }}
                >
                  <ArrowRightToLine className="w-4 h-4 inline mr-2" />
                  Log in &amp; Spin
                </motion.button>
              </Link>
              <button
                onClick={() => {
                  try { localStorage.setItem("gsb_spin_prompt_dismissed", "1"); } catch {}
                  window.location.reload();
                }}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Free Tip Modal */}
      {freeTip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setFreeTip(null)}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-[#0d001a] via-[#12001f] to-[#0a0015] border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-4xl">🎁</span>
              <h3 className="font-display text-lg font-bold text-pink-400 mt-2">Free Premium Tip!</h3>
              <p className="text-xs text-white/40">You won a premium tip from the wheel!</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] text-pink-400 border-pink-500/30">{freeTip.sport}</Badge>
                <span className="text-[10px] text-white/40">{freeTip.league}</span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-sm">{freeTip.homeTeam}</span>
                <span className="text-xs text-white/30">vs</span>
                <span className="font-bold text-sm">{freeTip.awayTeam}</span>
              </div>
              <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-xs font-semibold">{freeTip.prediction}</span>
                <span className="text-sm font-black text-pink-400">@ {freeTip.odds.toFixed(2)}</span>
              </div>
              {freeTip.description && (
                <p className="text-[11px] text-white/30 leading-relaxed italic border-t border-white/[0.05] pt-2 mt-1">
                  "{freeTip.description}"
                </p>
              )}
              <div className="flex items-center gap-1 text-[10px] text-white/30">
                <Timer className="w-3 h-3" />
                {(() => {
                  try {
                    const d = new Date(freeTip.kickoff);
                    return !isNaN(d.getTime())
                      ? d.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : String(freeTip.kickoff);
                  } catch { return String(freeTip.kickoff); }
                })()}
              </div>
            </div>
            <button
              onClick={() => setFreeTip(null)}
              className="w-full mt-4 py-2.5 rounded-full font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #a855f7 100%)" }}
            >
              Nice, thanks! 🎉
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Index;
