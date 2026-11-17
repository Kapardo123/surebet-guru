const parse = (value?: string | null): Date | null => {
  if (!value) return null;
  const clean = String(value).replace(/\[object Object\]/g, "").trim().replace(" ", "T");
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const time = (d: Date) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** "Today 18:30", "Tomorrow 20:45", "Sat 22 Nov 18:30". */
export const formatKickoff = (value?: string | null): string => {
  const d = parse(value);
  if (!d) return value ? String(value) : "TBD";
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Today ${time(d)}`;
  if (sameDay(d, tomorrow)) return `Tomorrow ${time(d)}`;
  if (sameDay(d, yesterday)) return `Yesterday ${time(d)}`;
  const day = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `${day} ${time(d)}`;
};

export const formatShortDate = (value?: string | null): string => {
  const d = parse(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
