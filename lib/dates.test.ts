import { expect, test } from "vitest";

import {
  addDays,
  compareDates,
  daysBetween,
  endOfMonth,
  formatMonthLong,
  formatMonthShort,
  formatWeekdayLong,
  formatWeekdayShort,
  isoWeekday,
  monthKey,
  startOfMonth,
  startOfWeek,
} from "./dates";

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

test("daysBetween counts forward and backward spans", () => {
  expect(daysBetween("2026-09-19", "2026-09-23")).toBe(4);
  expect(daysBetween("2026-09-23", "2026-09-19")).toBe(-4);
  expect(daysBetween("2026-09-19", "2026-09-19")).toBe(0);
});

test("isoWeekday: Monday is 1, Sunday is 7", () => {
  // 2026-09-21 is a Monday, 2026-09-27 is a Sunday.
  expect(isoWeekday("2026-09-21")).toBe(1);
  expect(isoWeekday("2026-09-23")).toBe(3);
  expect(isoWeekday("2026-09-27")).toBe(7);
});

test("startOfWeek returns the Monday of the ISO week", () => {
  expect(startOfWeek("2026-09-23")).toBe("2026-09-21");
  expect(startOfWeek("2026-09-21")).toBe("2026-09-21");
  expect(startOfWeek("2026-09-27")).toBe("2026-09-21");
});

test("startOfMonth and endOfMonth bound the calendar month", () => {
  expect(startOfMonth("2026-09-23")).toBe("2026-09-01");
  expect(endOfMonth("2026-09-23")).toBe("2026-09-30");
  expect(endOfMonth("2026-02-05")).toBe("2026-02-28");
});

test("monthKey extracts YYYY-MM", () => {
  expect(monthKey("2026-09-23")).toBe("2026-09");
});

test("formatWeekdayLong reads DT-01's header format", () => {
  expect(formatWeekdayLong("2026-09-23")).toBe("Wednesday, September 23");
});

test("formatMonthLong reads DT-01's 'Contract ended <date>' format", () => {
  expect(formatMonthLong("2026-12-18")).toBe("December 18");
});

test("formatMonthShort reads DT-14's prev/next link format", () => {
  expect(formatMonthShort("2026-09-20")).toBe("Sep 20");
});

test("formatWeekdayShort reads DT-02's 'due <date>' format", () => {
  expect(formatWeekdayShort("2026-09-27")).toBe("Sunday, Sep 27");
});
