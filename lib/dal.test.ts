import { beforeEach, expect, test, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("./auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

const { canPartner, requireOwner, requirePartner, requireUser } =
  await import("./dal");

function sessionFor(role: "owner" | "partner" | "viewer") {
  return {
    user: {
      id: `id-${role}`,
      name: `Test ${role}`,
      email: `${role}@example.com`,
      image: null,
      role,
    },
    session: {},
  };
}

beforeEach(() => {
  getSessionMock.mockReset();
});

test("canPartner is true for partner and owner, false for viewer", () => {
  expect(canPartner("partner")).toBe(true);
  expect(canPartner("owner")).toBe(true);
  expect(canPartner("viewer")).toBe(false);
});

test("AUTH-01 requireUser redirects to / when there is no session", async () => {
  getSessionMock.mockResolvedValue(null);
  await expect(requireUser()).rejects.toThrow("REDIRECT:/");
});

test("requireUser returns the session user, including role", async () => {
  getSessionMock.mockResolvedValue(sessionFor("viewer"));
  await expect(requireUser()).resolves.toMatchObject({
    email: "viewer@example.com",
    role: "viewer",
  });
});

test("ROLE-03 requirePartner throws Forbidden for a viewer", async () => {
  getSessionMock.mockResolvedValue(sessionFor("viewer"));
  await expect(requirePartner()).rejects.toThrow("Forbidden");
});

test("requirePartner succeeds for a partner and for the owner", async () => {
  getSessionMock.mockResolvedValue(sessionFor("partner"));
  await expect(requirePartner()).resolves.toMatchObject({ role: "partner" });

  getSessionMock.mockResolvedValue(sessionFor("owner"));
  await expect(requirePartner()).resolves.toMatchObject({ role: "owner" });
});

test("ROLE-02 requireOwner is notFound() for a viewer or a partner", async () => {
  getSessionMock.mockResolvedValue(sessionFor("viewer"));
  await expect(requireOwner()).rejects.toThrow("NOT_FOUND");

  getSessionMock.mockResolvedValue(sessionFor("partner"));
  await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
});

test("requireOwner succeeds for the owner", async () => {
  getSessionMock.mockResolvedValue(sessionFor("owner"));
  await expect(requireOwner()).resolves.toMatchObject({ role: "owner" });
});
