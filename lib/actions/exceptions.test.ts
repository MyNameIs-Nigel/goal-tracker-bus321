import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();

const insertValuesMock = vi.fn();
const insertReturningMock = vi.fn();
const deleteWhereMock = vi.fn().mockResolvedValue(undefined);

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock, ForbiddenError }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/db/client", () => ({
  db: {
    insert: () => ({ values: insertValuesMock }),
    delete: () => ({ where: deleteWhereMock }),
  },
}));

const { createException, removeException } = await import("./exceptions");

const owner = { id: "owner-1", role: "owner" as const };
const viewer = { id: "viewer-1", role: "viewer" as const };

const baseInput = {
  scope: "whole-day" as const,
  goalId: null,
  startsOn: "2026-09-24",
  endsOn: "2026-09-24",
  reason: "Flu",
};

const insertedRow = {
  id: "exc-1",
  goalId: null,
  startsOn: "2026-09-24",
  endsOn: "2026-09-24",
  reason: "Flu",
  createdAt: new Date(),
};

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(owner);
  insertValuesMock
    .mockReset()
    .mockReturnValue({ returning: insertReturningMock });
  insertReturningMock.mockReset().mockResolvedValue([insertedRow]);
  deleteWhereMock.mockClear();
});

test("EXC-02 creates a whole-day exception", async () => {
  const result = await createException(baseInput);
  expect(result).toEqual({
    ok: true,
    exception: {
      id: "exc-1",
      goalId: null,
      startsOn: "2026-09-24",
      endsOn: "2026-09-24",
      reason: "Flu",
    },
  });
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({ goalId: null, reason: "Flu" }),
  );
});

test("EXC-03 creates a goal-specific exception", async () => {
  await createException({ ...baseInput, scope: "goal", goalId: "goal-1" });
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({ goalId: "goal-1" }),
  );
});

test("EXC-03 rejects scope 'goal' with no goal chosen", async () => {
  const result = await createException({
    ...baseInput,
    scope: "goal",
    goalId: null,
  });
  expect(result).toEqual({ ok: false, error: "Choose a goal." });
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("EXC-05 rejects an empty reason", async () => {
  const result = await createException({ ...baseInput, reason: "  " });
  expect(result).toEqual({ ok: false, error: "A reason is required" });
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("EXC-05 rejects an end date before the start date", async () => {
  const result = await createException({
    ...baseInput,
    startsOn: "2026-09-25",
    endsOn: "2026-09-24",
  });
  expect(result).toEqual({
    ok: false,
    error: "End date can't be before start date",
  });
});

test("EXC-06 removes an exception", async () => {
  const result = await removeException("exc-1");
  expect(result).toEqual({ ok: true });
  expect(deleteWhereMock).toHaveBeenCalled();
});

test("EXC-09 rejects a non-owner caller with Forbidden", async () => {
  requireUserMock.mockResolvedValue(viewer);
  await expect(createException(baseInput)).rejects.toThrow("Forbidden");
  await expect(removeException("exc-1")).rejects.toThrow("Forbidden");
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(deleteWhereMock).not.toHaveBeenCalled();
});
