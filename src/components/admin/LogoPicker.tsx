import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TeamLogo from "@/components/TeamLogo";
import { fetchTeamLogoCandidates, LogoCandidate, saveCustomTeamLogo } from "@/lib/logoFetcher";

const SearchIconSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

/** Kompaktowy picker logo: lupa → kandydaci z progresywnym ładowaniem → wybór, plus upload własnego pliku. */
const LogoPicker = ({ label, teamName, value, onChange }: {
  label: string;
  teamName: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<LogoCandidate[]>([]);

  const run = async () => {
    if (!teamName || teamName.trim().length < 3) {
      toast({ title: `Najpierw wpisz nazwę drużyny (${label})`, variant: "destructive" });
      return;
    }
    setLoading(true);
    setCandidates([]);
    try {
      const result = await fetchTeamLogoCandidates(teamName, (partial) => {
        if (partial.length) setCandidates(partial);
      });
      setCandidates(result);
      if (!result.length) {
        toast({ title: `Brak wyników dla „${teamName}"`, description: "Wgraj własny plik (↑)." });
      }
    } finally {
      setLoading(false);
    }
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Plik jest za duży (max 2MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      saveCustomTeamLogo(teamName, dataUrl);
      onChange(dataUrl);
      toast({ title: "Logo zapisane ✅" });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted/40 ring-1 ring-border/40 flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? (
            <img src={value} alt="" className="w-6 h-6 object-contain" />
          ) : (
            <TeamLogo teamName={teamName || "?"} logoUrl={null} size={16} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase text-muted-foreground font-bold">{label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{teamName || "—"}</p>
        </div>
        <Button type="button" size="sm" variant="outline" className="h-7 w-7 p-0" onClick={run} disabled={loading || !teamName} title="Szukaj logo">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <SearchIconSvg />}
        </Button>
        <label
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground"
          title="Wgraj własny plik"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-15" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
          <input type="file" accept="image/*" className="hidden" onChange={pickFile} />
        </label>
        {value && (
          <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onChange(null)} title="Usuń logo">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      {candidates.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/20 rounded-lg border border-border/40">
          {candidates.map((c, i) => (
            <button
              key={`${c.url}-${i}`}
              type="button"
              className="w-10 h-10 rounded-lg bg-background border border-border/40 hover:ring-2 hover:ring-pink-500/50 flex items-center justify-center p-1"
              onClick={() => { onChange(c.url); setCandidates([]); }}
              title={`${c.source} — ${c.teamName}`}
            >
              <img src={c.url} alt="" className="max-w-full max-h-full object-contain" />
            </button>
          ))}
          <button type="button" className="text-[9px] text-muted-foreground px-1 hover:text-foreground" onClick={() => setCandidates([])}>
            close
          </button>
        </div>
      )}
    </div>
  );
};

export default LogoPicker;
