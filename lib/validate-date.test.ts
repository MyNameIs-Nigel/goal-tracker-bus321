import { expect, test } from "vitest";

import { isValidCalendarDate } from "./validate-date";

test("DT-08 accepts a real calendar date", () => {
  expect(isValidCalendarDate("2026-09-19")).toBe(true);
});

test("DT-08 rejects an invalid month", () => {
  expect(isValidCalendarDate("2026-13-45")).toBe(false);
});

test("DT-08 rejects a non-date string", () => {
  expect(isValidCalendarDate("hello")).toBe(false);
});

test("DT-08 rejects a day that doesn't exist in that month", () => {
  expect(isValidCalendarDate("2026-02-30")).toBe(false);
});

test("DT-08 accepts a leap day in a leap year", () => {
  expect(isValidCalendarDate("2028-02-29")).toBe(true);
});
