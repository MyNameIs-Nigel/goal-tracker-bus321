import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const todayMock = vi.fn().mockReturnValue("2026-09-23");

const goalsSelectWhereMock = vi.fn();
const completionsSelectWhereMock = vi.fn();
const insertValuesMock = vi.fn().mockResolvedValue(undefined);
const deleteWhereMock = vi.fn().mockResolvedValue(undefined);

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

const schemaMocks = vi.hoisted(() => ({
  goals: { __table: "goals" },
  completions: { __table: "completions" },
}));

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock, ForbiddenError }));
vi.mock("@/lib/clock", () => ({ today: todayMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db/schema", () => schemaMocks);

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: (table: unknown) => ({
        where:
          table === schemaMocks.goals
            ? goalsSelectWhereMock
            : completionsSelectWhereMock,
      }),
    })),
    insert: () => ({ values: insertValuesMock }),
    delete: () => ({ where: deleteWhereMock }),
  },
}));

const { toggleCompletion } = await import("./completions");

const owner = { id: "owner-1", role: "owner" as const };
const viewer = { id: "viewer-1", role: "viewer" as const };
const dailyGoal = { id: "goal-1", cadence: "daily" };

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(owner);
  todayMock.mockReset().mockReturnValue("2026-09-23");
  goalsSelectWhereMock.mockReset().mockResolvedValue([dailyGoal]);
  completionsSelectWhereMock.mockReset().mockResolvedValue([]);
  insertValuesMock.mockClear();
  deleteWhereMock.mockClear();
});

test("DT-03 checking an unchecked goal inserts a completion", async () => {
  const result = await toggleCompletion("goal-1", "2026-09-23");
  expect(result).toEqual({ ok: true, completed: true });
  expect(insertValuesMock).toHaveBeenCalledWith({
    goalId: "goal-1",
    periodStart: "2026-09-23",
  });
});

test("DT-03 checking an already-checked goal deletes the completion", async () => {
  completionsSelectWhereMock.mockResolvedValue([
    { goalId: "goal-1", periodStart: "2026-09-23" },
  ]);
  const result = await toggleCompletion("goal-1", "2026-09-23");
  expect(result).toEqual({ ok: true, completed: false });
  expect(deleteWhereMock).toHaveBeenCalled();
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("DT-04 a weekly goal's completion uses the week's Monday as period_start", async () => {
  goalsSelectWhereMock.mockResolvedValue([{ id: "goal-1", cadence: "weekly" }]);
  await toggleCompletion("goal-1", "2026-09-23");
  expect(insertValuesMock).toHaveBeenCalledWith({
    goalId: "goal-1",
    periodStart: "2026-09-21",
  });
});

test("DT-04 a monthly goal's completion uses the 1st as period_start", async () => {
  goalsSelectWhereMock.mockResolvedValue([
    { id: "goal-1", cadence: "monthly" },
  ]);
  await toggleCompletion("goal-1", "2026-09-23");
  expect(insertValuesMock).toHaveBeenCalledWith({
    goalId: "goal-1",
    periodStart: "2026-09-01",
  });
});

test("DT-05 the owner can toggle a past day", async () => {
  const result = await toggleCompletion("goal-1", "2026-09-21");
  expect(result).toEqual({ ok: true, completed: true });
});

test("DT-06 a future date is rejected", async () => {
  const result = await toggleCompletion("goal-1", "2026-09-25");
  expect(result.ok).toBe(false);
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("DT-07/ROLE-03 rejects a non-owner caller with Forbidden", async () => {
  requireUserMock.mockResolvedValue(viewer);
  await expect(toggleCompletion("goal-1", "2026-09-23")).rejects.toThrow(
    "Forbidden",
  );
  expect(insertValuesMock).not.toHaveBeenCalled();
});
