import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const pathnameMock = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: pathnameMock }));

const { default: TeamNav } = await import("./TeamNav");

const TEAM = "0e9f5c1a-2b3c-4d5e-8f60-718293a4b5c6";

test("TEAM-09 a teammate's pages are labelled with their team and link within it", () => {
  pathnameMock.mockReturnValue(`/team/${TEAM}/contract`);
  render(<TeamNav teamId={TEAM} teamName="Team Blake" />);

  const nav = screen.getByRole("navigation", { name: "Team Blake" });
  expect(nav).toHaveTextContent("Team Blake");
  expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
    "href",
    `/team/${TEAM}`,
  );
  expect(screen.getByRole("link", { name: "Contract" })).toHaveAttribute(
    "href",
    `/team/${TEAM}/contract`,
  );
  expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
    "href",
    `/team/${TEAM}/history`,
  );
  expect(screen.getByRole("link", { name: "Contract" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute(
    "aria-current",
  );
});

test("TEAM-09 a teammate's day pages count as their Today", () => {
  pathnameMock.mockReturnValue(`/team/${TEAM}/day/2026-09-21`);
  render(<TeamNav teamId={TEAM} teamName="Team Blake" />);
  expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
