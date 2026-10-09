export const warsawDayKey = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));

/** "Today" / "Tomorrow" / "Thu, 25 Sep" — for section headings. */
export const dayLabel = (key: string, kickoff?: string) => {
  if (key === "tbd") return "Kickoff TBD";
  const todayKey = warsawDayKey(Date.now());
  const tomorrowKey = warsawDayKey(Date.now() + 86400000);
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  const ms = kickoff ? new Date(kickoff).getTime() : NaN;
  if (isNaN(ms)) return key;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(ms));
};

/** Short label for day chips: "Today" / "Tomorrow" / "Thu". */
export const chipDayLabel = (key: string) => {
  if (key === "tbd") return "TBD";
  const todayKey = warsawDayKey(Date.now());
  const tomorrowKey = warsawDayKey(Date.now() + 86400000);
  if (key === todayKey) return "Today";
  if (key === tomorrowKey) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${key}T12:00:00Z`),
  );
};

/** "25.09" from a day key. */
export const chipDayDate = (key: string) =>
  key === "tbd" ? "—" : `${key.slice(8, 10)}.${key.slice(5, 7)}`;

export const dayKeyOfKickoff = (kickoff: string) => {
  const ms = new Date(kickoff).getTime();
  return isNaN(ms) ? "tbd" : warsawDayKey(ms);
};
