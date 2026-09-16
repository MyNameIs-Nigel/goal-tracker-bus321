import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/goals", () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
}));

const { default: GoalForm } = await import("./GoalForm");
const { createGoal, updateGoal, deleteGoal } =
  await import("@/lib/actions/goals");

const goal = {
  id: "goal-1",
  title: "Read 20 pages",
  description: "Any book, before bed",
  cadence: "daily" as const,
  startsOn: "2026-09-25",
  endsOn: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  hasCompletions: false,
};

beforeEach(() => {
  vi.mocked(createGoal).mockReset();
  vi.mocked(updateGoal).mockReset();
  vi.mocked(deleteGoal).mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

test("GOAL-02 saving a new goal calls createGoal and reports the result", async () => {
  vi.mocked(createGoal).mockResolvedValue({ ok: true, goal });
  const onSaved = vi.fn();

  render(
    <GoalForm
      defaultStartsOn="2026-09-25"
      onCancel={vi.fn()}
      onSaved={onSaved}
    />,
  );

  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Read 20 pages" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Any book, before bed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await screen.findByRole("button", { name: "Save" });
  expect(createGoal).toHaveBeenCalledWith({
    title: "Read 20 pages",
    description: "Any book, before bed",
    cadence: "daily",
    startsOn: "2026-09-25",
  });
  expect(onSaved).toHaveBeenCalledWith(goal);
});

test("GOAL-03 shows the inline error returned by the action and doesn't save", async () => {
  vi.mocked(createGoal).mockResolvedValue({
    ok: false,
    error: "Title is required",
  });
  const onSaved = vi.fn();

  render(
    <GoalForm
      defaultStartsOn="2026-09-25"
      onCancel={vi.fn()}
      onSaved={onSaved}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Title is required",
  );
  expect(onSaved).not.toHaveBeenCalled();
});

test("GOAL-04 editing an existing goal calls updateGoal with its id", async () => {
  vi.mocked(updateGoal).mockResolvedValue({
    ok: true,
    goal: { ...goal, title: "Read 30 pages" },
  });

  render(
    <GoalForm
      goal={goal}
      defaultStartsOn="2026-09-25"
      onCancel={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Read 30 pages" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await vi.waitFor(() => expect(updateGoal).toHaveBeenCalled());
  expect(updateGoal).toHaveBeenCalledWith(
    "goal-1",
    expect.objectContaining({ title: "Read 30 pages" }),
  );
});

test("GOAL-05 disables the cadence control and shows the hint once completed", () => {
  render(
    <GoalForm
      goal={{ ...goal, hasCompletions: true }}
      defaultStartsOn="2026-09-25"
      onCancel={vi.fn()}
      onSaved={vi.fn()}
    />,
  );

  expect(screen.getByRole("radio", { name: "Daily" })).toBeDisabled();
  expect(
    screen.getByText(
      "Cadence can't change once you've checked this off. Archive it and create a new goal.",
    ),
  ).toBeInTheDocument();
});

test("GOAL-09 a completed goal's form offers no Delete control", () => {
  render(
    <GoalForm
      goal={{ ...goal, hasCompletions: true }}
      defaultStartsOn="2026-09-25"
      onCancel={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

test("GOAL-09 deleting an uncompleted goal confirms, deletes, and reports it", async () => {
  vi.mocked(deleteGoal).mockResolvedValue({ ok: true });
  const onDeleted = vi.fn();

  render(
    <GoalForm
      goal={goal}
      defaultStartsOn="2026-09-25"
      onCancel={vi.fn()}
      onSaved={vi.fn()}
      onDeleted={onDeleted}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));

  await vi.waitFor(() => expect(onDeleted).toHaveBeenCalledWith("goal-1"));
});
