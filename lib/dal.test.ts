import { beforeEach, expect, test, vi } from "vitest";

const getSessionMock = vi.fn();
const ensureTeamMock = vi.fn();

vi.mock("./auth", () => ({
  auth: { api: { getSession: getSessionMock } },
}));

vi.mock("@/lib/queries/teams", () => ({ ensureTeam: ensureTeamMock }));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

const { requireUser } = await import("./dal");

beforeEach(() => {
  getSessionMock.mockReset();
  ensureTeamMock.mockReset().mockResolvedValue("team-avery");
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
    teamId: "team-avery",
  });
  expect(ensureTeamMock).toHaveBeenCalledWith("user-avery");
});
