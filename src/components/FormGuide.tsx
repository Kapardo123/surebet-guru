import { Tip } from "@/components/TipCard";

const cell: Record<string, string> = {
  won: "bg-success text-background",
  lost: "bg-red text-background",
  draw: "bg-draw text-background",
};
const letter: Record<string, string> = { won: "W", lost: "L", draw: "D" };

/** Recent results as W/L/D boxes, the way league tables show a team's form. */
const FormGuide = ({ tips }: { tips: Tip[] }) => {
  const settled = tips
    .filter((t) => t.status !== "upcoming")
    .sort((a, b) => (b.kickoff || "").localeCompare(a.kickoff || ""))
    .slice(0, 8);
  if (settled.length === 0) return null;

  const won = settled.filter((t) => t.status === "won").length;
  const rate = Math.round((won / settled.length) * 100);

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-foreground">
      <div className="flex items-center gap-3 min-w-0">
        <span className="label text-foreground shrink-0">Form</span>
        <div className="flex gap-1" aria-label={`Last ${settled.length} results`}>
          {settled.map((t) => (
            <span
              key={t.id}
              title={`${t.homeTeam} v ${t.awayTeam}: ${t.status}`}
              className={`w-6 h-6 grid place-items-center font-display font-black text-[15px] leading-none ${cell[t.status]}`}
            >
              {letter[t.status]}
            </span>
          ))}
        </div>
      </div>
      <p className="shrink-0 text-right leading-none">
        <span className="num font-black text-[26px]">{rate}%</span>
        <span className="block font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground mt-1">
          {won} from {settled.length}
        </span>
      </p>
    </div>
  );
};

export default FormGuide;
