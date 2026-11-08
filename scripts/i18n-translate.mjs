#!/usr/bin/env node
// Generates locale files from src/i18n/locales/en.json using an LLM.
//
// Usage:
//   OPENROUTER_API_KEY=sk-... node scripts/i18n-translate.mjs de fr es
//   OPENROUTER_API_KEY=sk-... node scripts/i18n-translate.mjs --force ar
//
// Env:
//   OPENROUTER_API_KEY  required
//   I18N_MODEL          default: deepseek/deepseek-v4.1-flash
//   I18N_BATCH          keys per request (default 60) — keeps prompts small
//
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = path.join(ROOT, "src", "i18n", "locales");
const SOURCE = path.join(LOCALES_DIR, "en.json");

const LANGUAGE_NAMES = {
  pl: "Polish",
  es: "Spanish",
  de: "German",
  fr: "French",
  it: "Italian",
  pt: "Portuguese (Brazil)",
  nl: "Dutch",
  tr: "Turkish",
  ro: "Romanian",
  cs: "Czech",
  ru: "Russian",
  uk: "Ukrainian",
  ar: "Arabic",
  hi: "Hindi",
  id: "Indonesian",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  no: "Norwegian",
  el: "Greek",
  hu: "Hungarian",
  bg: "Bulgarian",
  sk: "Slovak",
  hr: "Croatian",
  sr: "Serbian",
  lt: "Lithuanian",
  lv: "Latvian",
  et: "Estonian",
  he: "Hebrew",
  fa: "Persian",
  ur: "Urdu",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese (Simplified)",
  th: "Thai",
  vi: "Vietnamese",
  sw: "Swahili",
  ha: "Hausa",
  yo: "Yoruba",
  ig: "Igbo",
  ak: "Akan (Twi)",
  lg: "Luganda",
  sn: "Shona",
  af: "Afrikaans",
  zu: "Zulu",
};

// Terms that must stay consistent across every language.
const GLOSSARY = {
  "tip": "a betting prediction / pick (Polish: typ; not a gratuity)",
  "pick": "a betting selection",
  "odds": "betting odds (decimal by default)",
  "coupon": "a betting slip / accumulator",
  "accumulator": "combined bet (Polish: kupon akumulowany)",
  "kick-off": "match start time",
  "matchday": "the day's matches",
  "Premium": "keep the brand word Premium untranslated",
  "Great Sport Bets": "brand name, never translate",
  "GSB": "brand abbreviation, never translate",
};

const loadDotEnv = async () => {
  if (process.env.OPENROUTER_API_KEY) return;
  try {
    const raw = await readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* no .env file */
  }
};

await loadDotEnv();

const args = process.argv.slice(2);
const force = args.includes("--force");
const codes = args.filter((a) => !a.startsWith("--"));

if (codes.length === 0) {
  console.error("Usage: node scripts/i18n-translate.mjs [--force] <lang...>");
  process.exit(1);
}

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

const model = process.env.I18N_MODEL || "deepseek/deepseek-v4.1-flash";
const batchSize = Number(process.env.I18N_BATCH || 60);

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

const flatten = (obj, prefix = "", out = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (isObject(value)) flatten(value, full, out);
    else out[full] = value;
  }
  return out;
};

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

// English only has _one/_other, but e.g. Polish needs _few/_many and Arabic has
// six categories. Expand each plural group to the target's required categories
// so the model produces grammatically correct forms.
const expandPlurals = (flat, code) => {
  let categories;
  try {
    categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  } catch {
    categories = ["one", "other"];
  }
  if (!Array.isArray(categories) || categories.length === 0) categories = ["one", "other"];

  const out = {};
  const seen = new Set();
  for (const [key, value] of Object.entries(flat)) {
    if (!PLURAL_SUFFIX.test(key)) {
      out[key] = value;
      continue;
    }
    const base = key.replace(PLURAL_SUFFIX, "");
    if (seen.has(base)) continue;
    seen.add(base);

    for (const category of categories) {
      const reference =
        category === "one"
          ? flat[`${base}_one`] ?? flat[`${base}_other`] ?? value
          : flat[`${base}_other`] ?? flat[`${base}_one`] ?? value;
      out[`${base}_${category}`] = reference;
    }
  }
  return out;
};

const unflatten = (flat) => {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cursor = out;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) cursor[part] = value;
      else cursor = cursor[part] ??= {};
    });
  }
  return out;
};

const extractJson = (text) => {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON object in model response");
    return JSON.parse(trimmed.slice(start, end + 1));
  }
};

const chunks = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

async function translateBatch(batch, langName) {
  const payload = Object.fromEntries(batch);
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://greatsportbets.app",
      "X-Title": "GSB i18n",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            `You are a professional translator localizing a sports-betting mobile app into ${langName}.`,
            "Translate ONLY the values. Keep every JSON key exactly as given.",
            "Preserve placeholders like {{count}}, {{name}} and HTML tags verbatim.",
            "Use natural, concise UI wording (buttons stay short). Keep the tone neutral and responsible.",
            "Keep plural suffixes in keys (_one, _few, _many, _other) untouched and adapt value grammar accordingly.",
            "Glossary:",
            ...Object.entries(GLOSSARY).map(([term, note]) => `- ${term}: ${note}`),
            "Return ONLY a valid JSON object with the same keys. No markdown, no commentary.",
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify(payload, null, 2) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  const parsed = extractJson(content);
  if (!isObject(parsed)) throw new Error("Model did not return an object");
  return parsed;
}

async function translateLanguage(code) {
  const langName = LANGUAGE_NAMES[code] || code;
  const target = path.join(LOCALES_DIR, `${code}.json`);
  if (existsSync(target) && !force) {
    console.log(`skip ${code} (exists, use --force)`);
    return;
  }

  const source = JSON.parse(await readFile(SOURCE, "utf8"));
  const flat = expandPlurals(flatten(source), code);
  const entries = Object.entries(flat);
  const translated = {};

  console.log(`translating ${code} (${langName}) — ${entries.length} keys, model ${model}`);
  for (const [i, batch] of chunks(entries, batchSize).entries()) {
    const result = await translateBatch(batch, langName);
    Object.assign(translated, result);
    console.log(`  batch ${i + 1}: ${batch.length} keys`);
  }

  const missing = Object.keys(flat).filter((key) => typeof translated[key] !== "string");
  for (const key of missing) {
    translated[key] = flat[key];
    console.warn(`  missing ${key} — kept English`);
  }

  const extra = Object.keys(translated).filter((key) => !(key in flat));
  for (const key of extra) delete translated[key];

  await writeFile(target, `${JSON.stringify(unflatten(translated), null, 2)}\n`, "utf8");
  console.log(`wrote ${path.relative(ROOT, target)} (${Object.keys(translated).length} keys)`);
}

for (const code of codes) {
  await translateLanguage(code);
}
