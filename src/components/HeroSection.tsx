import { Zap, ChevronDown, ChevronUp, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import TeamLogo from "@/components/TeamLogo";
import { motion, AnimatePresence } from "framer-motion";
import { FeaturedPick } from "@/lib/featuredPickStorage";
import { useState } from "react";
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
          <div className="pt-4">
            <button 
              onClick={() => setShowAnalysis(!showAnalysis)}
              className="flex items-center gap-2 text-xs md:text-sm font-bold uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
            >
              {showAnalysis ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide Match Analysis
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  View Match Analysis
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
                  <div className="mt-4 p-4 md:p-6 rounded-2xl bg-white/5 border border-white/10 space-y-6">
                    {/* Form Section */}
                    {(() => {
                      try {
                        if (data.description?.startsWith('{')) {
                          const parsedData = JSON.parse(data.description);
                          if (parsedData.homeForm || parsedData.awayForm) {
                            const FormBadge = ({ res }: { res: string }) => {
                              const colors = {
                                'W': 'bg-success text-success-foreground',
                                'D': 'bg-yellow-500 text-white',
                                'L': 'bg-loss text-white',
                                'U': 'bg-muted text-muted-foreground'
                              };
                              return (
                                <span className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${colors[res as keyof typeof colors] || colors.U}`}>
                                  {res}
                                </span>
                              );
                            };

                            return (
                              <div className="space-y-4 pb-4 border-b border-white/10">
                                <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/40">Team Form (Last 5)</p>
                                <div className="flex justify-between items-center gap-8">
                                  <div className="flex flex-col gap-2 flex-1">
                                    <span className="text-xs md:text-sm font-bold text-white truncate">{data.homeTeam}</span>
                                    <div className="flex gap-1.5">
                                      {parsedData.homeForm?.map((r: string, i: number) => <FormBadge key={i} res={r} />)}
                                    </div>
                                  </div>
                                  <div className="w-px h-12 bg-white/10" />
                                  <div className="flex flex-col gap-2 flex-1 items-end text-right">
                                    <span className="text-xs md:text-sm font-bold text-white truncate">{data.awayTeam}</span>
                                    <div className="flex gap-1.5">
                                      {parsedData.awayForm?.map((r: string, i: number) => <FormBadge key={i} res={r} />)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        }
                      } catch (e) {}
                      return null;
                    })()}

                    {/* Actual Description Text */}
                    <div className="space-y-2">
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-white/40">Expert Analysis</p>
                      <p className="text-xs md:text-lg text-white/80 leading-relaxed font-light whitespace-pre-wrap italic">
                        "{(() => {
                          try {
                            if (data.description?.startsWith('{')) {
                              return JSON.parse(data.description).text;
                            }
                          } catch (e) {}
                          return data.description || "No analysis available for this pick.";
                        })()}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            <div>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-0.5">Confidence</p>
              <p className="font-display font-bold text-success text-sm md:text-lg">{data.confidence}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
