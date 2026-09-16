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
