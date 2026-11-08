import type { Tip } from "@/components/TipCard";

export interface TipTranslationRow {
  tip_id: number | string;
  prediction?: string | null;
  description?: string | null;
}

/** One cache bucket per UI language, so switching languages never shows stale text. */
export const tipsCacheKey = (locale?: string): string =>
  `gsb_tips_cache_v2_${locale ? String(locale).split("-")[0] : "source"}`;

/**
 * Merges DB translations into tips. Missing/empty fields fall back to the
 * source text, so a partially translated tip never renders blank.
 */
export const applyTipTranslations = (tips: Tip[], rows: TipTranslationRow[]): Tip[] => {
  if (!rows?.length) return tips;

  const byId = new Map<number, TipTranslationRow>();
  for (const row of rows) {
    const id = Number(row.tip_id);
    if (Number.isFinite(id)) byId.set(id, row);
  }
  if (byId.size === 0) return tips;

  return tips.map((tip) => {
    const translation = byId.get(tip.id);
    if (!translation) return tip;

    const prediction =
      typeof translation.prediction === "string" && translation.prediction.trim()
        ? translation.prediction
        : tip.prediction;
    const description =
      translation.description != null ? String(translation.description) : tip.description;

    return { ...tip, prediction, description };
  });
};
