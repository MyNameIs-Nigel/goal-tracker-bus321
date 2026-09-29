import { expect, test, vi } from "vitest";

const isAdminMock = vi.fn();
vi.mock("@/lib/queries/admin", () => ({ isAdmin: isAdminMock }));

const { startsDisabled } = await import("./new-user");

test("ADM-08 a new non-admin user starts disabled", async () => {
  isAdminMock.mockResolvedValue(false);
  await expect(startsDisabled("new@gmail.com", false)).resolves.toBe(true);
});

test("ADM-08 an admin's email starts enabled", async () => {
  isAdminMock.mockResolvedValue(true);
  await expect(startsDisabled("nigel@gmail.com", false)).resolves.toBe(false);
});

test("ADM-08 test mode starts everyone enabled without a lookup", async () => {
  isAdminMock.mockClear();
  await expect(startsDisabled("dana@e2e.local", true)).resolves.toBe(false);
  expect(isAdminMock).not.toHaveBeenCalled();
});
