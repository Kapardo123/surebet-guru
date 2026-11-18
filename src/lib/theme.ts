/** Table colour (felt) and seasonal skins. Kept on this device. */
export type TableTheme = "night" | "green" | "burgundy";

const KEY = "gsb_table";

export const TABLES: { id: TableTheme; name: string; swatch: string }[] = [
  { id: "night", name: "Night", swatch: "#141a33" },
  { id: "green", name: "Casino green", swatch: "#0f3a2a" },
  { id: "burgundy", name: "Burgundy", swatch: "#3a1222" },
];

export const getTable = (): TableTheme => {
  try {
    const v = localStorage.getItem(KEY) as TableTheme | null;
    return v && TABLES.some((t) => t.id === v) ? v : "night";
  } catch {
    return "night";
  }
};

export const applyTable = (t: TableTheme) => {
  document.documentElement.dataset.table = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", TABLES.find((x) => x.id === t)!.swatch);
};

export const setTable = (t: TableTheme) => {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable */
  }
  applyTable(t);
};

/** Seasonal pack skin: festive foil and snow in December. */
export const season = (now = new Date()): "winter" | null => (now.getMonth() === 11 ? "winter" : null);
