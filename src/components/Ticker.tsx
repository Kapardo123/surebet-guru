import { Tip } from "@/components/TipCard";
import { kickoffParts } from "@/lib/format";

/** Red news-ticker strip that loops through today's open picks. */
const Ticker = ({ tips, userIsPremium }: { tips: Tip[]; userIsPremium: boolean }) => {
  const open = tips.filter((t) => t.status === "upcoming");
  if (open.length === 0) return null;

  const items = open.map((t) => {
    const locked = t.isPremium && !userIsPremium;
    return (
      <span key={t.id} className="inline-flex items-center gap-2 pr-8">
        <span className="opacity-75">{kickoffParts(t.kickoff).time}</span>
        <span className="font-semibold">{t.homeTeam} v {t.awayTeam}</span>
        <span className="opacity-75">—</span>
        {locked ? (
          <span className="bg-background text-red px-1">Members' pick</span>
        ) : (
          <span>
            {t.prediction} <span className="font-semibold">@ {t.odds.toFixed(2)}</span>
          </span>
        )}
        <span className="pl-6 opacity-60" aria-hidden>■</span>
      </span>
    );
  });

  return (
    <div className="ticker flex items-stretch bg-red text-background font-mono text-[12.5px] uppercase tracking-[0.04em] overflow-hidden h-9" aria-label="Today's open picks">
      <span className="shrink-0 flex items-center px-3 bg-foreground text-background font-semibold tracking-[0.1em] z-10">
        Live card
      </span>
      <div className="relative flex-1 overflow-hidden flex items-center">
        <div
          className="ticker-track flex whitespace-nowrap will-change-transform"
          style={{ ["--ticker-duration" as string]: `${Math.max(18, open.length * 9)}s` }}
        >
          <div className="flex shrink-0 pl-4">{items}</div>
          <div className="flex shrink-0 pl-4" aria-hidden>{items}</div>
        </div>
      </div>
    </div>
  );
};

export default Ticker;
