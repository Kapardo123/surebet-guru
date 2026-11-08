import { describe, it, expect } from "vitest";
import { compareVersions } from "./useAppUpdate";

describe("compareVersions (update gate)", () => {
  it("treats equal versions as up to date", () => {
    expect(compareVersions("41.0.0", "41.0.0")).toBe(0);
    expect(compareVersions("41", "41.0.0")).toBe(0);
  });

  it("detects an outdated client", () => {
    expect(compareVersions("40.0.0", "41.0.0")).toBeLessThan(0);
    expect(compareVersions("41.0.0", "41.0.1")).toBeLessThan(0);
    expect(compareVersions("41.9.9", "42.0.0")).toBeLessThan(0);
  });

  it("detects a newer client (no false positive)", () => {
    expect(compareVersions("42.0.0", "41.0.0")).toBeGreaterThan(0);
    expect(compareVersions("41.1.0", "41.0.9")).toBeGreaterThan(0);
  });
});
