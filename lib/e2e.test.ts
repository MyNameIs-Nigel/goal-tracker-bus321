import { afterEach, expect, test, vi } from "vitest";

import { isE2eEnabled } from "./e2e";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("AUTH-09 test mode is on when E2E_AUTH=1 and VERCEL_ENV isn't production", () => {
  vi.stubEnv("E2E_AUTH", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(isE2eEnabled()).toBe(true);

  vi.stubEnv("VERCEL_ENV", undefined);
  expect(isE2eEnabled()).toBe(true);
});

test("AUTH-10 test mode is off when E2E_AUTH is unset", () => {
  vi.stubEnv("E2E_AUTH", undefined);
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(isE2eEnabled()).toBe(false);
});

test("AUTH-10 test mode is off in production, even with E2E_AUTH=1", () => {
  vi.stubEnv("E2E_AUTH", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  expect(isE2eEnabled()).toBe(false);
});
