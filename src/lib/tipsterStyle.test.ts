import { describe, expect, it } from "vitest";
import {
  FORBIDDEN,
  VOICES,
  buildSystemPrompt,
  buildUserPrompt,
  lengthWindow,
} from "../../supabase/functions/_shared/tipsterStyle";
import { TIPSTERS } from "@/lib/tipsters";

describe("tipster voices", () => {
  it("match the tipsters shown in the app", () => {
    for (const t of TIPSTERS) {
      expect(VOICES[t.id].nick).toBe(t.nick);
      expect(VOICES[t.id].role).toBe(t.role);
    }
  });

  it("each system prompt is written for one tipster and contrasts the other", () => {
    const adam = buildSystemPrompt("adam");
    expect(adam).toContain('editor for "xGhost"');
    expect(adam).toContain("Numbers first");
    expect(adam).toContain("Courtside (The Specialist) is the contrast");
    const peter = buildSystemPrompt("peter");
    expect(peter).toContain('editor for "Courtside"');
    expect(peter).toContain("schedule");
    expect(peter).toContain("xGhost (The Analyst) is the contrast");
    // No unfilled template bits.
    expect(adam + peter).not.toMatch(/\{place\}|\$\{|undefined/);
  });

  it("the user prompt carries the match, the source, the mode and the JSON shape", () => {
    const p = buildUserPrompt("Lech are unbeaten in six at home.", "shorten", "adam", {
      homeTeam: "Lech Poznań",
      awayTeam: "Legia Warsaw",
      sport: "Football",
      league: "Ekstraklasa",
      prediction: "Home win",
      odds: 2.1,
    });
    expect(p).toContain("Fixture: Lech Poznań vs Legia Warsaw");
    expect(p).toContain("talk about the pitch");
    expect(p).toContain("Lech are unbeaten in six at home.");
    expect(p).toContain("SHORTEN");
    expect(p).toContain('"gaps"');
    expect(p).toContain('matches "Home win"');
    expect(buildUserPrompt("x".repeat(40), "rewrite", "peter", { sport: "Ice Hockey" })).toContain("talk about the ice");
    expect(buildUserPrompt("x".repeat(40), "rewrite", "peter", { sport: "Tennis" })).toContain("talk about the court");
  });
});

describe("hard rules", () => {
  it("catch promises but allow honest wording", () => {
    for (const bad of ["This is a lock.", "Guaranteed winner", "You can't lose here", "100% sure", "a real banker", "nailed on"]) {
      expect(FORBIDDEN.test(bad), bad).toBe(true);
    }
    for (const ok of ["There are no guarantees in football.", "They block well", "a 100-point game", "a deadlock in midfield"]) {
      expect(FORBIDDEN.test(ok), ok).toBe(false);
    }
  });

  it("length windows fit each mode", () => {
    expect(lengthWindow(600, "shorten")).toEqual([120, 520]);
    const [pMin, pMax] = lengthWindow(600, "polish");
    expect(pMin).toBeLessThan(600);
    expect(pMax).toBeGreaterThan(600);
    expect(lengthWindow(600, "expand")[1]).toBeGreaterThan(lengthWindow(600, "rewrite")[1]);
  });
});
