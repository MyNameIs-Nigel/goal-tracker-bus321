import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const todayMock = vi.fn().mockReturnValue("2026-09-23");

const getGoalMock = vi.fn();
const completionsSelectWhereMock = vi.fn();
const insertValuesMock = vi.fn().mockResolvedValue(undefined);
const deleteWhereMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/clock", () => ({ today: todayMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/queries/goals", () => ({ getGoal: getGoalMock }));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({ where: completionsSelectWhereMock }),
    })),
    insert: () => ({ values: insertValuesMock }),
    delete: () => ({ where: deleteWhereMock }),
  },
}));

const { toggleCompletion } = await import("./completions");

const avery = { id: "user-avery", teamId: "team-avery" };
const dailyGoal = { id: "goal-1", teamId: "team-avery", cadence: "daily" };

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(avery);
  todayMock.mockReset().mockReturnValue("2026-09-23");
  getGoalMock.mockReset().mockResolvedValue(dailyGoal);
  completionsSelectWhereMock.mockReset().mockResolvedValue([]);
  insertValuesMock.mockClear();
  deleteWhereMock.mockClear();
});

test("DT-03 checking an unchecked goal inserts a completion", async () => {
  const result = await toggleCompletion("goal-1", "2026-09-23");
  expect(result).toEqual({ ok: true, completed: true });
  expect(getGoalMock).toHaveBeenCalledWith("team-avery", "goal-1");
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
  getGoalMock.mockResolvedValue({ ...dailyGoal, cadence: "weekly" });
  await toggleCompletion("goal-1", "2026-09-23");
  expect(insertValuesMock).toHaveBeenCalledWith({
    goalId: "goal-1",
    periodStart: "2026-09-21",
  });
});

test("DT-04 a monthly goal's completion uses the 1st as period_start", async () => {
  getGoalMock.mockResolvedValue({ ...dailyGoal, cadence: "monthly" });
  await toggleCompletion("goal-1", "2026-09-23");
  expect(insertValuesMock).toHaveBeenCalledWith({
    goalId: "goal-1",
    periodStart: "2026-09-01",
  });
});

test("DT-05 a student can toggle their own past day", async () => {
  const result = await toggleCompletion("goal-1", "2026-09-21");
  expect(result).toEqual({ ok: true, completed: true });
});

test("DT-06 a future date is rejected", async () => {
  const result = await toggleCompletion("goal-1", "2026-09-25");
  expect(result.ok).toBe(false);
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("TEAM-06 / DT-07 a teammate's goal can't be toggled: 'Goal not found.', nothing written", async () => {
  requireUserMock.mockResolvedValue({ id: "user-blake", teamId: "team-blake" });
  getGoalMock.mockResolvedValue(null);
  await expect(toggleCompletion("goal-1", "2026-09-23")).resolves.toEqual({
    ok: false,
    error: "Goal not found.",
  });
  expect(getGoalMock).toHaveBeenCalledWith("team-blake", "goal-1");
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(deleteWhereMock).not.toHaveBeenCalled();
});
