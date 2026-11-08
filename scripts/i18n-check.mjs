#!/usr/bin/env node
// Fails when a locale is missing keys (or has stale ones) compared to en.json.
// Plural keys are validated against the target language's Intl.PluralRules
// categories (e.g. Polish needs _one/_few/_many/_other).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES_DIR = path.join(ROOT, "src", "i18n", "locales");
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const flatten = (obj, prefix = "", out = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, full, out);
    else out[full] = value;
  }
  return out;
};

const pluralCategories = (code) => {
  try {
    return new Intl.PluralRules(code).resolvedOptions().pluralCategories;
  } catch {
    return ["one", "other"];
  }
};

const sourceFlat = flatten(JSON.parse(await readFile(path.join(LOCALES_DIR, "en.json"), "utf8")));
const sourcePluralBases = new Set(
  Object.keys(sourceFlat)
    .filter((key) => PLURAL_SUFFIX.test(key))
    .map((key) => key.replace(PLURAL_SUFFIX, "")),
);
const sourceNonPlural = new Set(
  Object.keys(sourceFlat).filter((key) => !PLURAL_SUFFIX.test(key)),
);

const files = (await readdir(LOCALES_DIR)).filter((f) => f.endsWith(".json") && f !== "en.json");

let failed = false;

for (const file of files) {
  const code = file.replace(".json", "");
  const targetFlat = flatten(JSON.parse(await readFile(path.join(LOCALES_DIR, file), "utf8")));
  const targetNonPlural = new Set(
    Object.keys(targetFlat).filter((key) => !PLURAL_SUFFIX.test(key)),
  );
  const targetPluralBases = new Set(
    Object.keys(targetFlat)
      .filter((key) => PLURAL_SUFFIX.test(key))
      .map((key) => key.replace(PLURAL_SUFFIX, "")),
  );

  const missing = [...sourceNonPlural].filter((key) => !targetNonPlural.has(key));
  const extra = [...targetNonPlural].filter((key) => !sourceNonPlural.has(key));

  const categories = pluralCategories(code);
  for (const base of sourcePluralBases) {
    if (!targetPluralBases.has(base)) {
      missing.push(base);
      continue;
    }
    for (const category of categories) {
      if (!(`${base}_${category}` in targetFlat)) missing.push(`${base}_${category}`);
    }
  }

  const validPluralKeys = new Set(
    [...sourcePluralBases].flatMap((base) => categories.map((c) => `${base}_${c}`)),
  );
  for (const key of Object.keys(targetFlat)) {
    if (PLURAL_SUFFIX.test(key) && !validPluralKeys.has(key)) extra.push(key);
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`ok ${code}`);
    continue;
  }

  failed = true;
  console.error(`\n${code}:`);
  for (const key of missing) console.error(`  missing ${key}`);
  for (const key of extra) console.error(`  extra   ${key}`);
}

if (failed) process.exit(1);
