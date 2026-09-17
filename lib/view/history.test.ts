import { expect, test } from "vitest";

import {
  buildCalendar,
  buildHistoryData,
  monthNav,
  parseMonth,
} from "./history";

const contract = { contractStart: "2026-09-19", contractEnd: null };

const readGoal = {
  id: "d3",
  title: "Read 20 pages",
  cadence: "daily" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const gymGoal = {
  id: "w1",
  title: "Gym",
  cadence: "weekly" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};

const flu = {
  id: "exc-1",
  goalId: null,
  startsOn: "2026-09-21",
  endsOn: "2026-09-21",
  reason: "Flu",
};

const alice = { id: "alice", name: "Alice", image: null };
const bob = { id: "bob", name: "Bob", image: null };

function checkinsFor(userId: string, days: number[]) {
  return days.map((day) => ({
    userId,
    date: `2026-09-${String(day).padStart(2, "0")}`,
    note: null,
    createdAt: "2026-09-01T00:00:00Z",
  }));
}

test("HIST-08 parseMonth falls back to the current month", () => {
  expect(parseMonth("2026-09", "2026-10-05")).toBe("2026-09");
  expect(parseMonth("2026-13", "2026-10-05")).toBe("2026-10");
  expect(parseMonth("abc", "2026-10-05")).toBe("2026-10");
  expect(parseMonth(undefined, "2026-10-05")).toBe("2026-10");
  expect(parseMonth(["2026-09", "2026-08"], "2026-10-05")).toBe("2026-10");
});

test("HIST-01 the calendar is a Mon–Sun grid padded to full weeks", () => {
  const weeks = buildCalendar("2026-09"); // September 2026 starts on a Tuesday
  expect(weeks).toHaveLength(5);
  expect(weeks[0][0]).toBeNull();
  expect(weeks[0][1]).toBe("2026-09-01");
  expect(weeks[0][6]).toBe("2026-09-06");
  expect(weeks[4][2]).toBe("2026-09-30");
  expect(weeks[4][3]).toBeNull();
  expect(weeks.every((week) => week.length === 7)).toBe(true);
});

test("HIST-01 each day gets its status and an accessible label", () => {
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-23",
    goals: [readGoal],
    contract,
    completions: [
      { goalId: "d3", periodStart: "2026-09-19" },
      { goalId: "d3", periodStart: "2026-09-22" },
    ],
    exceptions: [flu],
    partners: [],
    checkins: [],
  });
  const byDate = Object.fromEntries(
    data.weeks
      .flat()
      .filter((cell) => cell !== null)
      .map((cell) => [cell.date, cell]),
  );
  expect(byDate["2026-09-01"]).toMatchObject({
    status: "none",
    label: "September 1, not counting",
  });
  expect(byDate["2026-09-18"].status).toBe("none");
  expect(byDate["2026-09-19"]).toMatchObject({
    status: "clean",
    label: "September 19, clean",
  });
  expect(byDate["2026-09-20"]).toMatchObject({
    status: "missed",
    label: "September 20, missed",
  });
  expect(byDate["2026-09-21"].status).toBe("excused");
  expect(byDate["2026-09-22"].status).toBe("clean");
  expect(byDate["2026-09-23"]).toMatchObject({
    status: "open",
    label: "September 23, open",
    isToday: true,
  });
  expect(byDate["2026-09-24"]).toMatchObject({
    status: "upcoming",
    label: "September 24, upcoming",
  });
});

test("HIST-02 month navigation is bounded by the contract start and today", () => {
  expect(monthNav("2026-10", "2026-10-05", "2026-09-19")).toEqual({
    prev: "2026-09",
    next: null,
  });
  expect(monthNav("2026-09", "2026-10-05", "2026-09-19")).toEqual({
    prev: null,
    next: "2026-10",
  });
  expect(monthNav("2026-12", "2027-01-15", "2026-09-19")).toEqual({
    prev: "2026-11",
    next: "2027-01",
  });
  // No contract start: earlier months are always offered.
  expect(monthNav("2026-01", "2026-10-05", null)).toEqual({
    prev: "2025-12",
    next: "2026-02",
  });
});

test("HIST-04 the month summary lists failures, exceptions and the completion rate", () => {
  // Read done on 9/19 and 9/22–9/29 (9 of 11 counting past periods);
  // 9/20 missed; 9/21 excused (Flu); Gym never done → week of 9/21 failed.
  const completions = [19, 22, 23, 24, 25, 26, 27, 28, 29].map((day) => ({
    goalId: "d3",
    periodStart: `2026-09-${day}`,
  }));
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-30",
    goals: [readGoal, gymGoal],
    contract,
    completions,
    exceptions: [flu],
    partners: [],
    checkins: [],
  });
  expect(data.failures).toEqual([
    "Sep 20 · Read 20 pages",
    "Week of Sep 21 · Gym",
  ]);
  expect(data.exceptions).toEqual(["Sep 21 · Whole day · Flu"]);
  expect(data.completion).toEqual({ done: 9, total: 11, percent: 82 });
});

