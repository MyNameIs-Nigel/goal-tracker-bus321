import { afterEach, expect, test, vi } from "vitest";

import { isOwnerEmail } from "./owner";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("AUTH-04 the owner email becomes owner, case-insensitively", () => {
  vi.stubEnv("OWNER_EMAIL", "nigel@example.com");
  expect(isOwnerEmail("nigel@example.com")).toBe(true);
  expect(isOwnerEmail("Nigel@Example.com")).toBe(true);
  expect(isOwnerEmail("NIGEL@EXAMPLE.COM")).toBe(true);
});

test("AUTH-03 any other email is not the owner", () => {
  vi.stubEnv("OWNER_EMAIL", "nigel@example.com");
  expect(isOwnerEmail("classmate@example.com")).toBe(false);
});

test("no email is the owner when OWNER_EMAIL is unset", () => {
  vi.stubEnv("OWNER_EMAIL", undefined);
  expect(isOwnerEmail("anyone@example.com")).toBe(false);
});
