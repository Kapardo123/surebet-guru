import { ReactNode } from "react";

/** Newspaper section heading: small caps label running into a rule. */
const SectionHead = ({ children, right, tone = "ink" }: { children: ReactNode; right?: ReactNode; tone?: "ink" | "red" }) => (
  <div className="flex items-center gap-3">
    <h2 className={`font-mono text-[11px] font-semibold uppercase tracking-[0.14em] shrink-0 ${tone === "red" ? "text-red" : "text-foreground"}`}>
      {children}
    </h2>
    <span className="h-px flex-1 bg-foreground/80" aria-hidden />
    {right && <span className="shrink-0">{right}</span>}
  </div>
);

export default SectionHead;
