import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import UserMenu from "./UserMenu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth-client", () => ({ signOut: vi.fn() }));
const props = {
  name: "Test Viewer",
  email: "viewer@e2e.local",
  image: null,
  role: "viewer" as const,
};
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
function open() {
  render(<UserMenu {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "User menu" }));
}
test("THEME-01 appearance choices appear above sign out", () => {
  open();
  expect(screen.getByRole("group", { name: "Appearance" })).toBeVisible();
  expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
  expect(screen.getAllByRole("radio")).toHaveLength(3);
  expect(
    screen
      .getByRole("group", { name: "Appearance" })
      .compareDocumentPosition(
        screen.getByRole("button", { name: "Sign out" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
test("THEME-02 selecting a theme updates the document and saves the choice", () => {
  open();
  fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("bus321-theme")).toBe("dark");
});
test("THEME-04 Escape returns focus and outside clicks dismiss", () => {
  open();
  fireEvent.keyDown(screen.getByRole("radio", { name: "System" }), {
    key: "Escape",
  });
  expect(
    screen.queryByRole("group", { name: "Appearance" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "User menu" })).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "User menu" }));
  fireEvent.pointerDown(document.body);
  expect(
    screen.queryByRole("group", { name: "Appearance" }),
  ).not.toBeInTheDocument();
});
test("THEME-05 blocked storage does not prevent changing appearance", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  open();
  fireEvent.click(screen.getByRole("radio", { name: "Light" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  vi.restoreAllMocks();
});
