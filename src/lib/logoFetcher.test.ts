import { describe, it, expect } from "vitest";
import { matches, makeQueries } from "../../src/lib/logoFetcher";

describe("matches — dopasowanie nazw drużyn", () => {
  it("exact i substring", () => {
    expect(matches("Lech Poznan", "Lech Poznan")).toBe(200);
    expect(matches("KKS Lech Poznan", "Lech Poznan")).toBe(150);
  });

  it("synonimy PL→EN: Polska U-19 znajduje polską reprezentację do lat 19", () => {
    const score = matches("Poland national under-19 football team", "Polska U-19");
    expect(score).toBeGreaterThanOrEqual(100);
  });

  it("warianty zapisu wieku: U19 / U-19 / under 19 są równoważne", () => {
    expect(matches("Poland U-19", "Polska U19")).toBeGreaterThanOrEqual(120);
    // Wszystkie tokeny zapytania pasują (100%) + bonus za młodzieżówkę.
    expect(matches("Poland national under-19 football team", "Poland U19")).toBeGreaterThanOrEqual(120);
  });

  it("herb seniorów przechodzi dla zapytania młodzieżowego, ale niżej niż U-dopasowanie", () => {
    const senior = matches("Poland national football team", "Polska U-19");
    const youth = matches("Poland national under-19 football team", "Polska U-19");
    expect(senior).toBeGreaterThan(0);
    expect(senior).toBeLessThanOrEqual(90);
    expect(youth).toBeGreaterThan(senior);
  });

  it("kluby polskie vs angielskie nazwy", () => {
    expect(matches("Legia Warsaw", "Legia Warszawa")).toBeGreaterThanOrEqual(100);
    expect(matches("Rakow Czestochowa", "Raków Częstochowa")).toBe(200);
  });

  it("nie pasujące nazwy dają niski wynik", () => {
    expect(matches("Feyenoord Rotterdam", "Lech Poznan")).toBeLessThan(30);
  });
});

describe("makeQueries — warianty młodzieżowe", () => {
  it("rozszerza zapytanie o bazę i warianty zapisu wieku", () => {
    const queries = makeQueries("Polska U-19").map((q) => q.toLowerCase());
    expect(queries).toContain("polska u19");
    expect(queries).toContain("polska under-19");
    expect(queries).toContain("polska");
  });

  it("zwykła drużyna nie dostaje wariantów młodzieżowych", () => {
    const queries = makeQueries("Lech Poznan");
    expect(queries.some((q) => /u[- ]?\d{2}/i.test(q))).toBe(false);
  });
});
