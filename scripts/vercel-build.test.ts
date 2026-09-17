import { expect, test } from "vitest";

import { shouldMigrate } from "./vercel-build.mjs";

test("migrates only on Vercel's Production environment (ADR-0004)", () => {
  expect(shouldMigrate({ VERCEL_ENV: "production" })).toBe(true);
  expect(shouldMigrate({ VERCEL_ENV: "preview" })).toBe(false);
  expect(shouldMigrate({ VERCEL_ENV: "development" })).toBe(false);
  expect(shouldMigrate({})).toBe(false);
});
