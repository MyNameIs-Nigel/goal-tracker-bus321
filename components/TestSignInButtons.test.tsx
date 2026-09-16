import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const { default: TestSignInButtons } = await import("./TestSignInButtons");

beforeEach(() => {
  pushMock.mockReset();
  refreshMock.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("AUTH-09 shows Owner, Partner and Viewer under a Test sign-in caption", () => {
  render(<TestSignInButtons />);
  expect(screen.getByText("Test sign-in")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Owner" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Partner" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Viewer" })).toBeInTheDocument();
});

test("pressing Partner signs in as the partner test account and lands on /today", async () => {
  render(<TestSignInButtons />);
  fireEvent.click(screen.getByRole("button", { name: "Partner" }));

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));

  expect(fetch).toHaveBeenCalledWith(
    "/api/e2e/sign-in",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ role: "partner" }),
    }),
  );
});