test("HIST-04 exception labels: date ranges and goal-specific", () => {
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-30",
    goals: [readGoal],
    contract,
    completions: [],
    exceptions: [
      {
        id: "exc-2",
        goalId: "d3",
        startsOn: "2026-09-25",
        endsOn: "2026-09-28",
        reason: "Camping",
      },
      // Straddles the month boundary: still listed in September.
      {
        id: "exc-3",
        goalId: null,
        startsOn: "2026-09-30",
        endsOn: "2026-10-02",
        reason: "Trip",
      },
      // October only: not listed.
      {
        id: "exc-4",
        goalId: null,
        startsOn: "2026-10-05",
        endsOn: "2026-10-05",
        reason: "Nope",
      },
    ],
    partners: [],
    checkins: [],
  });
  expect(data.exceptions).toEqual([
    "Sep 25 – Sep 28 · Read 20 pages · Camping",
    "Sep 30 – Oct 2 · Whole day · Trip",
  ]);
});

test("HIST-04 completion is null when nothing has counted yet", () => {
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-15",
    goals: [readGoal],
    contract,
    completions: [],
    exceptions: [],
    partners: [],
    checkins: [],
  });
  expect(data.completion).toBeNull();
  expect(data.failures).toEqual([]);
});

test("HIST-05 weekly and monthly periods in the month, each with a status", () => {
  const monthly = {
    id: "m1",
    title: "Budget review",
    cadence: "monthly" as const,
    startsOn: "2026-09-01",
    endsOn: null,
    sortOrder: 0,
  };
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-30",
    goals: [readGoal, gymGoal, monthly],
    contract,
    completions: [{ goalId: "w1", periodStart: "2026-09-28" }],
    exceptions: [],
    partners: [],
    checkins: [],
  });
  expect(data.periods).toEqual([
    { title: "Gym", period: "Week of Sep 7", status: "not-counting" },
    { title: "Gym", period: "Week of Sep 14", status: "not-counting" },
    { title: "Gym", period: "Week of Sep 21", status: "failed" },
    { title: "Gym", period: "Week of Sep 28", status: "done" },
    { title: "Budget review", period: "September", status: "not-counting" },
  ]);
});

test("HIST-05 an archived weekly goal only lists the periods it was alive for", () => {
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-30",
    goals: [{ ...gymGoal, startsOn: "2026-09-16", endsOn: "2026-09-22" }],
    contract,
    completions: [],
    exceptions: [],
    partners: [],
    checkins: [],
  });
  expect(data.periods.map((p) => p.period)).toEqual([
    "Week of Sep 14",
    "Week of Sep 21",
  ]);
});

test("HIST-06 / PCI-09 partners: N of M elapsed days and a day strip", () => {
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-15",
    goals: [],
    contract,
    completions: [],
    exceptions: [],
    partners: [alice, bob],
    checkins: [
      ...checkinsFor("alice", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      ...checkinsFor(
        "bob",
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      ),
    ],
  });
  expect(data.partners.map((p) => [p.name, p.checked, p.elapsed])).toEqual([
    ["Alice", 12, 15],
    ["Bob", 15, 15],
  ]);
  const aliceDays = data.partners[0].days;
  expect(aliceDays).toHaveLength(30);
  expect(aliceDays.slice(0, 12).every((d) => d === "checked")).toBe(true);
  expect(aliceDays.slice(12, 15)).toEqual(["missed", "missed", "missed"]);
  expect(aliceDays.slice(15).every((d) => d === "future")).toBe(true);
});

test("HIST-06 a past month is fully elapsed; a future month has 0 elapsed days", () => {
  const past = buildHistoryData({
    month: "2026-09",
    today: "2026-10-05",
    goals: [],
    contract,
    completions: [],
    exceptions: [],
    partners: [alice],
    checkins: checkinsFor("alice", [30]),
  });
  expect(past.partners[0]).toMatchObject({ checked: 1, elapsed: 30 });

  const future = buildHistoryData({
    month: "2026-11",
    today: "2026-10-05",
    goals: [],
    contract,
    completions: [],
    exceptions: [],
    partners: [alice],
    checkins: [],
  });
  expect(future.partners[0]).toMatchObject({ checked: 0, elapsed: 0 });
});

test("HIST-06 someone with check-ins in the month is listed even after demotion", () => {
  const data = buildHistoryData({
    month: "2026-09",
    today: "2026-09-15",
    goals: [],
    contract,
    completions: [],
    exceptions: [],
    partners: [alice],
    checkins: [
      { ...checkinsFor("bob", [3])[0], userName: "Bob" },
      { ...checkinsFor("carol", [4])[0], userName: "Carol" },
    ],
  });
  expect(data.partners.map((p) => p.name)).toEqual(["Alice", "Bob", "Carol"]);
});
