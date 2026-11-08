import { describe, expect, it } from "vitest";
import i18n, { changeLanguage, getAvailableLanguages } from "./index";

describe("i18n", () => {
  it("lists the available locales", () => {
    const codes = getAvailableLanguages().map((l) => l.code);
    expect(codes).toEqual(expect.arrayContaining(["en", "pl"]));
  });

  it("switches to Polish and resolves plural forms", async () => {
    await changeLanguage("pl");
    expect(i18n.t("nav.tips")).toBe("Typy");
    expect(i18n.t("home.today")).toBe("Dziś");
    expect(i18n.t("home.analysis", { count: 1 })).toBe("analiza");
    expect(i18n.t("home.analysis", { count: 3 })).toBe("analizy");
    expect(i18n.t("home.analysis", { count: 5 })).toBe("analiz");
  });

  it("updates document language and can switch back", async () => {
    await changeLanguage("pl");
    expect(document.documentElement.lang).toBe("pl");
    expect(document.documentElement.dir).toBe("ltr");

    await changeLanguage("en");
    expect(i18n.t("nav.tips")).toBe("Tips");
  });

  it("falls back to English for unknown locales", async () => {
    await changeLanguage("xx");
    expect(i18n.t("nav.tips")).toBe("Tips");
    await changeLanguage("en");
  });
});
