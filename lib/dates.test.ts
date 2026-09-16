import { expect, test } from "vitest";

import { addDays, compareDates } from "./dates";

test("addDays adds a positive number of days", () => {
  expect(addDays("2026-09-19", 1)).toBe("2026-09-20");
});

test("addDays subtracts with a negative number of days", () => {
  expect(addDays("2026-09-25", -1)).toBe("2026-09-24");
});

test("addDays crosses a month boundary", () => {
  expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
});

test("addDays crosses a year boundary", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});

test("addDays crosses a day it archived on its first day (ends_on < starts_on)", () => {
  expect(addDays("2026-09-19", -1)).toBe("2026-09-18");
});

test("compareDates orders earlier before later", () => {
  expect(compareDates("2026-09-19", "2026-09-20")).toBeLessThan(0);
  expect(compareDates("2026-09-20", "2026-09-19")).toBeGreaterThan(0);
  expect(compareDates("2026-09-19", "2026-09-19")).toBe(0);
});
