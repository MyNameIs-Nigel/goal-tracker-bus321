import { expect, test } from "vitest";

import { periodFor } from "./periods";
import {
  computeStreak,
  dayStatusFor,
  failuresInMonth,
  isCompleted,
  isExcused,
  statusOf,
} from "./status";

const noContract = { contractStart: null, contractEnd: null };

const dailyGoal = {
  id: "d1",
  cadence: "daily" as const,
  startsOn: "2026-09-01",
  endsOn: null,
};
const weeklyGoal = {
  id: "w1",
  cadence: "weekly" as const,
  startsOn: "2026-09-01",
  endsOn: null,
};
const monthlyGoal = {
  id: "m1",
  cadence: "monthly" as const,
  startsOn: "2026-09-01",
  endsOn: null,
};

test("isCompleted matches by goal id and period start", () => {
  const completions = [{ goalId: "d1", periodStart: "2026-09-23" }];
  expect(isCompleted("d1", "2026-09-23", completions)).toBe(true);
  expect(isCompleted("d1", "2026-09-24", completions)).toBe(false);
  expect(isCompleted("d2", "2026-09-23", completions)).toBe(false);
});

test("EXC-02 a whole-day exception excuses daily goals on that day", () => {
  const exceptions = [
    {
      goalId: null,
      startsOn: "2026-09-24",
      endsOn: "2026-09-24",
      reason: "Test",
    },
  ];
  expect(
    isExcused(dailyGoal, periodFor("daily", "2026-09-24"), exceptions),
  ).toBe(true);
  expect(
    isExcused(dailyGoal, periodFor("daily", "2026-09-25"), exceptions),
  ).toBe(false);
});

test("EXC-03 a goal-specific exception excuses only that goal, over its range", () => {
  const exceptions = [
    {
      goalId: "d1",
      startsOn: "2026-09-25",
      endsOn: "2026-09-28",
      reason: "Test",
    },
  ];
  expect(
    isExcused(dailyGoal, periodFor("daily", "2026-09-26"), exceptions),
  ).toBe(true);
  expect(
    isExcused(
      { ...dailyGoal, id: "d2" },
      periodFor("daily", "2026-09-26"),
      exceptions,
    ),
  ).toBe(false);
});

test("EXC-04 a single-day whole-day exception does not excuse the week or month", () => {
  const exceptions = [
    {
      goalId: null,
      startsOn: "2026-09-22",
      endsOn: "2026-09-22",
      reason: "Test",
    },
  ];
  expect(
    isExcused(weeklyGoal, periodFor("weekly", "2026-09-22"), exceptions),
  ).toBe(false);
  expect(
    isExcused(monthlyGoal, periodFor("monthly", "2026-09-22"), exceptions),
  ).toBe(false);
});

test("EXC-04 a whole-day exception covering the entire week excuses the weekly goal", () => {
  const exceptions = [
    {
      goalId: null,
      startsOn: "2026-09-21",
      endsOn: "2026-09-27",
      reason: "Test",
    },
  ];
  expect(
    isExcused(weeklyGoal, periodFor("weekly", "2026-09-22"), exceptions),
  ).toBe(true);
});

test("EXC-04 a goal-specific exception excuses the week on mere overlap", () => {
  const exceptions = [
    {
      goalId: "w1",
      startsOn: "2026-09-22",
      endsOn: "2026-09-22",
      reason: "Test",
    },
  ];
  expect(
    isExcused(weeklyGoal, periodFor("weekly", "2026-09-22"), exceptions),
  ).toBe(true);
});

test("statusOf: not-counting when the goal doesn't count in the period", () => {
  const contract = { contractStart: "2026-09-19", contractEnd: null };
  const goal = { ...monthlyGoal, startsOn: "2026-09-19" };
  const status = statusOf({
    goal,
    period: periodFor("monthly", "2026-09-19"),
    today: "2026-09-23",
    contract,
    completions: [],
    exceptions: [],
  });
  expect(status).toBe("not-counting");
});

test("statusOf: done beats everything else (EXC-07)", () => {
  const period = periodFor("daily", "2026-09-24");
  const status = statusOf({
    goal: dailyGoal,
    period,
    today: "2026-09-24",
    contract: noContract,
    completions: [{ goalId: "d1", periodStart: "2026-09-24" }],
    exceptions: [
      {
        goalId: null,
        startsOn: "2026-09-24",
        endsOn: "2026-09-24",
        reason: "Test",
      },
    ],
  });
  expect(status).toBe("done");
});

test("statusOf: excused when not completed but covered by an exception", () => {
  const period = periodFor("daily", "2026-09-22");
  const status = statusOf({
    goal: dailyGoal,
    period,
    today: "2026-09-23",
    contract: noContract,
    completions: [],
    exceptions: [
      {
        goalId: null,
        startsOn: "2026-09-22",
        endsOn: "2026-09-22",
        reason: "Test",
      },
    ],
  });
  expect(status).toBe("excused");
});

