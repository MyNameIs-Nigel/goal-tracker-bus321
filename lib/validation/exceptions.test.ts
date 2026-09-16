import { expect, test } from "vitest";

import { validateExceptionInput } from "./exceptions";

const base = { startsOn: "2026-09-24", endsOn: "2026-09-24", reason: "Flu" };

test("EXC-05 accepts a well-formed input", () => {
  expect(validateExceptionInput(base)).toBeNull();
});

test("EXC-05 rejects an empty reason", () => {
  expect(validateExceptionInput({ ...base, reason: "  " })).toBe(
    "A reason is required",
  );
});

test("EXC-05 rejects a reason over 280 characters", () => {
  expect(validateExceptionInput({ ...base, reason: "x".repeat(281) })).toBe(
    "Keep the reason under 280 characters",
  );
});

test("EXC-05 rejects an end date before the start date", () => {
  expect(
    validateExceptionInput({ ...base, startsOn: "2026-09-25", endsOn: "2026-09-24" }),
  ).toBe("End date can't be before start date");
});

test("EXC-05 rejects a range longer than 31 days", () => {
  expect(
    validateExceptionInput({ ...base, startsOn: "2026-09-01", endsOn: "2026-10-03" }),
  ).toBe("Exceptions can cover at most 31 days");
});

test("EXC-05 accepts a range of exactly 31 days", () => {
  expect(
    validateExceptionInput({ ...base, startsOn: "2026-09-01", endsOn: "2026-10-02" }),
  ).toBeNull();
});
