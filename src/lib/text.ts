// Safe HTML-entity decoding for display text (no dangerouslySetInnerHTML).
// Handles named entities that appear in scraped team names (e.g. "Women&apos;s").
const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export const decodeEntities = (value?: string | null): string =>
  String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[String(name).toLowerCase()] ?? m);
