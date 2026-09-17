import { beforeEach, expect, test, vi } from "vitest";

const requireUserMock = vi.fn();
const nowMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();
const updateReturningMock = vi.fn();

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "Forbidden";
  }
}

vi.mock("@/lib/dal", () => ({ requireUser: requireUserMock, ForbiddenError }));
vi.mock("@/lib/clock", () => ({ now: nowMock, today: () => "2026-09-18" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db/client", () => ({
  db: { update: () => ({ set: updateSetMock }) },
}));

const { saveContractDates, saveDocument } = await import("./documents");

const owner = {
  id: "owner-1",
  role: "owner" as const,
  name: "Nigel Smith",
};
const NOW = new Date("2026-09-19T03:30:00Z");

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue(owner);
  nowMock.mockReset().mockReturnValue(NOW);
  updateSetMock.mockReset().mockReturnValue({ where: updateWhereMock });
  updateWhereMock.mockReset().mockReturnValue({
    returning: updateReturningMock,
  });
  updateReturningMock.mockReset().mockImplementation(async () => [
    {
      key: "contract",
      bodyHtml: updateSetMock.mock.calls.at(-1)?.[0]?.bodyHtml ?? "",
      updatedAt: NOW,
      updatedBy: "owner-1",
    },
  ]);
});

test("CV-02 the owner saves a document; updated_at and updated_by advance", async () => {
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
      updatedByName: "Nigel Smith",
    },
  });
  expect(updateSetMock).toHaveBeenCalledWith({
    bodyHtml: "<p>Hello <strong>bold</strong></p>",
    updatedAt: NOW,
    updatedBy: "owner-1",
  });
});

test("CV-03 what is stored is the sanitized HTML, even when the action is called directly", async () => {
  await saveDocument(
    "vision",
    '<p>Hi</p><script>alert(1)</script><a href="javascript:x" onclick="y">bad</a><a href="https://ok.example">ok</a>',
  );
  const stored = updateSetMock.mock.calls[0][0].bodyHtml as string;
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
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("saveDocument rejects an unknown key", async () => {
  const result = await saveDocument("other", "<p>x</p>");
  expect(result).toEqual({ ok: false, error: "Unknown document." });
  expect(updateSetMock).not.toHaveBeenCalled();
});

test("CV-07 the owner sets the contract dates", async () => {
  updateReturningMock.mockResolvedValue([
    { id: 1, contractStart: "2026-09-19", contractEnd: "2026-12-18" },
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
    { id: 1, contractStart: null, contractEnd: null },
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

test("CV-09 / ROLE-03 a partner or viewer invoking either save is rejected with Forbidden", async () => {
  for (const role of ["partner", "viewer"] as const) {
    requireUserMock.mockResolvedValue({ ...owner, role });
    await expect(saveDocument("vision", "<p>x</p>")).rejects.toThrow(
      "Forbidden",
    );
    await expect(saveContractDates("2026-09-19", "")).rejects.toThrow(
      "Forbidden",
    );
  }
  expect(updateSetMock).not.toHaveBeenCalled();
});
