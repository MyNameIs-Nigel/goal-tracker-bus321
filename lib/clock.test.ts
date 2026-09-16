import { afterEach, expect, test, vi } from "vitest";
import { setFixedNow, today } from "./clock";

afterEach(() => {
  setFixedNow(null);
  vi.unstubAllEnvs();
});

test("today() reports the real date when no fixed clock is set", () => {
  vi.stubEnv("E2E_AUTH", undefined);
  const expected = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
  }).format(new Date());
  expect(today()).toBe(expected);
});

test("today() honours a fixed clock in test mode, converted to America/Denver", () => {
  vi.stubEnv("E2E_AUTH", "1");
  vi.stubEnv("VERCEL_ENV", "preview");
  // 04:30 UTC is still the previous evening in America/Denver (UTC-6 in September).
  setFixedNow("2026-09-20T04:30:00Z");
  expect(today()).toBe("2026-09-19");
});

test("a fixed clock is ignored outside test mode", () => {
  vi.stubEnv("E2E_AUTH", undefined);
  setFixedNow("2026-09-19T12:00:00Z");
  const expected = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
  }).format(new Date());
  expect(today()).toBe(expected);
});

test("a fixed clock is ignored when VERCEL_ENV is production, even with E2E_AUTH set", () => {
  vi.stubEnv("E2E_AUTH", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  setFixedNow("2026-09-19T12:00:00Z");
  const expected = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
  }).format(new Date());
  expect(today()).toBe(expected);
});
