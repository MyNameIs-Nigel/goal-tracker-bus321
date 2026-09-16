import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const todayMock = vi.fn().mockReturnValue("2026-09-25");

const activeGoalsInCadenceMock = vi.fn();
const getGoalMock = vi.fn();
const getGoalWithMetaMock = vi.fn();
const goalHasCompletionsMock = vi.fn();

const insertValuesMock = vi.fn();
const insertReturningMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn().mockResolvedValue(undefined);
const deleteWhereMock = vi.fn().mockResolvedValue(undefined);

const txUpdateSetMock = vi.fn();
const txUpdateWhereMock = vi.fn().mockResolvedValue(undefined);
const transactionMock = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  await fn({
    update: () => ({ set: txUpdateSetMock }),
  });
});

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

vi.mock("@/lib/clock", () => ({ today: todayMock }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/queries/goals", () => ({
  activeGoalsInCadence: activeGoalsInCadenceMock,
  getGoal: getGoalMock,
  getGoalWithMeta: getGoalWithMetaMock,
  goalHasCompletions: goalHasCompletionsMock,
}));

vi.mock("@/db/client", () => ({
  db: {
    insert: () => ({ values: insertValuesMock }),
    update: () => ({ set: updateSetMock }),
    delete: () => ({ where: deleteWhereMock }),
    transaction: transactionMock,
  },
}));

const {
  archiveGoal,
  createGoal,
  deleteGoal,
  moveGoal,
  unarchiveGoal,
  updateGoal,
} = await import("./goals");
const { validateGoalInput } = await import("@/lib/validation/goals");

const owner = { id: "owner-1", role: "owner" as const };
const viewer = { id: "viewer-1", role: "viewer" as const };

const baseInput = {
  title: "Read 20 pages",
  description: "Any book, before bed",
  cadence: "daily" as const,
  startsOn: "",
};

const goalRow = {
  id: "goal-1",
  title: "Read 20 pages",
  description: "Any book, before bed",
  cadence: "daily" as const,
  startsOn: "2026-09-25",
  endsOn: null,
  sortOrder: 0,
  createdAt: new Date("2026-09-25T00:00:00Z"),
  updatedAt: new Date("2026-09-25T00:00:00Z"),
};

const goalWithMeta = { ...goalRow, hasCompletions: false };

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(owner);
  todayMock.mockReset().mockReturnValue("2026-09-25");

  activeGoalsInCadenceMock.mockReset().mockResolvedValue([]);
  getGoalMock.mockReset().mockResolvedValue(goalRow);
  getGoalWithMetaMock.mockReset().mockResolvedValue(goalWithMeta);
  goalHasCompletionsMock.mockReset().mockResolvedValue(false);

  insertValuesMock
    .mockReset()
    .mockReturnValue({ returning: insertReturningMock });
  insertReturningMock.mockReset().mockResolvedValue([{ id: "goal-1" }]);
  updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
  updateWhereMock.mockClear();
  deleteWhereMock.mockClear();
  txUpdateSetMock.mockReset().mockReturnValue({ where: txUpdateWhereMock });
  txUpdateWhereMock.mockClear();
  transactionMock.mockClear();
});

test("GOAL-02 owner adds a goal with defaults filled in", async () => {
  const result = await createGoal(baseInput);
  expect(result).toEqual({ ok: true, goal: goalWithMeta });
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Read 20 pages",
      description: "Any book, before bed",
      cadence: "daily",
      startsOn: "2026-09-25",
      sortOrder: 0,
    }),
  );
});

test("GOAL-03 rejects an empty title with an inline error", async () => {
  const result = await createGoal({ ...baseInput, title: "  " });
  expect(result).toEqual({ ok: false, error: "Title is required" });
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("GOAL-03 rejects a title over 120 characters", async () => {
  const result = await createGoal({ ...baseInput, title: "x".repeat(121) });
  expect(result).toEqual({
    ok: false,
    error: "Keep the title under 120 characters",
  });
});

test("GOAL-03 rejects a description over 500 characters", async () => {
  const result = await createGoal({
    ...baseInput,
    description: "x".repeat(501),
  });
  expect(result).toEqual({
    ok: false,
    error: "Keep the description under 500 characters",
  });
});

test("GOAL-04 owner edits a goal's title and description", async () => {
  const result = await updateGoal("goal-1", {
    ...baseInput,
    title: "Read 30 pages",
  });
  expect(result).toEqual({ ok: true, goal: goalWithMeta });
  expect(updateSetMock).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "Read 30 pages",
      updatedAt: expect.any(Date),
    }),
  );
});

