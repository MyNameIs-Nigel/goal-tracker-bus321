import { expect, test } from "vitest";

import { firstName, formatTime } from "./format";

test("firstName takes the first word of a display name", () => {
  expect(firstName("Nigel Smith")).toBe("Nigel");
});

test("firstName returns a single-word name unchanged", () => {
  expect(firstName("Nigel")).toBe("Nigel");
});

test("firstName trims surrounding whitespace", () => {
  expect(firstName("  Nigel Smith  ")).toBe("Nigel");
});

test("PCI-01 formatTime renders an instant as Denver AM/PM time, no seconds", () => {
  // 02:12 UTC on 9/24 is 8:12 PM on 9/23 in America/Denver (MDT, UTC-6).
  expect(formatTime("2026-09-24T02:12:00Z")).toBe("8:12 PM");
  expect(formatTime(new Date("2026-09-23T13:05:00Z"))).toBe("7:05 AM");
  // Standard time (MST, UTC-7) after the November changeover.
  expect(formatTime("2026-11-10T00:30:00Z")).toBe("5:30 PM");
});
