import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/exceptions", () => ({ createException: vi.fn() }));

const { default: ExceptionDialog } = await import("./ExceptionDialog");
const { createException } = await import("@/lib/actions/exceptions");

const goals = [
  {
    id: "d1",
    title: "Read 20 pages",
    cadence: "daily" as const,
    startsOn: "2026-09-01",
    endsOn: null,
    sortOrder: 0,
  },
  {
    id: "d2",
    title: "Meditate",
    cadence: "daily" as const,
    startsOn: "2026-09-01",
    endsOn: null,
    sortOrder: 1,
  },
];

beforeEach(() => {
  vi.mocked(createException).mockReset();
});

test("EXC-02 defaults to whole-day scope with both dates on the page's date", () => {
  render(
    <ExceptionDialog
      date="2026-09-24"
      goals={goals}
      onCancel={vi.fn()}
      onCreated={vi.fn()}
    />,
  );
  expect(screen.getByLabelText("Whole day")).toBeChecked();
  expect(screen.getByLabelText("From")).toHaveValue("2026-09-24");
  expect(screen.getByLabelText("To")).toHaveValue("2026-09-24");
  expect(screen.queryByLabelText("Goal")).not.toBeInTheDocument();
});

test("EXC-03 switching to 'One goal' reveals the goal select", () => {
  render(
    <ExceptionDialog
      date="2026-09-24"
      goals={goals}
      onCancel={vi.fn()}
      onCreated={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByLabelText("One goal"));
  expect(screen.getByLabelText("Goal")).toBeInTheDocument();
  expect(
    screen.getByRole("option", { name: "Read 20 pages" }),
  ).toBeInTheDocument();
});

test("EXC-02 saving a whole-day exception calls createException and reports it", async () => {
  const exception = {
    id: "exc-1",
    goalId: null,
    startsOn: "2026-09-24",
    endsOn: "2026-09-24",
    reason: "Flu",
  };
  vi.mocked(createException).mockResolvedValue({ ok: true, exception });
  const onCreated = vi.fn();

  render(
    <ExceptionDialog
      date="2026-09-24"
      goals={goals}
      onCancel={vi.fn()}
      onCreated={onCreated}
    />,
  );
  fireEvent.change(screen.getByLabelText("Reason"), {
    target: { value: "Flu" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(exception));
  expect(createException).toHaveBeenCalledWith({
    scope: "whole-day",
    goalId: null,
    startsOn: "2026-09-24",
    endsOn: "2026-09-24",
    reason: "Flu",
  });
});

test("EXC-05 shows the inline error returned by the action", async () => {
  vi.mocked(createException).mockResolvedValue({
    ok: false,
    error: "A reason is required",
  });
  render(
    <ExceptionDialog
      date="2026-09-24"
      goals={goals}
      onCancel={vi.fn()}
      onCreated={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "A reason is required",
  );
});
