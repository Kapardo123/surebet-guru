import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

// Display names for the language switcher. Add an entry here and drop a
// matching ./locales/<code>.json file — it will appear automatically.
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  pl: "Polski",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  tr: "Türkçe",
  ro: "Română",
  cs: "Čeština",
  ru: "Русский",
  uk: "Українська",
  ar: "العربية",
  hi: "हिन्दी",
  id: "Bahasa Indonesia",
  sw: "Kiswahili",
  ha: "Hausa",
  yo: "Yorùbá",
  ig: "Igbo",
  ak: "Akan (Twi)",
  lg: "Luganda",
  sn: "chiShona",
  af: "Afrikaans",
  zu: "isiZulu",
};

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

// Every JSON in ./locales becomes its own lazy chunk (Vite import.meta.glob),
// so a bundle only ships the languages actually used.
const localeLoaders = import.meta.glob("./locales/*.json") as Record<
  string,
  () => Promise<{ default: Record<string, unknown> }>
>;

const fileCodes = (): string[] =>
  Object.keys(localeLoaders).map((path) =>
    path.replace("./locales/", "").replace(".json", ""),
  );

export const getAvailableLanguages = (): { code: string; label: string }[] =>
  Array.from(new Set([...fileCodes(), "en"]))
    .map((code) => ({ code, label: LANGUAGE_NAMES[code] || code }))
    .sort((a, b) => a.label.localeCompare(b.label));

const applyDocumentLang = (lng: string) => {
  const base = String(lng || "en").split("-")[0];
  document.documentElement.lang = lng || "en";
  document.documentElement.dir = RTL_LANGUAGES.has(base) ? "rtl" : "ltr";
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pl: { translation: pl },
    },
    fallbackLng: "en",
    supportedLngs: Object.keys(LANGUAGE_NAMES),
    nonExplicitSupportedLngs: true,
    load: "currentOnly",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "gsb_lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

i18n.on("languageChanged", applyDocumentLang);
applyDocumentLang(i18n.language || "en");

/** Lazily loads a locale chunk (no-op when it is already in memory). */
export const loadLocale = async (lng: string): Promise<boolean> => {
  const base = String(lng).split("-")[0];
  if (i18n.hasResourceBundle(base, "translation")) return true;
  const loader = localeLoaders[`./locales/${base}.json`];
  if (!loader) return false;
  try {
    const mod = await loader();
    i18n.addResourceBundle(base, "translation", mod.default ?? mod, true, true);
    return true;
  } catch {
    return false;
  }
};

/** Switches language, fetching its chunk first. Persists via the detector. */
export const changeLanguage = async (lng: string): Promise<void> => {
  const base = String(lng).split("-")[0];
  await loadLocale(base);
  await i18n.changeLanguage(base);
};

export default i18n;
