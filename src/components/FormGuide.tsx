import { Tip } from "@/components/TipCard";

const chip: Record<string, string> = {
  won: "foil-gold text-stock-ink",
  lost: "bg-red text-white",
  draw: "bg-white/25 text-white",
};
const letter: Record<string, string> = { won: "W", lost: "L", draw: "P" };

/** Recent results as a row of small tokens, newest first. */
const FormGuide = ({ tips }: { tips: Tip[] }) => {
  const settled = tips
    .filter((t) => t.status !== "upcoming")
    .sort((a, b) => (b.kickoff || "").localeCompare(a.kickoff || ""))
    .slice(0, 8);
  if (settled.length === 0) return null;
  const won = settled.filter((t) => t.status === "won").length;

  return (
    <div className="flex items-center justify-between gap-3 rounded-full bg-white/[0.05] border border-white/[0.07] pl-4 pr-2 h-12">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="label shrink-0">Form</span>
        <div className="flex gap-1">
          {settled.map((t) => (
            <span key={t.id} title={`${t.homeTeam} v ${t.awayTeam}`} className={`w-6 h-6 rounded-full grid place-items-center font-display font-black text-[10.5px] ${chip[t.status]}`}>
              {letter[t.status]}
            </span>
          ))}
        </div>
      </div>
      <span className="shrink-0 h-8 px-3 rounded-full bg-white/[0.08] grid place-items-center text-[13px] font-semibold">
        {won}/{settled.length} won
      </span>
    </div>
  );
};

export default FormGuide;
