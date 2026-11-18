import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatKickoff, kickoffParts } from "./format";
import { APP_BUILD, APP_VERSION } from "./version";
import pkg from "../../package.json";

describe("kick-off formatting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 18, 10, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("labels today and tomorrow", () => {
    expect(kickoffParts(new Date(2026, 10, 18, 20, 45).toISOString())).toEqual({ day: "Today", time: "20:45" });
    expect(kickoffParts(new Date(2026, 10, 19, 9, 5).toISOString())).toEqual({ day: "Tmrw", time: "09:05" });
    expect(formatKickoff(new Date(2026, 10, 19, 9, 5).toISOString())).toBe("Tomorrow 09:05");
  });

  it("copes with missing or bad values", () => {
    expect(kickoffParts(null)).toEqual({ day: "", time: "TBD" });
    expect(formatKickoff("")).toBe("TBD");
  });
});

describe("version", () => {
  it("comes from package.json", () => {
    expect(APP_VERSION).toBe(pkg.version);
  });
  it("derives the store build number", () => {
    const [a, b, c] = pkg.version.split(".").map(Number);
    expect(APP_BUILD).toBe(a * 100 + b * 10 + c);
  });
});
