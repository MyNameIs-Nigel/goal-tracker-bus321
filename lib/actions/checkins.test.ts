import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
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

vi.mock("@/lib/dal", () => ({
  requireUser: requireUserMock,
  ForbiddenError,
  canPartner: (role: string) => role === "partner",
}));
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

const partner = { id: "partner-1", role: "partner" as const };
const owner = { id: "owner-1", role: "owner" as const };
const viewer = { id: "viewer-1", role: "viewer" as const };

const TODAY = "2026-09-23";
const NOW = new Date("2026-09-24T02:12:00Z");

const row = {
  id: "ci-1",
  userId: "partner-1",
  date: TODAY,
  note: null,
  createdAt: NOW,
  updatedAt: NOW,
};

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(partner);
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

test("PCI-02 a partner checks in for today, for their own user id", async () => {
  const result = await checkIn(TODAY);
  expect(result).toEqual({
    ok: true,
    checkin: {
      userId: "partner-1",
      date: TODAY,
      note: null,
      createdAt: NOW.toISOString(),
    },
  });
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "partner-1",
      date: TODAY,
      createdAt: NOW,
    }),
  );
});

test("PCI-08 a second check-in the same day is a no-op that returns the existing row", async () => {
  await checkIn(TODAY);
  await checkIn(TODAY);
  expect(onConflictMock).toHaveBeenCalledTimes(2);
  expect(selectWhereMock).toHaveBeenCalledTimes(2);
});

test("PCI-03 a partner saves and replaces today's note", async () => {
  const result = await saveNote(TODAY, "  Nice streak, keep it up ");
  expect(result).toEqual({
    ok: true,
    checkin: {
      userId: "partner-1",
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
  const result = await saveNote(TODAY, "Hi");
  expect(result).toEqual({ ok: false, error: "Check in first" });
});

test("PCI-04 a note over 280 characters is rejected and nothing is written", async () => {
  const result = await saveNote(TODAY, "x".repeat(281));
  expect(result).toEqual({
    ok: false,
    error: "Keep the note under 280 characters",
  });
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("PCI-05 / ROLE-04 a check-in or note for any day but today is rejected", async () => {
  await expect(checkIn("2026-09-21")).resolves.toEqual({
    ok: false,
    error: "You can only check in for today",
  });
  await expect(saveNote("2026-09-24", "Hi")).resolves.toEqual({
    ok: false,
    error: "You can only check in for today",
  });
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("ROLE-04 the row written is always the session user's (no user-id parameter)", async () => {
  requireUserMock.mockResolvedValue({ id: "partner-2", role: "partner" });
  selectWhereMock.mockResolvedValue([{ ...row, userId: "partner-2" }]);
  await checkIn(TODAY);
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({ userId: "partner-2" }),
  );
});

test("PCI-06 the owner and a viewer are rejected with Forbidden", async () => {
  for (const user of [owner, viewer]) {
    requireUserMock.mockResolvedValue(user);
    await expect(checkIn(TODAY)).rejects.toThrow("Forbidden");
    await expect(saveNote(TODAY, "Hi")).rejects.toThrow("Forbidden");
  }
  expect(insertValuesMock).not.toHaveBeenCalled();
  expect(updateSetMock).not.toHaveBeenCalled();
});
