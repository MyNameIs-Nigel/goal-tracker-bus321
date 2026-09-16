import { expect, test } from "vitest";

import { firstName } from "./format";

test("firstName takes the first word of a display name", () => {
  expect(firstName("Nigel Smith")).toBe("Nigel");
});

test("firstName returns a single-word name unchanged", () => {
  expect(firstName("Nigel")).toBe("Nigel");
});

test("firstName trims surrounding whitespace", () => {
  expect(firstName("  Nigel Smith  ")).toBe("Nigel");
});
