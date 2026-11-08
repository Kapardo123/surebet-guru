export default {
  locales: ["en"],
  output: "src/i18n/locales/$LOCALE.json",
  input: ["src/**/*.{ts,tsx}"],
  keySeparator: ".",
  namespaceSeparator: false,
  defaultNamespace: "translation",
  useKeysAsDefaultValue: false,
  sort: true,
  createOldCatalogs: false,
  keepRemoved: true,
  verbose: false,
};
