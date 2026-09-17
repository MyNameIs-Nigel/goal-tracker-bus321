import { expect, test } from "vitest";

import {
  contractRangeLabel,
  lastUpdatedLabel,
  partnersLabel,
} from "./contract";

test("CV-01 the date range shares the year when both dates are in it", () => {
  expect(
    contractRangeLabel({
      contractStart: "2026-09-19",
      contractEnd: "2026-12-18",
    }),
  ).toBe("Sep 19 – Dec 18, 2026");
});

test("CV-01 the date range spells out both years when they differ", () => {
  expect(
    contractRangeLabel({
      contractStart: "2026-09-19",
      contractEnd: "2027-01-18",
    }),
  ).toBe("Sep 19, 2026 – Jan 18, 2027");
});

test("CV-01 only a start, or no dates at all", () => {
  expect(
    contractRangeLabel({ contractStart: "2026-09-19", contractEnd: null }),
  ).toBe("Starts Sep 19, 2026");
  expect(contractRangeLabel({ contractStart: null, contractEnd: null })).toBe(
    "No contract dates yet",
  );
});

test("CV-05 last updated names the day (Denver) and the owner's first name", () => {
  // 03:30 UTC on 9/19 is still the evening of 9/18 in America/Denver.
  expect(lastUpdatedLabel("2026-09-19T03:30:00Z", "Nigel Smith")).toBe(
    "Last updated Sep 18 by Nigel",
  );
  expect(lastUpdatedLabel(null, null)).toBeNull();
});

test("CV-01 partners are listed by name, or 'none yet'", () => {
  expect(partnersLabel(["Alice", "Bob"])).toBe(
    "Accountability partners: Alice, Bob",
  );
  expect(partnersLabel([])).toBe("Accountability partners: none yet");
});
