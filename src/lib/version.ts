/** App version from package.json (keep android versionName in step). */
export const APP_VERSION: string = __APP_VERSION__;

/** Build number in the scheme the store builds use: 25.0.0 -> 2500. */
export const APP_BUILD = (() => {
  const [maj = 0, min = 0, pat = 0] = APP_VERSION.split(".").map((n) => parseInt(n, 10) || 0);
  return maj * 100 + min * 10 + pat;
})();
