import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import Loading from "@/components/TrackerLoading";
import ErrorPage from "./error";

test("LAUNCH-02 loading announces progress", () => {
  render(<Loading />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading your tracker");
});
test("LAUNCH-02 route failure can retry without exposing details", () => {
  const retry = vi.fn();
  render(
    <ErrorPage error={new Error("private database details")} retry={retry} />,
  );
  expect(screen.queryByText(/private database/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalledOnce();
});
