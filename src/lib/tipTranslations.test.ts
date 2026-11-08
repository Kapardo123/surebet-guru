import { describe, expect, it } from "vitest";
import type { Tip } from "@/components/TipCard";
import { applyTipTranslations, tipsCacheKey } from "./tipTranslations";

const makeTip = (over: Partial<Tip> = {}): Tip => ({
  id: 1,
  sport: "Football",
  league: "Ekstraklasa",
  homeTeam: "Legia",
  awayTeam: "Lech",
  prediction: "Home win",
  odds: 2.1,
  kickoff: "2026-11-08T18:00:00Z",
  status: "upcoming",
  description: "English analysis",
  ...over,
});

describe("applyTipTranslations", () => {
  it("replaces prediction and description for matching tips", () => {
    const [tip] = applyTipTranslations([makeTip()], [
      { tip_id: 1, prediction: "Wygrana gospodarzy", description: "Polska analiza" },
    ]);
    expect(tip.prediction).toBe("Wygrana gospodarzy");
    expect(tip.description).toBe("Polska analiza");
  });

  it("falls back to the source when translation fields are empty", () => {
    const [tip] = applyTipTranslations([makeTip()], [
      { tip_id: 1, prediction: "   ", description: null },
    ]);
    expect(tip.prediction).toBe("Home win");
    expect(tip.description).toBe("English analysis");
  });

  it("leaves tips without a translation untouched", () => {
    const source = makeTip({ id: 2 });
    const [tip] = applyTipTranslations([source], [
      { tip_id: 1, prediction: "Inny typ", description: "Inna analiza" },
    ]);
    expect(tip).toEqual(source);
  });

  it("ignores invalid tip ids", () => {
    const source = makeTip();
    expect(applyTipTranslations([source], [{ tip_id: "abc", prediction: "x" }])).toEqual([source]);
  });
});

describe("tipsCacheKey", () => {
  it("uses a separate bucket per language", () => {
    expect(tipsCacheKey("pl")).toBe("gsb_tips_cache_v2_pl");
    expect(tipsCacheKey("pt-BR")).toBe("gsb_tips_cache_v2_pt");
    expect(tipsCacheKey()).toBe("gsb_tips_cache_v2_source");
  });
});
