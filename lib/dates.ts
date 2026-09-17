/**
 * Calendar-date arithmetic on "YYYY-MM-DD" strings (docs/DATA_MODEL.md: a
 * `date` has no time and is never converted). Done via `Date.UTC` so the
 * host's local time zone can never leak in — these are plain calendar dates,
 * not instants.
 */

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function toUtc(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Number of days from `a` to `b` (negative if `b` is before `a`). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: string): number {
  const day = toUtc(date).getUTCDay();
  return day === 0 ? 7 : day;
}

/** The Monday of the ISO week containing `date`. */
export function startOfWeek(date: string): string {
  return addDays(date, -(isoWeekday(date) - 1));
}

/** The 1st of the month containing `date`. */
export function startOfMonth(date: string): string {
  const [year, month] = date.split("-");
  return `${year}-${month}-01`;
}

/** The last day of the month containing `date`. */
export function endOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** "YYYY-MM" for grouping by month (DATA_MODEL.md § Status of (G, P)). */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

/** "Wednesday, September 23" (DT-01). */
export function formatWeekdayLong(date: string): string {
  return toUtc(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "September 23" (DT-01's "Contract ended <date>"). */
export function formatMonthLong(date: string): string {
  return toUtc(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  });
}

/** "Sep 23" (DT-14's prev/next links, DT-02's "due <date>"). */
export function formatMonthShort(date: string): string {
  return toUtc(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/** "Sep 19, 2026" (CV-01's date range). */
export function formatMonthShortYear(date: string): string {
  return toUtc(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Wednesday, Sep 27" (DT-02's "due <date>"). */
export function formatWeekdayShort(date: string): string {
  return toUtc(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** "September" (DT-12's "N failures in <month>"). */
export function formatMonthName(date: string): string {
  return toUtc(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
  });
}
