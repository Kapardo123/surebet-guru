import { supabase } from "@/integrations/supabase/client";

export type EditMode = "polish" | "rewrite" | "shorten" | "expand";

export interface StyleResult {
  analysis: string;
  /** What the tipster would normally cite that the source doesn't give. */
  gaps: string[];
  /** Parts left out because the rules forbid them (guarantees, bookmakers). */
  removed: string[];
}

export const EDIT_MODES: { id: EditMode; label: string; hint: string }[] = [
  { id: "polish", label: "Polish", hint: "Fix the writing, keep the wording" },
  { id: "rewrite", label: "Rewrite", hint: "Fresh text in the tipster's voice" },
  { id: "shorten", label: "Shorter", hint: "2 to 3 sentences" },
  { id: "expand", label: "Fuller", hint: "3 paragraphs, no new facts" },
];

/** Edits an analysis into a tipster's voice (admin only, via the ai-style function). */
export const styleAnalysis = async (args: {
  text: string;
  tipster: string;
  mode: EditMode;
  match: { homeTeam?: string; awayTeam?: string; sport?: string; league?: string; prediction?: string; odds?: string | number; kickoff?: string };
}): Promise<StyleResult> => {
  const { data, error } = await supabase.functions.invoke("ai-style", { body: args });
  // Errors from the function come back as a JSON body with a message.
  if (error) {
    let message = error.message;
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep the generic message */
    }
    throw new Error(message);
  }
  if (!data?.analysis) throw new Error(data?.error || "No analysis came back.");
  return { analysis: data.analysis, gaps: data.gaps ?? [], removed: data.removed ?? [] };
};
