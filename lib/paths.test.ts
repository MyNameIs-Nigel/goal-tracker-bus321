import { expect, test } from "vitest";

import { isTeamId, teamPaths } from "./paths";

const BLAKE = "0e9f5c1a-2b3c-4d5e-8f60-718293a4b5c6";

test("DT-14 / HIST-03 your own team's pages are the top-level routes", () => {
  const paths = teamPaths(null);
  expect(paths.today).toBe("/today");
  expect(paths.day("2026-09-21")).toBe("/day/2026-09-21");
  expect(paths.contract).toBe("/contract");
  expect(paths.history()).toBe("/history");
  expect(paths.history("2026-09")).toBe("/history?month=2026-09");
});

test("DT-14 / HIST-03 a teammate's pages stay on their team", () => {
  const paths = teamPaths(BLAKE);
  expect(paths.today).toBe(`/team/${BLAKE}`);
  expect(paths.day("2026-09-21")).toBe(`/team/${BLAKE}/day/2026-09-21`);
  expect(paths.contract).toBe(`/team/${BLAKE}/contract`);
  expect(paths.history()).toBe(`/team/${BLAKE}/history`);
  expect(paths.history("2026-09")).toBe(`/team/${BLAKE}/history?month=2026-09`);
});

test("TEAM-05 only a well-formed id can name a team", () => {
  expect(isTeamId(BLAKE)).toBe(true);
  expect(isTeamId(BLAKE.toUpperCase())).toBe(true);
  expect(isTeamId("not-a-team")).toBe(false);
  expect(isTeamId(`${BLAKE}0`)).toBe(false);
  expect(isTeamId("")).toBe(false);
});
