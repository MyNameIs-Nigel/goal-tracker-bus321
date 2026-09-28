import { beforeEach, expect, test, vi } from "vitest";

const getSessionMock = vi.fn();
const ensureTeamMock = vi.fn();
const isAdminMock = vi.fn();

vi.mock("./auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/queries/teams", () => ({ ensureTeam: ensureTeamMock }));

vi.mock("@/lib/queries/admin", () => ({ isAdmin: isAdminMock }));

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

const { requireAdmin, requireUser } = await import("./dal");

beforeEach(() => {
  getSessionMock.mockReset();
  ensureTeamMock.mockReset().mockResolvedValue("team-avery");
  isAdminMock.mockReset().mockResolvedValue(false);
});

test("AUTH-01 requireUser redirects to / when there is no session", async () => {
  getSessionMock.mockResolvedValue(null);
  await expect(requireUser()).rejects.toThrow("REDIRECT:/");
  expect(ensureTeamMock).not.toHaveBeenCalled();
});

test("TEAM-01 requireUser returns the session user with their own team, created on first use", async () => {
  getSessionMock.mockResolvedValue({
    user: {
      id: "user-avery",
      name: "Avery Adams",
      email: "avery@e2e.local",
      image: null,
    },
    session: {},
  });
  await expect(requireUser()).resolves.toEqual({
    id: "user-avery",
    name: "Avery Adams",
    email: "avery@e2e.local",
    image: null,
    disabled: false,
    teamId: "team-avery",
  });
  expect(ensureTeamMock).toHaveBeenCalledWith("user-avery");
});

const signedIn = (extra: object = {}) =>
  getSessionMock.mockResolvedValue({
    user: {
      id: "user-avery",
      name: "Avery Adams",
      email: "avery@e2e.local",
      image: null,
      ...extra,
    },
    session: {},
  });

test("ADM-04 requireUser sends a disabled user to /disabled without creating a team", async () => {
  signedIn({ disabled: true });
  await expect(requireUser()).rejects.toThrow("REDIRECT:/disabled");
  expect(ensureTeamMock).not.toHaveBeenCalled();
});

test("ADM-02 requireAdmin is a 404 for a signed-in user who isn't an admin", async () => {
  signedIn();
  await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  expect(isAdminMock).toHaveBeenCalledWith("avery@e2e.local");
});

test("ADM-02 requireAdmin redirects to / with no session", async () => {
  getSessionMock.mockResolvedValue(null);
  await expect(requireAdmin()).rejects.toThrow("REDIRECT:/");
});

test("ADM-01 requireAdmin returns the user when their email is in admins", async () => {
  signedIn();
  isAdminMock.mockResolvedValue(true);
  await expect(requireAdmin()).resolves.toMatchObject({ id: "user-avery" });
});
