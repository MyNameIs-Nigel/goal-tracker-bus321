import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/admin", () => ({ setUserDisabled: vi.fn() }));

import type { AdminUser } from "@/lib/queries/admin";

const { default: AdminUserList } = await import("./AdminUserList");
const { setUserDisabled } = await import("@/lib/actions/admin");

const users: AdminUser[] = [
  {
    id: "u-avery",
    name: "Avery Adams",
    email: "avery@e2e.local",
    image: null,
    disabled: false,
    isAdmin: true,
  },
  {
    id: "u-blake",
    name: "Blake Brown",
    email: "blake@e2e.local",
    image: null,
    disabled: false,
    isAdmin: false,
  },
];

beforeEach(() => vi.mocked(setUserDisabled).mockReset());

test("ADM-01 lists users with status and a Disable button only on non-admins", () => {
  render(<AdminUserList users={users} />);
  expect(screen.getByText("blake@e2e.local")).toBeTruthy();
  expect(screen.getAllByText("Active")).toHaveLength(2);
  expect(screen.getAllByRole("button", { name: /Disable/ })).toHaveLength(1);
  expect(
    screen.getByRole("button", { name: "Disable Blake Brown" }),
  ).toBeTruthy();
});

test("ADM-03/05 Disable flips the row to Disabled with an Enable button, and back", async () => {
  vi.mocked(setUserDisabled)
    .mockResolvedValueOnce({ ok: true, disabled: true })
    .mockResolvedValueOnce({ ok: true, disabled: false });
  render(<AdminUserList users={users} />);

  fireEvent.click(screen.getByRole("button", { name: "Disable Blake Brown" }));
  await waitFor(() => screen.getByText("Disabled"));
  expect(setUserDisabled).toHaveBeenCalledWith("u-blake", true);

  fireEvent.click(screen.getByRole("button", { name: "Enable Blake Brown" }));
  await waitFor(() => expect(screen.queryByText("Disabled")).toBeNull());
  expect(setUserDisabled).toHaveBeenCalledWith("u-blake", false);
});

test("ADM-07 an error from the action is shown and the row is unchanged", async () => {
  vi.mocked(setUserDisabled).mockResolvedValue({
    ok: false,
    error: "User not found.",
  });
  render(<AdminUserList users={users} />);
  fireEvent.click(screen.getByRole("button", { name: "Disable Blake Brown" }));
  await waitFor(() => screen.getByRole("alert"));
  expect(screen.getByRole("alert").textContent).toBe("User not found.");
  expect(screen.queryByText("Disabled")).toBeNull();
});
