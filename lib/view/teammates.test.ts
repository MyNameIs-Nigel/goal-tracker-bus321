import { expect, test } from "vitest";

import { teammateSummary } from "./teammates";

const noContract = { contractStart: null, contractEnd: null };

function daily(id: string, startsOn = "2026-09-01") {
  return {
    id,
    title: id,
    cadence: "daily" as const,
    startsOn,
    endsOn: null,
    sortOrder: 0,
  };
}

test("PCI-01 progress today and the streak, in one line", () => {
  expect(
    teammateSummary({
      today: "2026-09-23",
      goals: [daily("d1"), daily("d2"), daily("d3")],
      contract: noContract,
      completions: [
        { goalId: "d1", periodStart: "2026-09-23" },
        { goalId: "d2", periodStart: "2026-09-23" },
        ...["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22"].flatMap(
          (date) =>
            ["d1", "d2", "d3"].map((goalId) => ({ goalId, periodStart: date })),
        ),
      ],
      exceptions: [],
    }),
  ).toBe("2 of 3 done · 4-day streak");
});

test("PCI-01 all done today, no streak yet before today", () => {
  expect(
    teammateSummary({
      today: "2026-09-23",
      goals: [daily("d1", "2026-09-23")],
      contract: noContract,
      completions: [{ goalId: "d1", periodStart: "2026-09-23" }],
      exceptions: [],
    }),
  ).toBe("All done · 1-day streak");
});

test("PCI-01 no active goals reads 'No goals yet'", () => {
  expect(
    teammateSummary({
      today: "2026-09-23",
      goals: [{ ...daily("old"), endsOn: "2026-09-10" }],
      contract: noContract,
      completions: [],
      exceptions: [],
    }),
  ).toBe("No goals yet");
});

test("PCI-01 goals that don't count today read 'Nothing due today'", () => {
  expect(
    teammateSummary({
      today: "2026-09-16",
      goals: [daily("d1")],
      contract: { contractStart: "2026-09-19", contractEnd: null },
      completions: [],
      exceptions: [],
    }),
  ).toBe("Nothing due today · No streak yet");

  expect(
    teammateSummary({
      today: "2026-09-23",
      goals: [{ ...daily("w1"), cadence: "weekly" as const }],
      contract: noContract,
      completions: [],
      exceptions: [],
    }),
  ).toBe("Nothing due today · No streak yet");
});
