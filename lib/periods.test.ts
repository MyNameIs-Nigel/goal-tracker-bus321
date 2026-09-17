import { expect, test } from "vitest";

import {
  countsInPeriod,
  isActive,
  periodFor,
  periodStartsInMonth,
} from "./periods";

test("periodFor daily is the single day", () => {
  expect(periodFor("daily", "2026-09-23")).toEqual({
    start: "2026-09-23",
    end: "2026-09-23",
  });
});

test("periodFor weekly is Monday through Sunday", () => {
  expect(periodFor("weekly", "2026-09-23")).toEqual({
    start: "2026-09-21",
    end: "2026-09-27",
  });
});

test("periodFor monthly is the 1st through the last day", () => {
  expect(periodFor("monthly", "2026-09-23")).toEqual({
    start: "2026-09-01",
    end: "2026-09-30",
  });
});

test("isActive is true from starts_on through ends_on inclusive", () => {
  const goal = { startsOn: "2026-09-19", endsOn: "2026-09-25" };
  expect(isActive(goal, "2026-09-18")).toBe(false);
  expect(isActive(goal, "2026-09-19")).toBe(true);
  expect(isActive(goal, "2026-09-25")).toBe(true);
  expect(isActive(goal, "2026-09-26")).toBe(false);
});

test("isActive with no ends_on is active forever after starts_on", () => {
  expect(isActive({ startsOn: "2026-09-19", endsOn: null }, "2099-01-01")).toBe(
    true,
  );
});

const noContract = { contractStart: null, contractEnd: null };

test("GOAL-06/G3: a goal counts only if it existed at the period's start", () => {
  const goal = { startsOn: "2026-09-22", endsOn: null };
  expect(
    countsInPeriod(goal, periodFor("weekly", "2026-09-23"), noContract),
  ).toBe(
    false, // week starts 9/21, goal didn't exist yet
  );
  const earlierGoal = { startsOn: "2026-09-19", endsOn: null };
  expect(
    countsInPeriod(earlierGoal, periodFor("weekly", "2026-09-23"), noContract),
  ).toBe(true);
});

test("a goal archived before the period ends doesn't count", () => {
  const goal = { startsOn: "2026-09-01", endsOn: "2026-09-20" };
  expect(
    countsInPeriod(goal, periodFor("monthly", "2026-09-15"), noContract),
  ).toBe(false);
});

test("archived on its first day never counts (ends_on < starts_on)", () => {
  const goal = { startsOn: "2026-09-19", endsOn: "2026-09-18" };
  expect(
    countsInPeriod(goal, periodFor("daily", "2026-09-19"), noContract),
  ).toBe(false);
});

test("G3: partial periods at the contract boundary never count — 9/19 start", () => {
  const contract = { contractStart: "2026-09-19", contractEnd: null };
  const goal = { startsOn: "2026-09-19", endsOn: null };

  // Daily counts from day one.
  expect(countsInPeriod(goal, periodFor("daily", "2026-09-19"), contract)).toBe(
    true,
  );
  // Weekly's first full week starts Monday 9/21; the 9/14-9/20 week doesn't count.
  expect(
    countsInPeriod(goal, periodFor("weekly", "2026-09-19"), contract),
  ).toBe(false);
  expect(
    countsInPeriod(goal, periodFor("weekly", "2026-09-21"), contract),
  ).toBe(true);
  // Monthly's first full month is October.
  expect(
    countsInPeriod(goal, periodFor("monthly", "2026-09-19"), contract),
  ).toBe(false);
  expect(
    countsInPeriod(goal, periodFor("monthly", "2026-10-01"), contract),
  ).toBe(true);
});

test("a contract end excludes periods that run past it", () => {
  const contract = { contractStart: null, contractEnd: "2026-12-18" };
  const goal = { startsOn: "2026-01-01", endsOn: null };
  expect(
    countsInPeriod(goal, periodFor("monthly", "2026-12-15"), contract),
  ).toBe(false); // December's period ends 12/31, past the contract end
  expect(
    countsInPeriod(goal, periodFor("monthly", "2026-11-15"), contract),
  ).toBe(true);
});

test("periodStartsInMonth: daily is every day of the month", () => {
  expect(periodStartsInMonth("daily", "2026-02")).toHaveLength(28);
});

test("periodStartsInMonth: weekly is every Monday that falls in the month", () => {
  // September 2026: Mondays on the 7th, 14th, 21st, 28th.
  expect(periodStartsInMonth("weekly", "2026-09")).toEqual([
    "2026-09-07",
    "2026-09-14",
    "2026-09-21",
    "2026-09-28",
  ]);
});

test("periodStartsInMonth: monthly is just the 1st", () => {
  expect(periodStartsInMonth("monthly", "2026-09")).toEqual(["2026-09-01"]);
});
