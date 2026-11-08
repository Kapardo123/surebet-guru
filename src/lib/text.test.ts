import { describe, it, expect } from "vitest";
import { decodeEntities } from "./text";

describe("decodeEntities", () => {
  it("decodes named entities commonly found in scraped names", () => {
    expect(decodeEntities("Women&apos;s Super League")).toBe("Women's Super League");
    expect(decodeEntities("A &amp; B")).toBe("A & B");
    expect(decodeEntities("Atletico&nbsp;Madrid")).toBe("Atletico Madrid");
    expect(decodeEntities("A &ndash; B")).toBe("A – B");
  });

  it("decodes numeric entities", () => {
    expect(decodeEntities("Women&#39;s")).toBe("Women's");
    expect(decodeEntities("Women&#x27;s")).toBe("Women's");
  });

  it("passes through plain text", () => {
    expect(decodeEntities("Lech Poznań")).toBe("Lech Poznań");
    expect(decodeEntities(null)).toBe("");
  });
});
