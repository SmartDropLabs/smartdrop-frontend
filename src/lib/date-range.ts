/** Local-midnight Date for a `YYYY-MM-DD` value from `<input type="date">`. */
function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Keeps entries whose date falls within [from, to], both inclusive whole
 * local days (#774). An empty or unparseable bound is open-ended.
 */
export function filterByDateRange<T extends { date: string }>(
  entries: T[],
  from: string,
  to: string,
): T[] {
  const start = parseDateInput(from);
  const endDay = parseDateInput(to);
  const end = endDay
    ? new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1)
    : null;
  if (!start && !end) return entries;
  return entries.filter((entry) => {
    const at = new Date(entry.date).getTime();
    if (Number.isNaN(at)) return false;
    if (start && at < start.getTime()) return false;
    if (end && at >= end.getTime()) return false;
    return true;
  });
}

