import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const nowMock = vi.fn();

const insertValuesMock = vi.fn();
const onConflictMock = vi.fn();
const insertReturningMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();
const updateReturningMock = vi.fn();

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/clock", () => ({ now: nowMock, today: () => "2026-09-18" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db/client", () => ({
  db: {
    insert: () => ({ values: insertValuesMock }),
    update: () => ({ set: updateSetMock }),
  },
}));

const { saveContractDates, saveDocument } = await import("./documents");

const avery = { id: "user-avery", teamId: "team-avery", name: "Avery Adams" };
const NOW = new Date("2026-09-19T03:30:00Z");

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(avery);
  nowMock.mockReset().mockReturnValue(NOW);
  insertValuesMock
    .mockReset()
    .mockReturnValue({ onConflictDoUpdate: onConflictMock });
  onConflictMock
    .mockReset()
    .mockReturnValue({ returning: insertReturningMock });
  insertReturningMock.mockReset().mockImplementation(async () => [
    {
      teamId: "team-avery",
      key: insertValuesMock.mock.calls.at(-1)?.[0]?.key ?? "contract",
      bodyHtml: insertValuesMock.mock.calls.at(-1)?.[0]?.bodyHtml ?? "",
      updatedAt: NOW,
    },
  ]);
  updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
  updateWhereMock.mockReset().mockReturnValue({
    returning: updateReturningMock,
  });
  updateReturningMock.mockReset();
});

test("CV-02 saving a document upserts it on the caller's own team; updated_at advances", async () => {
  const result = await saveDocument(
    "contract",
    "<p>Hello <strong>bold</strong></p>",
  );
  expect(result).toEqual({
    ok: true,
    document: {
      key: "contract",
      bodyHtml: "<p>Hello <strong>bold</strong></p>",
      updatedAt: NOW.toISOString(),
    },
  });
  expect(insertValuesMock).toHaveBeenCalledWith({
    teamId: "team-avery",
    key: "contract",
    bodyHtml: "<p>Hello <strong>bold</strong></p>",
    updatedAt: NOW,
  });
  expect(onConflictMock).toHaveBeenCalledWith(
    expect.objectContaining({
      set: { bodyHtml: "<p>Hello <strong>bold</strong></p>", updatedAt: NOW },
    }),
  );
});

test("CV-03 what is stored is the sanitized HTML, even when the action is called directly", async () => {
  await saveDocument(
    "vision",
    '<p>Hi</p><script>alert(1)</script><a href="javascript:x" onclick="y">bad</a><a href="https://ok.example">ok</a>',
  );
  const stored = insertValuesMock.mock.calls[0][0].bodyHtml as string;
  expect(stored).toContain("<p>Hi</p>");
  expect(stored).not.toContain("<script");
  expect(stored).not.toContain("onclick");
  expect(stored).not.toContain("javascript:");
  expect(stored).toContain(
    '<a href="https://ok.example" rel="noopener noreferrer" target="_blank">ok</a>',
  );
});

test("CV-04 over 20,000 characters is rejected and nothing is written", async () => {
  const result = await saveDocument("vision", `<p>${"x".repeat(20_000)}</p>`);
  expect(result).toEqual({
    ok: false,
    error: "This is too long — keep it under 20,000 characters",
  });
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("saveDocument rejects an unknown key", async () => {
  const result = await saveDocument("other", "<p>x</p>");
  expect(result).toEqual({ ok: false, error: "Unknown document." });
  expect(insertValuesMock).not.toHaveBeenCalled();
});

test("CV-07 sets the contract dates on the caller's team", async () => {
  updateReturningMock.mockResolvedValue([
    {
      id: "team-avery",
      contractStart: "2026-09-19",
      contractEnd: "2026-12-18",
    },
  ]);
  const result = await saveContractDates("2026-09-19", "2026-12-18");
  expect(result).toEqual({
    ok: true,
    contract: { contractStart: "2026-09-19", contractEnd: "2026-12-18" },
  });
  expect(updateSetMock).toHaveBeenCalledWith({
    contractStart: "2026-09-19",
    contractEnd: "2026-12-18",
    updatedAt: NOW,
  });
});

test("CV-07 end before start is rejected and nothing is written", async () => {
  const result = await saveContractDates("2026-09-19", "2026-09-18");
  expect(result).toEqual({
    ok: false,
    error: "End date can't be before start date",
  });
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("CV-07 empty dates clear the value; malformed dates are rejected", async () => {
  updateReturningMock.mockResolvedValue([
    { id: "team-avery", contractStart: null, contractEnd: null },
  ]);
  await expect(saveContractDates("", "")).resolves.toEqual({
    ok: true,
    contract: { contractStart: null, contractEnd: null },
  });
  await expect(saveContractDates("2026-02-30", "")).resolves.toEqual({
    ok: false,
    error: "Enter a valid date",
  });
});

test("CV-09 / TEAM-06 the saves take no team id: they always write the caller's own team", async () => {
  requireUserMock.mockResolvedValue({
    id: "user-blake",
    teamId: "team-blake",
    name: "Blake Brown",
  });
  await saveDocument("vision", "<p>x</p>");
  expect(insertValuesMock).toHaveBeenCalledWith(
    expect.objectContaining({ teamId: "team-blake" }),
  );
  expect(saveDocument.length).toBe(2);
  expect(saveContractDates.length).toBe(2);
});