test("GOAL-05 rejects a direct save with a different cadence once completed", async () => {
  goalHasCompletionsMock.mockResolvedValue(true);
  const result = await updateGoal("goal-1", {
    ...baseInput,
    cadence: "weekly",
  });
  expect(result).toEqual({
    ok: false,
    error:
      "Cadence can't change once you've checked this off. Archive it and create a new goal.",
  });
  expect(updateWhereMock).not.toHaveBeenCalled();
});

test("GOAL-05 allows a cadence change when nothing has been completed", async () => {
  goalHasCompletionsMock.mockResolvedValue(false);
  const result = await updateGoal("goal-1", {
    ...baseInput,
    cadence: "weekly",
  });
  expect(result.ok).toBe(true);
  expect(updateSetMock).toHaveBeenCalledWith(
    expect.objectContaining({ cadence: "weekly" }),
  );
});

test("GOAL-06 owner changes the start date", async () => {
  await updateGoal("goal-1", { ...baseInput, startsOn: "2026-09-19" });
  expect(updateSetMock).toHaveBeenCalledWith(
    expect.objectContaining({ startsOn: "2026-09-19" }),
  );
});

test("GOAL-07 archive sets ends_on to the day before today", async () => {
  todayMock.mockReturnValue("2026-09-25");
  await archiveGoal("goal-1");
  expect(updateSetMock).toHaveBeenCalledWith(
    expect.objectContaining({ endsOn: "2026-09-24" }),
  );
});

test("GOAL-08 unarchive clears ends_on", async () => {
  await unarchiveGoal("goal-1");
  expect(updateSetMock).toHaveBeenCalledWith(
    expect.objectContaining({ endsOn: null }),
  );
});

test("GOAL-09 deletes a goal with no completions", async () => {
  goalHasCompletionsMock.mockResolvedValue(false);
  const result = await deleteGoal("goal-1");
  expect(result).toEqual({ ok: true });
  expect(deleteWhereMock).toHaveBeenCalled();
});

test("GOAL-09 rejects deleting a goal with a completion", async () => {
  goalHasCompletionsMock.mockResolvedValue(true);
  const result = await deleteGoal("goal-1");
  expect(result).toEqual({
    ok: false,
    error: "This goal has check-offs and can't be deleted.",
  });
  expect(deleteWhereMock).not.toHaveBeenCalled();
});

test("GOAL-10 moving a goal up swaps sort_order with its predecessor", async () => {
  getGoalMock.mockResolvedValue({ ...goalRow, id: "b", sortOrder: 1 });
  activeGoalsInCadenceMock.mockResolvedValue([
    { ...goalRow, id: "a", sortOrder: 0 },
    { ...goalRow, id: "b", sortOrder: 1 },
    { ...goalRow, id: "c", sortOrder: 2 },
  ]);

  const result = await moveGoal("b", "up");
  expect(result).toEqual({
    ok: true,
    updated: [
      { id: "b", sortOrder: 0 },
      { id: "a", sortOrder: 1 },
    ],
  });
});

test("GOAL-10 moving the first goal up is a no-op", async () => {
  getGoalMock.mockResolvedValue({ ...goalRow, id: "a", sortOrder: 0 });
  activeGoalsInCadenceMock.mockResolvedValue([
    { ...goalRow, id: "a", sortOrder: 0 },
    { ...goalRow, id: "b", sortOrder: 1 },
  ]);

  const result = await moveGoal("a", "up");
  expect(result).toEqual({ ok: true, updated: [] });
  expect(transactionMock).not.toHaveBeenCalled();
});

test("GOAL-11 rejects a non-owner caller with Forbidden", async () => {
  requireUserMock.mockResolvedValue(viewer);
  await expect(createGoal(baseInput)).rejects.toThrow("Forbidden");
  await expect(updateGoal("goal-1", baseInput)).rejects.toThrow("Forbidden");
  await expect(archiveGoal("goal-1")).rejects.toThrow("Forbidden");
  await expect(unarchiveGoal("goal-1")).rejects.toThrow("Forbidden");
  await expect(deleteGoal("goal-1")).rejects.toThrow("Forbidden");
  await expect(moveGoal("goal-1", "up")).rejects.toThrow("Forbidden");
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("validateGoalInput accepts a well-formed input", () => {
  expect(validateGoalInput(baseInput)).toBeNull();
});
