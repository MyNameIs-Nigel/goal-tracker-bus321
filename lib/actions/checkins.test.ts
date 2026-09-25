import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const getTeamMock = vi.fn();
const todayMock = vi.fn();
const nowMock = vi.fn();

const insertValuesMock = vi.fn();
const onConflictMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();
const updateReturningMock = vi.fn();
const selectWhereMock = vi.fn();

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock, ForbiddenError }));
vi.mock("@/lib/queries/teams", () => ({ getTeam: getTeamMock }));
vi.mock("@/lib/clock", () => ({ today: todayMock, now: nowMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/db/client", () => ({
  db: {
    insert: () => ({ values: insertValuesMock }),
    update: () => ({ set: updateSetMock }),
    select: () => ({ from: () => ({ where: selectWhereMock }) }),
  },
}));

const { checkIn, saveNote } = await import("./checkins");

const avery = { id: "user-avery", teamId: "team-avery" };
const blakesTeam = {
  id: "team-blake",
  ownerId: "user-blake",
  ownerName: "Blake Brown",
  ownerImage: null,
  contractStart: null,
  contractEnd: null,
};

const TODAY = "2026-09-23";
const NOW = new Date("2026-09-24T02:12:00Z");

const row = {
  id: "ci-1",
  teamId: "team-blake",
  userId: "user-avery",
  date: TODAY,
  note: null,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(avery);
  getTeamMock.mockReset().mockResolvedValue(blakesTeam);
  todayMock.mockReset().mockReturnValue(TODAY);
  nowMock.mockReset().mockReturnValue(NOW);
  insertValuesMock.mockReset().mockReturnValue({
    onConflictDoNothing: onConflictMock,
  });
  onConflictMock.mockReset().mockResolvedValue(undefined);
  selectWhereMock.mockReset().mockResolvedValue([row]);
  updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
  updateWhereMock.mockReset().mockReturnValue({
    returning: updateReturningMock,
  });
  updateReturningMock
    .mockReset()
    .mockResolvedValue([{ ...row, note: "Nice streak, keep it up" }]);
});

test("PCI-02 checks in on a teammate's team for today, as the session user", async () => {
  const result = await checkIn("team-blake", TODAY);
  expect(result).toEqual({
    ok: true,
    checkin: {
      teamId: "team-blake",
      userId: "user-avery",
      date: TODAY,
      note: null,
      createdAt: NOW.toISOString(),
    },
  });
  expect(getTeamMock).toHaveBeenCalledWith("team-blake");
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({
      teamId: "team-blake",
      userId: "user-avery",
      date: TODAY,
      createdAt: NOW,
    }),
  );
});

test("PCI-08 a second check-in the same day is a no-op that returns the existing row", async () => {
  await checkIn("team-blake", TODAY);
  await checkIn("team-blake", TODAY);
  expect(onConflictMock).toHaveBeenCalledTimes(2);
  expect(selectWhereMock).toHaveBeenCalledTimes(2);
});

test("PCI-03 saves and replaces today's note", async () => {
  const result = await saveNote(
    "team-blake",
    TODAY,
    "  Nice streak, keep it up ",
  );
  expect(result).toEqual({
    ok: true,
    checkin: {
      teamId: "team-blake",
      userId: "user-avery",
      date: TODAY,
      note: "Nice streak, keep it up",
      createdAt: NOW.toISOString(),
    },
  });
  expect(updateSetMock).toHaveBeenCalledWith(
    expect.objectContaining({ note: "Nice streak, keep it up" }),
  );
});

test("PCI-03 saving a note before checking in fails", async () => {
  updateReturningMock.mockResolvedValue([]);
  const result = await saveNote("team-blake", TODAY, "Hi");
  expect(result).toEqual({ ok: false, error: "Check in first" });
});

test("PCI-04 a note over 280 characters is rejected and nothing is written", async () => {
  const result = await saveNote("team-blake", TODAY, "x".repeat(281));
  expect(result).toEqual({
    ok: false,
    error: "Keep the note under 280 characters",
  });
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("PCI-05 a check-in or note for any day but today is rejected", async () => {
  await expect(checkIn("team-blake", "2026-09-21")).resolves.toEqual({
    ok: false,
    error: "You can only check in for today",
  });
  await expect(saveNote("team-blake", "2026-09-24", "Hi")).resolves.toEqual({
    ok: false,
    error: "You can only check in for today",
  });
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("PCI-05 the partner written is always the session user (no user-id parameter)", async () => {
  requireUserMock.mockResolvedValue({ id: "user-casey", teamId: "team-casey" });
  selectWhereMock.mockResolvedValue([{ ...row, userId: "user-casey" }]);
  await checkIn("team-blake", TODAY);
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "user-casey" }),
  );
  expect(checkIn.length).toBe(2);
});

test("PCI-06 / TEAM-07 checking in on your own team throws Forbidden", async () => {
  getTeamMock.mockResolvedValue({
    ...blakesTeam,
    id: "team-avery",
    ownerId: "user-avery",
    ownerName: "Avery Adams",
  });
  await expect(checkIn("team-avery", TODAY)).rejects.toThrow("Forbidden");
  await expect(saveNote("team-avery", TODAY, "Hi")).rejects.toThrow(
    "Forbidden",
  );
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("an unknown team is 'Team not found.' and nothing is written", async () => {
  getTeamMock.mockResolvedValue(null);
  await expect(checkIn("nope", TODAY)).resolves.toEqual({
    ok: false,
    error: "Team not found.",
  });
  await expect(saveNote("nope", TODAY, "Hi")).resolves.toEqual({
    ok: false,
    error: "Team not found.",
  });
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(updateSetMock).not.toHaveBeenCalled();
});
