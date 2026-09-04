import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import PageTransition from "@/components/PageTransition";
import YesterdayResults from "@/components/YesterdayResults";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

const Results = () => {
  const { active: isPremium } = usePremiumStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0015] via-[#150025] to-[#0a0020] pb-20 md:pb-0 relative overflow-hidden">
      {/* Synthwave glow effects */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
      <div className="fixed top-1/2 right-1/3 w-[400px] h-[400px] rounded-full blur-[100px] opacity-10 pointer-events-none"
           style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }} />

      {/* Glass Header */}
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-r from-[#0a0015]/80 via-[#150025]/80 to-[#0a0020]/80 border-b border-purple-500/20 shadow-xl shadow-black/30">
        <div className="container max-w-6xl mx-auto px-3 md:px-4 py-3 md:py-3.5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 md:gap-3">
            <Logo />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors px-3 py-2 rounded-full bg-white/[0.06] border border-white/10 hover:border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6 md:py-10 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 bg-gradient-to-b from-amber-500 to-pink-500 rounded-full" />
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Yesterday's Results
          </h2>
        </div>
        <YesterdayResults userIsPremium={isPremium} />
      </main>

      {/* Mobile bottom spacing for BottomNav */}
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default Results;