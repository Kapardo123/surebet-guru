/** The weekend a pack bought at `now` covers: Fri 00:00 UTC to Mon 06:00 UTC.
 *  Mirrors currentWeekend() in src/lib/engagement.ts. */
export const weekendWindow = (now = new Date()) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay();
  const toFri = dow === 5 || dow === 6 ? -(dow - 5) : dow === 0 ? -2 : 5 - dow;
  const start = new Date(d.getTime() + toFri * 86400000);
  const end = new Date(start.getTime() + 3 * 86400000 + 6 * 3600000);
  return { start, end };
};
