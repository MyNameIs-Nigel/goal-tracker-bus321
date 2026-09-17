/**
 * "Today" per docs/ARCHITECTURE.md § Time: the calendar date in
 * `APP_TIMEZONE`, computed on the server. The browser's zone is never used.
 */
import { isE2eEnabled } from "./e2e";

export const APP_TIMEZONE = "America/Denver";

/**
 * Pins the clock for the current test run. Only takes effect in test mode
 * (docs/TESTING.md § Clock) — `POST /api/e2e/reset` is the only caller.
 *
 * Stored in `process.env` (genuinely process-global) rather than a
 * module-level variable: Next.js's per-route bundling can give the reset
 * route and a page's route their own copy of this module, so a plain
 * closure variable set by one would not be seen by the other.
 */
export function setFixedNow(iso: string | null): void {
  if (iso) {
    process.env.E2E_FIXED_NOW = iso;
  } else {
    delete process.env.E2E_FIXED_NOW;
  }
}

function currentInstant(): Date {
  if (isE2eEnabled() && process.env.E2E_FIXED_NOW) {
    return new Date(process.env.E2E_FIXED_NOW);
  }
  return new Date();
}

function dateInZone(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The current instant — pinned by `E2E_FIXED_NOW` in test mode. Only for
 * timestamps the UI displays (a check-in's time); `today()` is the date. */
export function now(): Date {
  return currentInstant();
}

/** Today's calendar date in `APP_TIMEZONE`, as `"YYYY-MM-DD"`. */
export function today(): string {
  return dateInZone(currentInstant());
}
