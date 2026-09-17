import { expect, test } from "vitest";

import {
  buildDayGroups,
  failuresLabel,
  progressLabel,
  streakLabel,
  type ViewGoal,
} from "./day";

const noContract = { contractStart: null, contractEnd: null };

const d1: ViewGoal = {
  id: "d1",
  title: "D1",
  cadence: "daily",
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const d2: ViewGoal = { ...d1, id: "d2", title: "D2", sortOrder: 1 };
const w1: ViewGoal = {
  id: "w1",
  title: "W1",
  cadence: "weekly",
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const m1: ViewGoal = {
  id: "m1",
  title: "M1",
  cadence: "monthly",
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};

test("DT-02 active goals are grouped by cadence, in sort order", () => {
  const groups = buildDayGroups({
    date: "2026-09-23",
    today: "2026-09-23",
    goals: [d2, d1, w1, m1],
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(groups.daily.map((g) => g.id)).toEqual(["d1", "d2"]);
  expect(groups.weekly.map((g) => g.id)).toEqual(["w1"]);
  expect(groups.monthly.map((g) => g.id)).toEqual(["m1"]);
});

test("DT-02 weekly and monthly rows carry the period's end date for 'due'", () => {
  const groups = buildDayGroups({
    date: "2026-09-23",
    today: "2026-09-23",
    goals: [w1, m1],
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(groups.weekly[0].periodEnd).toBe("2026-09-27");
  expect(groups.monthly[0].periodEnd).toBe("2026-09-30");
});

test("an archived (inactive) goal is left out entirely", () => {
  const archived: ViewGoal = { ...d1, endsOn: "2026-09-10" };
  const groups = buildDayGroups({
    date: "2026-09-23",
    today: "2026-09-23",
    goals: [archived],
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(groups.daily).toHaveLength(0);
});

test("EXC-08 an excused goal carries the exception's reason", () => {
  const groups = buildDayGroups({
    date: "2026-09-24",
    today: "2026-09-24",
    goals: [d1],
    contract: noContract,
    completions: [],
    exceptions: [
      {
        goalId: null,
        startsOn: "2026-09-24",
        endsOn: "2026-09-24",
        reason: "Flu",
      },
    ],
  });
  expect(groups.daily[0]).toMatchObject({
    status: "excused",
    excusedReason: "Flu",
  });
});

test("DT-03/DT-09 a completion still marks completed even when status is not-counting", () => {
  const contract = { contractStart: "2026-09-19", contractEnd: null };
  const groups = buildDayGroups({
    date: "2026-09-16",
    today: "2026-09-16",
    goals: [d1],
    contract,
    completions: [{ goalId: "d1", periodStart: "2026-09-16" }],
    exceptions: [],
  });
  expect(groups.daily[0]).toMatchObject({
    status: "not-counting",
    completed: true,
  });
});

test("progressLabel counts only goals that count yet", () => {
  const contract = { contractStart: "2026-09-19", contractEnd: null };
  const goals = [
    { ...d1, startsOn: "2026-09-19" },
    { ...d2, startsOn: "2026-09-19" },
    { ...d1, id: "d3", startsOn: "2026-09-25" }, // doesn't count yet
  ];
  const groups = buildDayGroups({
    date: "2026-09-23",
    today: "2026-09-23",
    goals,
    contract,
    completions: [{ goalId: "d1", periodStart: "2026-09-23" }],
    exceptions: [],
  });
  expect(progressLabel(groups.daily)).toBe("1 of 2 done");
});

test("progressLabel reads 'All done' when every counting goal is done", () => {
  const goals = [d1];
  const groups = buildDayGroups({
    date: "2026-09-23",
    today: "2026-09-23",
    goals,
    contract: noContract,
    completions: [{ goalId: "d1", periodStart: "2026-09-23" }],
    exceptions: [],
  });
  expect(progressLabel(groups.daily)).toBe("All done");
});

test("progressLabel is null when nothing counts yet", () => {
  expect(progressLabel([])).toBeNull();
});

test("streakLabel", () => {
  expect(streakLabel(0)).toBe("No streak yet");
  expect(streakLabel(1)).toBe("1-day streak");
  expect(streakLabel(3)).toBe("3-day streak");
});

test("failuresLabel", () => {
  expect(failuresLabel(2, "2026-09-15")).toBe("2 failures in September");
  expect(failuresLabel(0, "2026-09-15")).toBe("0 failures in September");
  expect(failuresLabel(1, "2026-09-15")).toBe("1 failure in September");
});
