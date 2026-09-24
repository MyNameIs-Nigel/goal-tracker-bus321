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

test("AUTH-09 shows Avery, Blake, Casey and Load demo data under a Test sign-in caption", () => {
  render(<TestSignInButtons />);
  expect(screen.getByText("Test sign-in")).toBeInTheDocument();
  for (const name of ["Avery", "Blake", "Casey", "Load demo data"]) {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  }
});

test("AUTH-09 pressing Blake signs in as Blake and lands on /today", async () => {
  render(<TestSignInButtons />);
  fireEvent.click(screen.getByRole("button", { name: "Blake" }));

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));
  expect(fetch).toHaveBeenCalledWith(
    "/api/e2e/sign-in",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ student: "blake" }),
    }),
  );
});

test("AUTH-13 Load demo data reseeds with demo content, then signs in as Avery", async () => {
  render(<TestSignInButtons />);
  fireEvent.click(screen.getByRole("button", { name: "Load demo data" }));

  await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/today"));
  const calls = vi.mocked(fetch).mock.calls;
  expect(calls[0]).toEqual([
    "/api/e2e/reset",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ demo: true }),
    }),
  ]);
  expect(calls[1]).toEqual([
    "/api/e2e/sign-in",
    expect.objectContaining({ body: JSON.stringify({ student: "avery" }) }),
  ]);
});
