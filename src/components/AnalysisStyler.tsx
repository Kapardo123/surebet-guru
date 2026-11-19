import { useState } from "react";
import { Loader2, Sparkles, Undo2, Info } from "lucide-react";
import { EDIT_MODES, EditMode, styleAnalysis } from "@/lib/aiStyle";
import { tipsterById } from "@/lib/tipsters";

/**
 * AI editing of a tip's analysis in the chosen tipster's voice, under the
 * analysis field of the admin form. The previous text can be restored.
 */
const AnalysisStyler = ({
  text,
  tipster,
  match,
  onApply,
}: {
  text: string;
  tipster: string;
  match: Parameters<typeof styleAnalysis>[0]["match"];
  onApply: (text: string) => void;
}) => {
  const [busy, setBusy] = useState<EditMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ gaps: string[]; removed: string[] } | null>(null);
  const t = tipsterById(tipster);
  const tooShort = text.trim().length < 30;

  const run = async (mode: EditMode) => {
    if (!t || busy) return;
    setBusy(mode);
    setError(null);
    try {
      const res = await styleAnalysis({ text, tipster: t.id, mode, match });
      setPrevious(text);
      onApply(res.analysis);
      setNotes({ gaps: res.gaps, removed: res.removed });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.03] p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" style={{ color: t?.color }} />
          {t ? (
            <>
              Write as <span style={{ color: t.color }}>{t.nick}</span>
            </>
          ) : (
            "Pick the tipster above to edit in their voice"
          )}
        </p>
        {previous !== null && (
          <button
            type="button"
            onClick={() => {
              onApply(previous);
              setPrevious(null);
              setNotes(null);
            }}
            className="h-7 px-2.5 rounded-full bg-white/[0.08] text-[11px] font-bold flex items-center gap-1"
          >
            <Undo2 className="w-3.5 h-3.5" /> Undo
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {EDIT_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            disabled={!t || tooShort || !!busy}
            onClick={() => run(m.id)}
            className="h-9 rounded-full text-[12px] font-bold flex items-center justify-center gap-1.5 border transition-colors disabled:opacity-40"
            style={t ? { borderColor: `${t.color}66`, background: `${t.color}1a` } : undefined}
          >
            {busy === m.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {m.label}
          </button>
        ))}
      </div>

      {t && tooShort && <p className="text-[11px] text-muted-foreground">Write or import a sentence or two first.</p>}
      {error && <p className="text-[12px] text-red">{error}</p>}

      {notes && (notes.gaps.length > 0 || notes.removed.length > 0) && (
        <div className="text-[11.5px] leading-snug space-y-1 text-muted-foreground">
          {notes.gaps.length > 0 && (
            <p className="flex gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                {t?.nick} would usually also use: {notes.gaps.join("; ")}. Add them if you have them; the AI didn't make them up.
              </span>
            </p>
          )}
          {notes.removed.length > 0 && <p>Left out: {notes.removed.join("; ")}.</p>}
        </div>
      )}
    </div>
  );
};

export default AnalysisStyler;
