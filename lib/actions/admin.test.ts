import { beforeEach, expect, test, vi } from "vitest";

const requireAdminMock = vi.fn();
const getTargetMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

vi.mock("@/lib/dal", () => ({
  requireAdmin: requireAdminMock,
  ForbiddenError,
}));
vi.mock("@/lib/queries/admin", () => ({ getAdminTarget: getTargetMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db/client", () => ({
  db: { update: () => ({ set: updateSetMock }) },
}));

const { setUserDisabled } = await import("./admin");

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ id: "user-avery" });
  getTargetMock
    .mockReset()
    .mockResolvedValue({ id: "user-blake", isAdmin: false });
  updateWhereMock.mockReset().mockResolvedValue(undefined);
  updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
});

test("ADM-03 disabling writes disabled = true for the target", async () => {
  await expect(setUserDisabled("user-blake", true)).resolves.toEqual({
    ok: true,
    disabled: true,
  });
  expect(updateSetMock).toHaveBeenCalledWith({ disabled: true });
});

test("ADM-05 enabling writes disabled = false", async () => {
  await expect(setUserDisabled("user-blake", false)).resolves.toEqual({
    ok: true,
    disabled: false,
  });
  expect(updateSetMock).toHaveBeenCalledWith({ disabled: false });
});

test("ADM-06 a non-admin is Forbidden and nothing is written", async () => {
  requireAdminMock.mockRejectedValue(new ForbiddenError());
  await expect(setUserDisabled("user-blake", true)).rejects.toThrow(
    "Forbidden",
  );
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("ADM-07 an admin (including yourself) can't be disabled", async () => {
  getTargetMock.mockResolvedValue({ id: "user-avery", isAdmin: true });
  await expect(setUserDisabled("user-avery", true)).resolves.toEqual({
    ok: false,
    error: "You can't disable an admin.",
  });
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("ADM-07 an unknown user is rejected", async () => {
  getTargetMock.mockResolvedValue(undefined);
  await expect(setUserDisabled("nope", true)).resolves.toEqual({
    ok: false,
    error: "User not found.",
  });
  expect(updateSetMock).not.toHaveBeenCalled();
});
