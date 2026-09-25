import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const getGoalMock = vi.fn();

const insertValuesMock = vi.fn();
const insertReturningMock = vi.fn();
const deleteWhereMock = vi.fn();
const deleteReturningMock = vi.fn();

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/queries/goals", () => ({ getGoal: getGoalMock }));

vi.mock("@/db/client", () => ({
  db: {
    insert: () => ({ values: insertValuesMock }),
    delete: () => ({ where: deleteWhereMock }),
  },
}));

const { createException, removeException } = await import("./exceptions");

const avery = { id: "user-avery", teamId: "team-avery" };

const baseInput = {
  scope: "whole-day" as const,
  goalId: null,
  startsOn: "2026-09-24",
  endsOn: "2026-09-24",
  reason: "Flu",
};

const insertedRow = {
  id: "exc-1",
  teamId: "team-avery",
  goalId: null,
  startsOn: "2026-09-24",
  endsOn: "2026-09-24",
  reason: "Flu",
  createdAt: new Date(),
};

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(avery);
  getGoalMock
    .mockReset()
    .mockResolvedValue({ id: "goal-1", teamId: "team-avery" });
  insertValuesMock
    .mockReset()
    .mockReturnValue({ returning: insertReturningMock });
  insertReturningMock.mockReset().mockResolvedValue([insertedRow]);
  deleteWhereMock
    .mockReset()
    .mockReturnValue({ returning: deleteReturningMock });
  deleteReturningMock.mockReset().mockResolvedValue([{ id: "exc-1" }]);
});

test("EXC-02 creates a whole-day exception on the caller's own team", async () => {
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
    expect.objectContaining({
      teamId: "team-avery",
      goalId: null,
      reason: "Flu",
    }),
  );
});

test("EXC-03 creates a goal-specific exception for one of the caller's goals", async () => {
  await createException({ ...baseInput, scope: "goal", goalId: "goal-1" });
  expect(getGoalMock).toHaveBeenCalledWith("team-avery", "goal-1");
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({ teamId: "team-avery", goalId: "goal-1" }),
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

test("EXC-06 removes one of the caller's exceptions", async () => {
  const result = await removeException("exc-1");
  expect(result).toEqual({ ok: true });
  expect(deleteWhereMock).toHaveBeenCalled();
});

test("EXC-09 / TEAM-06 a teammate's goal or exception id is rejected and nothing is written", async () => {
  requireUserMock.mockResolvedValue({ id: "user-blake", teamId: "team-blake" });
  getGoalMock.mockResolvedValue(null);
  deleteReturningMock.mockResolvedValue([]);

  await expect(
    createException({ ...baseInput, scope: "goal", goalId: "goal-1" }),
  ).resolves.toEqual({ ok: false, error: "Choose a goal." });
  expect(getGoalMock).toHaveBeenCalledWith("team-blake", "goal-1");
  expect(insertValuesMock).not.toHaveBeenCalled();

  await expect(removeException("exc-1")).resolves.toEqual({
    ok: false,
    error: "Exception not found.",
  });
});
