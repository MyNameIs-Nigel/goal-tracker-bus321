import { expect, test } from "vitest";

import { validateNote } from "./checkins";

test("PCI-04 a note over 280 characters is rejected", () => {
  expect(validateNote("x".repeat(281))).toEqual({
    error: "Keep the note under 280 characters",
  });
});

test("PCI-03 a note of up to 280 characters is trimmed and accepted", () => {
  expect(validateNote("  Nice streak, keep it up  ")).toEqual({
    note: "Nice streak, keep it up",
  });
  expect(validateNote("x".repeat(280))).toEqual({ note: "x".repeat(280) });
});

test("PCI-03 an empty note clears the note (stored as null)", () => {
  expect(validateNote("   ")).toEqual({ note: null });
});