test("statusOf: failed once the period has ended with nothing recorded", () => {
  const period = periodFor("daily", "2026-09-22");
  const status = statusOf({
    goal: dailyGoal,
    period,
    today: "2026-09-23",
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(status).toBe("failed");
});

test("statusOf: pending while the period is still open", () => {
  const period = periodFor("daily", "2026-09-23");
  const status = statusOf({
    goal: dailyGoal,
    period,
    today: "2026-09-23",
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(status).toBe("pending");
});

test("statusOf: upcoming for a future period", () => {
  const period = periodFor("daily", "2026-09-25");
  const status = statusOf({
    goal: dailyGoal,
    period,
    today: "2026-09-23",
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(status).toBe("upcoming");
});

test("DT-09/DATA_MODEL: a goal active but not yet counting reads not-counting", () => {
  const contract = { contractStart: "2026-09-19", contractEnd: null };
  const goal = { ...dailyGoal, startsOn: "2026-09-01" };
  const status = statusOf({
    goal,
    period: periodFor("daily", "2026-09-16"),
    today: "2026-09-16",
    contract,
    completions: [],
    exceptions: [],
  });
  expect(status).toBe("not-counting");
});

function dayArgs(overrides: Partial<Parameters<typeof dayStatusFor>[0]> = {}) {
  return {
    date: "2026-09-22",
    today: "2026-09-23",
    dailyGoals: [dailyGoal],
    contract: noContract,
    completions: [],
    exceptions: [],
    ...overrides,
  };
}

test("dayStatusFor: none when no daily goal counts that day", () => {
  expect(dayStatusFor(dayArgs({ dailyGoals: [] }))).toBe("none");
});

test("dayStatusFor: upcoming for a future date", () => {
  expect(
    dayStatusFor(dayArgs({ date: "2026-09-25", today: "2026-09-23" })),
  ).toBe("upcoming");
});

test("dayStatusFor: clean when every goal is done or excused, and at least one is done", () => {
  const goals = [dailyGoal, { ...dailyGoal, id: "d2" }];
  const completions = [{ goalId: "d1", periodStart: "2026-09-22" }];
  const exceptions = [
    {
      goalId: "d2",
      startsOn: "2026-09-22",
      endsOn: "2026-09-22",
      reason: "Test",
    },
  ];
  expect(
    dayStatusFor(dayArgs({ dailyGoals: goals, completions, exceptions })),
  ).toBe("clean");
});

test("dayStatusFor: excused when every goal is excused (none done)", () => {
  const exceptions = [
    {
      goalId: null,
      startsOn: "2026-09-22",
      endsOn: "2026-09-22",
      reason: "Test",
    },
  ];
  expect(dayStatusFor(dayArgs({ exceptions }))).toBe("excused");
});

test("dayStatusFor: missed for a past day with a failure", () => {
  expect(dayStatusFor(dayArgs())).toBe("missed");
});

test("dayStatusFor: open for today with something still pending", () => {
  expect(
    dayStatusFor(dayArgs({ date: "2026-09-23", today: "2026-09-23" })),
  ).toBe("open");
});

test("DT-11 streak counts consecutive clean days; excused is neutral", () => {
  // 9/19 clean, 9/20 clean, 9/21 excused, 9/22 clean, today 9/23 open.
  const completions = [
    { goalId: "d1", periodStart: "2026-09-19" },
    { goalId: "d1", periodStart: "2026-09-20" },
    { goalId: "d1", periodStart: "2026-09-22" },
  ];
  const exceptions = [
    {
      goalId: null,
      startsOn: "2026-09-21",
      endsOn: "2026-09-21",
      reason: "Test",
    },
  ];
  const streak = computeStreak({
    today: "2026-09-23",
    dailyGoals: [dailyGoal],
    contract: noContract,
    completions,
    exceptions,
  });
  expect(streak).toBe(3);
});

test("DT-11 a missed day resets the streak to zero", () => {
  // 9/22 missed (nothing recorded), today 9/23 open.
  const streak = computeStreak({
    today: "2026-09-23",
    dailyGoals: [dailyGoal],
    contract: noContract,
    completions: [],
    exceptions: [],
  });
  expect(streak).toBe(0);
});

test("DT-11 the first clean day gives a 1-day streak", () => {
  const streak = computeStreak({
    today: "2026-09-23",
    dailyGoals: [dailyGoal],
    contract: noContract,
    completions: [{ goalId: "d1", periodStart: "2026-09-22" }],
    exceptions: [],
  });
  expect(streak).toBe(1);
});

test("DT-12 failures this month counts only failed periods starting in that month", () => {
  const completions: { goalId: string; periodStart: string }[] = [];
  const failures = failuresInMonth({
    month: "2026-09",
    today: "2026-09-23",
    goals: [dailyGoal, weeklyGoal],
    contract: noContract,
    completions,
    exceptions: [],
  });
  // Daily fails on every day from 9/1 through 9/22 (22 days); the weekly
  // goal's two ended periods (starting 9/7 and 9/14) also fail — the week
  // starting 9/21 hasn't ended yet (it runs through 9/27).
  expect(failures).toBe(24);
});

test("DT-12 zero failures reads 0", () => {
  const dailyDates = ["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22"];
  const completions = dailyDates.map((periodStart) => ({
    goalId: "d1",
    periodStart,
  }));
  const failures = failuresInMonth({
    month: "2026-09",
    today: "2026-09-23",
    goals: [{ ...dailyGoal, startsOn: "2026-09-19" }],
    contract: { contractStart: "2026-09-19", contractEnd: null },
    completions,
    exceptions: [],
  });
  expect(failures).toBe(0);
});
