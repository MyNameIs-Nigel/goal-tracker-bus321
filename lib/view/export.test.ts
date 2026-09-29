import { expect, test } from "vitest";

import {
  buildExport,
  csvField,
  csvFileName,
  parseRange,
  toCsv,
  type ExportInput,
} from "./export";

const contract = { contractStart: "2026-09-19", contractEnd: "2026-11-19" };

const readGoal = {
  id: "d3",
  title: "Read 20 pages",
  cadence: "daily" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const walkGoal = {
  id: "d4",
  title: "Walk",
  cadence: "daily" as const,
  startsOn: "2026-09-25",
  endsOn: null,
  sortOrder: 1,
};
const gymGoal = {
  id: "w1",
  title: "Gym",
  cadence: "weekly" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const budgetGoal = {
  id: "m1",
  title: "Budget review",
  cadence: "monthly" as const,
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
const blake = { id: "blake", name: "Blake Brown", image: null };
const casey = { id: "casey", name: "Casey Clark", image: null };

/** HIST-04's September: Read done 9/19 and 9/22–9/29, missed 9/20, Flu on 9/21. */
function september(overrides: Partial<ExportInput> = {}) {
  return buildExport({
    ownerName: "Avery Adams",
    range: { from: "2026-09-19", to: "2026-09-30" },
    today: "2026-09-30",
    goals: [readGoal, gymGoal],
    contract,
    completions: [19, 22, 23, 24, 25, 26, 27, 28, 29].map((day) => ({
      goalId: "d3",
      periodStart: `2026-09-${day}`,
    })),
    exceptions: [flu],
    partners: [blake, casey],
    received: [
      {
        userId: "blake",
        date: "2026-09-22",
        note: "Nice work on the reading",
      },
      { userId: "blake", date: "2026-09-23", note: null },
    ],
    given: null,
    ...overrides,
  });
}

const noGoals = { goals: [] };

test("EXP-02 the default range is the contract", () => {
  expect(parseRange({}, { today: "2026-09-29", contract, ...noGoals })).toEqual(
    { from: "2026-09-19", to: "2026-11-19" },
  );
});

test("EXP-03 no contract end runs to today", () => {
  expect(
    parseRange(
      {},
      {
        today: "2026-10-05",
        contract: { contractStart: "2026-09-19", contractEnd: null },
        ...noGoals,
      },
    ),
  ).toEqual({ from: "2026-09-19", to: "2026-10-05" });
});

test("EXP-03 no contract start begins at the earliest goal, or today", () => {
  const none = { contractStart: null, contractEnd: null };
  expect(
    parseRange(
      {},
      {
        today: "2026-10-05",
        contract: none,
        goals: [
          { ...readGoal, startsOn: "2026-09-15" },
          { ...gymGoal, startsOn: "2026-09-10" },
        ],
      },
    ),
  ).toEqual({ from: "2026-09-10", to: "2026-10-05" });
  expect(
    parseRange({}, { today: "2026-10-05", contract: none, ...noGoals }),
  ).toEqual({ from: "2026-10-05", to: "2026-10-05" });
});

test("EXP-03 a default end before the start collapses to the start", () => {
  expect(
    parseRange(
      {},
      {
        today: "2026-09-10",
        contract: { contractStart: "2026-09-19", contractEnd: null },
        ...noGoals,
      },
    ),
  ).toEqual({ from: "2026-09-19", to: "2026-09-19" });
});

test("EXP-04 a custom range is used as given", () => {
  expect(
    parseRange(
      { from: "2026-09-21", to: "2026-09-27" },
      { today: "2026-09-29", contract, ...noGoals },
    ),
  ).toEqual({ from: "2026-09-21", to: "2026-09-27" });
});

test("EXP-05 invalid dates take their defaults", () => {
  const context = { today: "2026-09-29", contract, ...noGoals };
  expect(parseRange({ from: "abc", to: "2026-02-30" }, context)).toEqual({
    from: "2026-09-19",
    to: "2026-11-19",
  });
  expect(parseRange({ from: ["2026-09-21", "2026-09-22"] }, context)).toEqual({
    from: "2026-09-19",
    to: "2026-11-19",
  });
});

test("EXP-05 a reversed range is swapped", () => {
  expect(
    parseRange(
      { from: "2026-09-27", to: "2026-09-21" },
      { today: "2026-09-29", contract, ...noGoals },
    ),
  ).toEqual({ from: "2026-09-21", to: "2026-09-27" });
});

test("EXP-05 a range over 366 days is cut to from + 365", () => {
  expect(
    parseRange(
      { from: "2026-01-01", to: "2028-01-01" },
      { today: "2026-09-29", contract, ...noGoals },
    ),
  ).toEqual({ from: "2026-01-01", to: "2027-01-01" });
});

test("EXP-02 the header labels", () => {
  const data = september({
    range: { from: "2026-09-19", to: "2026-11-19" },
  });
  expect(data.title).toBe("Goal report — Avery Adams");
  expect(data.owner).toBe("Avery Adams · Team Avery");
  expect(data.rangeLabel).toBe("Sep 19, 2026 – Nov 19, 2026");
  expect(data.contractLabel).toBe("Contract: Sep 19, 2026 – Nov 19, 2026");
  expect(data.exportedLabel).toBe("Exported Sep 30, 2026");
  expect(
    september({ contract: { contractStart: null, contractEnd: null } })
      .contractLabel,
  ).toBe("No contract dates set");
  expect(
    september({
      contract: { contractStart: "2026-09-19", contractEnd: null },
    }).contractLabel,
  ).toBe("Contract: from Sep 19, 2026");
});

test("EXP-06 the summary uses the history rules", () => {
  const { summary, failures, exceptions } = september();
  expect(summary).toEqual({
    completion: { done: 9, total: 11, percent: 82 },
    failures: 2,
    exceptions: 1,
    longestStreak: 8,
  });
  expect(failures).toEqual(["Sep 20 · Read 20 pages", "Week of Sep 21 · Gym"]);
  expect(exceptions).toEqual(["Sep 21 · Whole day · Flu"]);
});

test("EXP-06 nothing counted yet, and no streak", () => {
  const { summary } = september({
    range: { from: "2026-09-30", to: "2026-09-30" },
  });
  expect(summary.completion).toBeNull();
  expect(summary.longestStreak).toBe(0);
});

test("EXP-04 a custom range counts only periods starting in it", () => {
  const data = september({ range: { from: "2026-09-21", to: "2026-09-27" } });
  expect(data.months).toHaveLength(1);
  expect(data.months[0].days.map((day) => day.date)).toEqual([
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
  ]);
  // Read: done 9/22–9/27 (6), excused 9/21; Gym week of 9/21 missed.
  expect(data.summary.completion).toEqual({ done: 6, total: 7, percent: 86 });
  expect(data.failures).toEqual(["Week of Sep 21 · Gym"]);
});

test("EXP-08 each goal with a period in range, with its record", () => {
  const archived = {
    ...walkGoal,
    id: "d5",
    title: "Stretch",
    startsOn: "2026-09-19",
    endsOn: "2026-10-03",
  };
  const later = {
    ...walkGoal,
    id: "d6",
    title: "Later",
    startsOn: "2026-12-01",
  };
  const { goals } = september({
    goals: [readGoal, gymGoal, archived, later],
  });
  expect(goals.map((goal) => goal.title)).toEqual([
    "Read 20 pages",
    "Stretch",
    "Gym",
  ]);
  expect(goals[0]).toMatchObject({
    cadence: "Daily",
    started: "Started Sep 1",
    archived: null,
    record: "9 of 10 done",
  });
  expect(goals[1]).toMatchObject({
    archived: "Archived Oct 3",
    record: "0 of 10 done",
  });
  expect(goals[2]).toMatchObject({ cadence: "Weekly", record: "0 of 1 done" });
});

test("EXP-08 a goal with nothing counted yet", () => {
  const { goals } = september({
    goals: [{ ...readGoal, startsOn: "2026-09-30" }],
    completions: [],
  });
  expect(goals[0].record).toBe("Nothing counted yet");
});

test("EXP-09 the daily log has a row per date, grouped by month", () => {
  const data = september({
    range: { from: "2026-09-17", to: "2026-10-02" },
    today: "2026-10-01",
    goals: [readGoal, walkGoal],
    completions: [
      { goalId: "d3", periodStart: "2026-09-19" },
      { goalId: "d3", periodStart: "2026-09-22" },
    ],
  });
  expect(data.dailyGoals).toEqual([
    { id: "d3", title: "Read 20 pages" },
    { id: "d4", title: "Walk" },
  ]);
  expect(data.months.map((m) => m.label)).toEqual([
    "September 2026",
    "October 2026",
  ]);
  expect(data.months[0].days).toHaveLength(14);
  expect(data.months[1].days).toHaveLength(2);

  const byDate = Object.fromEntries(
    data.months.flatMap((m) => m.days).map((day) => [day.date, day]),
  );
  expect(byDate["2026-09-18"]).toMatchObject({
    label: "Fri, Sep 18",
    outsideContract: true,
    marks: ["not-counting", null],
  });
  expect(byDate["2026-09-19"]).toMatchObject({
    outsideContract: false,
    marks: ["done", null],
  });
  expect(byDate["2026-09-20"].marks).toEqual(["failed", null]);
  expect(byDate["2026-09-21"].marks).toEqual(["excused", null]);
  expect(byDate["2026-09-25"].marks).toEqual(["failed", "failed"]);
  expect(byDate["2026-10-01"].marks).toEqual(["pending", "pending"]);
  expect(byDate["2026-10-02"].marks).toEqual(["upcoming", "upcoming"]);
});

test("EXP-09 days after the contract end are outside the contract", () => {
  const data = september({
    range: { from: "2026-11-18", to: "2026-11-20" },
    today: "2026-11-25",
  });
  expect(
    data.months[0].days.map((day) => [day.date, day.outsideContract]),
  ).toEqual([
    ["2026-11-18", false],
    ["2026-11-19", false],
    ["2026-11-20", true],
  ]);
});

test("EXP-09 the Check-ins column lists partners' first names", () => {
  const data = september({
    received: [
      { userId: "casey", date: "2026-09-22", note: null },
      { userId: "blake", date: "2026-09-22", note: null },
      { userId: "gone", date: "2026-09-23", note: null },
    ],
    partners: [
      blake,
      casey,
      { id: "gone", name: "Former Student", image: null },
    ],
  });
  const byDate = Object.fromEntries(
    data.months[0].days.map((day) => [day.date, day]),
  );
  expect(byDate["2026-09-22"].checkedBy).toEqual(["Blake", "Casey"]);
  expect(byDate["2026-09-23"].checkedBy).toEqual(["Former"]);
  expect(byDate["2026-09-24"].checkedBy).toEqual([]);
});

test("EXP-10 weekly and monthly periods in range, each with a status", () => {
  const data = september({
    range: { from: "2026-09-19", to: "2026-10-04" },
    today: "2026-10-01",
    goals: [readGoal, gymGoal, budgetGoal],
  });
  expect(data.periods).toEqual([
    { title: "Gym", period: "Week of Sep 21", status: "failed" },
    { title: "Gym", period: "Week of Sep 28", status: "pending" },
    { title: "Budget review", period: "October", status: "pending" },
  ]);
  expect(september({ goals: [readGoal] }).periods).toEqual([]);
});

test("EXP-11 check-ins from partners, grouped, with notes", () => {
  const { received } = september();
  expect(received).toEqual([
    {
      id: "blake",
      name: "Blake Brown",
      days: 2,
      entries: ["Sep 22 — Nice work on the reading", "Sep 23"],
    },
    { id: "casey", name: "Casey Clark", days: 0, entries: [] },
  ]);
});

test("EXP-12 check-ins you made are absent unless asked for", () => {
  expect(september().given).toBeNull();
  const { given } = september({
    given: [
      { ownerName: "Blake Brown", date: "2026-09-22", note: "Keep going!" },
      { ownerName: "Casey Clark", date: "2026-09-24", note: null },
      { ownerName: "Blake Brown", date: "2026-09-21", note: null },
    ],
  });
  expect(given).toEqual([
    {
      team: "Team Blake",
      days: 2,
      entries: ["Sep 21", "Sep 22 — Keep going!"],
    },
    { team: "Team Casey", days: 1, entries: ["Sep 24"] },
  ]);
});

test("EXP-14 the CSV has the header and every kind of row", () => {
  const csv = toCsv(
    september({
      range: { from: "2026-09-20", to: "2026-09-21" },
      given: [{ ownerName: "Blake Brown", date: "2026-09-21", note: "Hi" }],
      received: [{ userId: "blake", date: "2026-09-21", note: "Get well" }],
    }).records,
  );
  expect(csv.split("\r\n")).toEqual([
    "record,date,end_date,goal,cadence,status,reason,person,note",
    "goal,2026-09-20,2026-09-20,Read 20 pages,daily,Missed,,,",
    "goal,2026-09-21,2026-09-21,Read 20 pages,daily,Excused,Flu,,",
    "goal,2026-09-21,2026-09-27,Gym,weekly,Missed,,,",
    "exception,2026-09-21,2026-09-21,,,,Flu,,",
    "check-in received,2026-09-21,,,,,,Blake Brown,Get well",
    "check-in given,2026-09-21,,,,,,Team Blake,Hi",
    "",
  ]);
});

test("EXP-14 the CSV file name", () => {
  expect(
    csvFileName("Avery Adams", { from: "2026-09-19", to: "2026-11-19" }),
  ).toBe("goal-report-avery-2026-09-19-to-2026-11-19.csv");
  expect(csvFileName("  ", { from: "2026-09-19", to: "2026-09-19" })).toBe(
    "goal-report-2026-09-19-to-2026-09-19.csv",
  );
  expect(
    csvFileName('Zoë "Z" O\'Neil', { from: "2026-09-19", to: "2026-09-19" }),
  ).toBe("goal-report-zo-2026-09-19-to-2026-09-19.csv");
});

test("EXP-15 CSV fields are quoted and never run as formulas", () => {
  expect(csvField('Read, then "reflect"')).toBe('"Read, then ""reflect"""');
  expect(csvField('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  expect(csvField("+1")).toBe("'+1");
  expect(csvField("-1")).toBe("'-1");
  expect(csvField("@me")).toBe("'@me");
  expect(csvField("\tx")).toBe("'\tx");
  expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  expect(csvField("plain")).toBe("plain");
  expect(csvField(null)).toBe("");
});
