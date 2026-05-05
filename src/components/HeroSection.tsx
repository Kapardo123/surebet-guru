import { Zap, ChevronDown, ChevronUp, CheckCircle2, XCircle, MinusCircle, Flame, ThumbsUp } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick, incrementFeaturedReaction } from "@/lib/featuredPickStorage";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface HeroSectionProps {
  pick?: FeaturedPick;
}

const statusVariant = {
  upcoming: "outline" as const,
  won: "win" as const,
  lost: "loss" as const,
  draw: "draw" as const,
};

const statusLabel = {
  upcoming: "Upcoming",
  won: "Won ✓",
  lost: "Lost ✗",
  draw: "Draw",
};

const statusIcon = {
  upcoming: null,
  won: <CheckCircle2 className="w-4 h-4 text-success" />,
  lost: <XCircle className="w-4 h-4 text-loss" />,
  draw: <MinusCircle className="w-4 h-4 text-muted-foreground" />,
};

const HeroSection = ({ pick }: HeroSectionProps) => {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [localFire, setLocalFire] = useState(pick?.fireCount || 0);
  const [localLikes, setLocalLikes] = useState(pick?.likesCount || 0);
  const [reacted, setReacted] = useState<{fire: boolean, like: boolean}>({ fire: false, like: false });

  useEffect(() => {
    if (pick?.id) {
      const saved = localStorage.getItem(`featured_reaction_${pick.id}`);
      if (saved) setReacted(JSON.parse(saved));
      setLocalFire(pick.fireCount || 0);
      setLocalLikes(pick.likesCount || 0);
    }
  }, [pick?.id, pick?.fireCount, pick?.likesCount]);

  const handleReaction = async (type: 'fire' | 'like') => {
    if (!pick?.id || reacted[type]) return;

    const newReacted = { ...reacted, [type]: true };
    setReacted(newReacted);
    localStorage.setItem(`featured_reaction_${pick.id}`, JSON.stringify(newReacted));

    if (type === 'fire') setLocalFire(prev => prev + 1);
    else setLocalLikes(prev => prev + 1);

    await incrementFeaturedReaction(pick.id, type);
  };

  const data = pick || {
    league: "Premier League",
    kickoff: "20:00",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    prediction: "Over 2.5 Goals",
    odds: "1.85",
    confidence: "High",
    status: "upcoming" as const,
  };

  const currentStatus = data.status || "upcoming";

  const formatKickoff = (kickoffStr: string) => {
    if (!kickoffStr) return "";
    return String(kickoffStr).replace(/\[object Object\]/g, "").trim();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl glass gradient-border p-5 md:p-12">
      {/* Synthwave gradient mesh */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(circle, hsl(330 90% 60%), transparent 70%)" }}
          animate={{
            x: ["-10%", "15%", "-5%"],
            y: ["-20%", "10%", "-15%"],
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-25"
          style={{ background: "radial-gradient(circle, hsl(200 100% 60%), transparent 70%)" }}
          animate={{
            x: ["10%", "-15%", "5%"],
            y: ["20%", "-10%", "15%"],
          }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 w-[300px] h-[300px] rounded-full blur-[100px] opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 80% 55%), transparent 70%)" }}
          animate={{
            x: ["-50%", "-30%", "-60%"],
            y: ["-50%", "-30%", "-60%"],
          }}
          transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(330 90% 60% / 0.4) 1px, transparent 1px),
              linear-gradient(90deg, hsl(200 100% 60% / 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-accent/15 text-accent px-2.5 py-1 rounded-full">
              <Zap className="w-3 h-3 md:w-3.5 md:h-3.5 animate-pulse-glow" />
              <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider">Featured Pick</span>
            </div>
          </div>
          {currentStatus !== "upcoming" && (
            <Badge variant={statusVariant[currentStatus]} className="gap-1.5 py-1.5 px-3">
              {statusIcon[currentStatus]}
              <span className="font-display font-bold uppercase tracking-wider text-[10px] md:text-xs">
                {statusLabel[currentStatus]}
              </span>
            </Badge>
          )}
        </div>

        <h1 className="font-display text-2xl md:text-6xl font-bold mb-1 md:mb-2 tracking-tight">
          <span className="text-gradient">Today's Hot Tip</span>
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mb-5 md:mb-8">Our highest confidence pick for today</p>

        <div className="space-y-3 md:space-y-4">
          <p className="text-muted-foreground text-[10px] md:text-xs uppercase tracking-[0.2em]">
            {data.league} • {formatKickoff(data.kickoff)}
          </p>
          <div className="flex items-center gap-2.5 md:gap-4">
            <TeamLogo teamName={data.homeTeam} logoUrl={data.homeTeamLogo} size={28} />
            <p className="font-display text-lg md:text-4xl font-bold text-foreground tracking-tight">
              {data.homeTeam} <span className="text-muted-foreground font-normal text-sm md:text-4xl">vs</span> {data.awayTeam}
            </p>
            <TeamLogo teamName={data.awayTeam} logoUrl={data.awayTeamLogo} size={28} />
          </div>
          
          {/* Analysis / Description Toggle */}
          {data.description && (
            <div className="mt-4">
              <button 
                onClick={() => setShowAnalysis(!showAnalysis)}
                className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-accent hover:text-accent/80 transition-colors"
              >
                {showAnalysis ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Hide Analysis
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    View Analysis
                  </>
                )}
              </button>
              <AnimatePresence>
                {showAnalysis && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 rounded-xl bg-accent/10 border border-accent/20 max-w-2xl backdrop-blur-sm">
                      <p className="text-xs md:text-sm text-muted-foreground leading-relaxed italic whitespace-pre-wrap">
                        "{data.description}"
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div className="flex items-center gap-4 md:gap-6 mt-4 md:mt-6">
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-0.5">Prediction</p>
              <p className="font-display font-bold text-primary text-sm md:text-lg">{data.prediction}</p>
            </div>
            <div className="h-8 md:h-10 w-px bg-border" />
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-0.5">Odds</p>
              <p className="font-display font-bold text-accent text-sm md:text-lg">{data.odds}</p>
            </div>
            <div className="h-8 md:h-10 w-px bg-border" />
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-0.5">Confidence</p>
                <p className="font-display font-bold text-success text-sm md:text-lg">{data.confidence}</p>
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                <button 
                  onClick={(e) => { e.preventDefault(); handleReaction('like'); }}
                  className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all duration-300 ${reacted.like ? 'bg-primary/25 text-primary ring-2 ring-primary/50' : 'bg-white/5 text-white/60 hover:bg-primary/10 hover:text-primary hover:scale-105 active:scale-95'}`}
                >
                  <motion.div
                    animate={reacted.like ? { scale: [1, 1.5, 1], rotate: [0, -15, 0] } : {}}
                    transition={{ duration: 0.5, ease: "backOut" }}
                  >
                    <ThumbsUp className={`w-5 h-5 md:w-6 md:h-6 ${reacted.like ? 'fill-primary' : 'group-hover:fill-primary/20'}`} />
                  </motion.div>
                  <span className="font-display font-black text-base md:text-xl">{localLikes}</span>
                  
                  {reacted.like && (
                    <motion.span
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -40, scale: 1.5 }}
                      className="absolute top-0 left-1/2 -translate-x-1/2 text-primary font-bold text-sm pointer-events-none"
                    >
                      +1
                    </motion.span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
