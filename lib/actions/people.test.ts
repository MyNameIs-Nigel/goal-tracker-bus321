import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const selectWhereMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn().mockResolvedValue(undefined);

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

vi.mock("@/lib/dal", () => ({
  requireUser: requireUserMock,
  ForbiddenError,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/db/client", () => ({
  db: {
    select: () => ({ from: () => ({ where: selectWhereMock }) }),
    update: () => ({ set: updateSetMock }),
  },
}));

const { setRole } = await import("./people");

const owner = { id: "owner-1", role: "owner" as const };

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(owner);
  selectWhereMock.mockReset();
  updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
  updateWhereMock.mockClear();
});

test("ROLE-03 rejects a non-owner caller with Forbidden", async () => {
  requireUserMock.mockResolvedValue({ id: "viewer-1", role: "viewer" });
  await expect(setRole("partner-1", "partner")).rejects.toThrow("Forbidden");
  expect(updateWhereMock).not.toHaveBeenCalled();
});

test("rejects an invalid target role", async () => {
  const result = await setRole("someone", "owner");
  expect(result).toEqual({ ok: false, error: "Invalid role." });
  expect(updateWhereMock).not.toHaveBeenCalled();
});

test("ROLE-06 rejects targeting the owner's own user", async () => {
  const result = await setRole(owner.id, "partner");
  expect(result).toEqual({
    ok: false,
    error: "You can't change your own role.",
  });
  expect(updateWhereMock).not.toHaveBeenCalled();
});

test("ROLE-06 rejects when the target row is the owner", async () => {
  selectWhereMock.mockResolvedValue([
    { id: "other-owner", name: "Someone", role: "owner" },
  ]);
  const result = await setRole("other-owner", "partner");
  expect(result).toEqual({ ok: false, error: "That role can't be changed." });
  expect(updateWhereMock).not.toHaveBeenCalled();
});

test("PPL-02 promotes a viewer to partner", async () => {
  selectWhereMock.mockResolvedValue([
    { id: "viewer-1", name: "Vivi Viewer", role: "viewer" },
  ]);
  const result = await setRole("viewer-1", "partner");
  expect(result).toEqual({ ok: true, name: "Vivi Viewer", role: "partner" });
  expect(updateSetMock).toHaveBeenCalledWith({ role: "partner" });
});

test("PPL-03 demotes a partner to viewer", async () => {
  selectWhereMock.mockResolvedValue([
    { id: "partner-1", name: "Pat Partner", role: "partner" },
  ]);
  const result = await setRole("partner-1", "viewer");
  expect(result).toEqual({ ok: true, name: "Pat Partner", role: "viewer" });
  expect(updateSetMock).toHaveBeenCalledWith({ role: "viewer" });
});
