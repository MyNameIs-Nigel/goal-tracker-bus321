import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/goals", () => ({
  createGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  archiveGoal: vi.fn(),
  unarchiveGoal: vi.fn(),
  moveGoal: vi.fn(),
}));

const { default: GoalList } = await import("./GoalList");
const { archiveGoal, unarchiveGoal, moveGoal } =
  await import("@/lib/actions/goals");

function makeGoal(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(archiveGoal).mockReset();
  vi.mocked(unarchiveGoal).mockReset();
  vi.mocked(moveGoal).mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

test("GOAL-01 goals are grouped into Daily/Weekly/Monthly sections with an Archived section", () => {
  const goals = [
    makeGoal({ id: "d1", title: "Daily 1", cadence: "daily", sortOrder: 0 }),
    makeGoal({ id: "d2", title: "Daily 2", cadence: "daily", sortOrder: 1 }),
    makeGoal({ id: "w1", title: "Weekly 1", cadence: "weekly", sortOrder: 0 }),
    makeGoal({
      id: "m1",
      title: "Monthly 1",
      cadence: "monthly",
      sortOrder: 0,
    }),
    makeGoal({
      id: "a1",
      title: "Archived 1",
      endsOn: "2026-09-01",
    }),
  ];

  render(
    <GoalList
      initialGoals={goals}
      role="owner"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );

  expect(screen.getByText("Daily")).toBeInTheDocument();
  expect(screen.getByText("Weekly")).toBeInTheDocument();
  expect(screen.getByText("Monthly")).toBeInTheDocument();
  expect(screen.getByText("Archived (1)")).toBeInTheDocument();
  expect(screen.getByText("Archived 1")).toBeInTheDocument();
});

test("GOAL-11 non-owners see no add, edit, or archive controls", () => {
  const goals = [makeGoal()];
  render(
    <GoalList
      initialGoals={goals}
      role="viewer"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );

  expect(
    screen.queryByRole("button", { name: "Add goal" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Edit" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Archive" }),
  ).not.toBeInTheDocument();
});

test("GOAL-12 the owner sees an Add goal prompt when there are no goals", () => {
  render(
    <GoalList
      initialGoals={[]}
      role="owner"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );
  expect(screen.getByText("No goals yet.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add goal" })).toBeInTheDocument();
});

test("GOAL-12 a non-owner sees the owner's name when there are no goals", () => {
  render(
    <GoalList
      initialGoals={[]}
      role="viewer"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );
  expect(screen.getByText("Nigel hasn't added goals yet.")).toBeInTheDocument();
});

test("GOAL-07 archiving a goal moves it into the Archived section", async () => {
  const goal = makeGoal();
  vi.mocked(archiveGoal).mockResolvedValue({
    ok: true,
    goal: { ...goal, endsOn: "2026-09-24" },
  });

  render(
    <GoalList
      initialGoals={[goal]}
      role="owner"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Archive" }));
  expect(await screen.findByText("Archived (1)")).toBeInTheDocument();
});

test("GOAL-08 restoring an archived goal moves it back to its cadence section", async () => {
  const goal = makeGoal({ endsOn: "2026-09-01" });
  vi.mocked(unarchiveGoal).mockResolvedValue({
    ok: true,
    goal: { ...goal, endsOn: null },
  });

  render(
    <GoalList
      initialGoals={[goal]}
      role="owner"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );

  fireEvent.click(screen.getByText("Archived (1)"));
  fireEvent.click(screen.getByRole("button", { name: "Restore" }));

  await vi.waitFor(() =>
    expect(screen.queryByText(/Archived \(/)).not.toBeInTheDocument(),
  );
});

test("GOAL-10 Move up is disabled for the first goal in a cadence", () => {
  const goals = [
    makeGoal({ id: "a", title: "A", sortOrder: 0 }),
    makeGoal({ id: "b", title: "B", sortOrder: 1 }),
  ];
  render(
    <GoalList
      initialGoals={goals}
      role="owner"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );

  const moveUpButtons = screen.getAllByRole("button", { name: "Move up" });
  expect(moveUpButtons[0]).toBeDisabled();
  expect(moveUpButtons[1]).not.toBeDisabled();
});

test("GOAL-10 moving a goal applies the swapped sort order", async () => {
  const goals = [
    makeGoal({ id: "a", title: "A", sortOrder: 0 }),
    makeGoal({ id: "b", title: "B", sortOrder: 1 }),
    makeGoal({ id: "c", title: "C", sortOrder: 2 }),
  ];
  vi.mocked(moveGoal).mockResolvedValue({
    ok: true,
    updated: [
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ],
  });

  render(
    <GoalList
      initialGoals={goals}
      role="owner"
      ownerFirstName="Nigel"
      defaultStartsOn="2026-09-25"
    />,
  );

  const moveUpButtons = screen.getAllByRole("button", { name: "Move up" });
  fireEvent.click(moveUpButtons[2]);

  await vi.waitFor(() => {
    const titles = screen.getAllByText(/^[ABC]$/);
    expect(titles.map((el) => el.textContent)).toEqual(["A", "C", "B"]);
  });
});
