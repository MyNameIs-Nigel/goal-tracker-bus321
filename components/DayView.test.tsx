import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/completions", () => ({ toggleCompletion: vi.fn() }));
vi.mock("@/lib/actions/exceptions", () => ({
  createException: vi.fn(),
  removeException: vi.fn(),
}));

const { default: DayView } = await import("./DayView");
const { toggleCompletion } = await import("@/lib/actions/completions");
const { createException, removeException } =
  await import("@/lib/actions/exceptions");

const noContract = { contractStart: null, contractEnd: null };

const dailyGoal = {
  id: "d1",
  title: "Read 20 pages",
  cadence: "daily" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-09-23",
    todayDate: "2026-09-23",
    role: "owner" as const,
    ownerFirstName: "Nigel",
    goals: [dailyGoal],
    completions: [],
    exceptions: [],
    contract: noContract,
    currentUserId: "owner-1",
    partners: [],
    checkins: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(toggleCompletion).mockReset();
  vi.mocked(createException).mockReset();
  vi.mocked(removeException).mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

test("DT-01 the header names the day", () => {
  render(<DayView {...baseProps()} />);
  expect(screen.getByText("Wednesday, September 23")).toBeInTheDocument();
});

test("DT-01 the contract day is shown", () => {
  render(
    <DayView
      {...baseProps({
        contract: { contractStart: "2026-09-19", contractEnd: "2026-12-18" },
      })}
    />,
  );
  expect(screen.getByText("Day 5 of 91")).toBeInTheDocument();
});

test("DT-02 active goals are grouped by section", () => {
  const weekly = {
    id: "w1",
    title: "Long run",
    cadence: "weekly" as const,
    startsOn: "2026-09-01",
    endsOn: null,
    sortOrder: 0,
  };
  render(<DayView {...baseProps({ goals: [dailyGoal, weekly] })} />);
  expect(screen.getByText("Read 20 pages")).toBeInTheDocument();
  expect(screen.getByText("Long run")).toBeInTheDocument();
  expect(screen.getByText("This week")).toBeInTheDocument();
  expect(screen.getByText(/due Sunday, Sep 27/)).toBeInTheDocument();
});

test("DT-03 owner checks off a daily goal", async () => {
  vi.mocked(toggleCompletion).mockResolvedValue({ ok: true, completed: true });
  render(<DayView {...baseProps()} />);

  fireEvent.click(screen.getByRole("button", { name: /Read 20 pages/ }));

  expect(await screen.findByText("Done")).toBeInTheDocument();
  expect(toggleCompletion).toHaveBeenCalledWith("d1", "2026-09-23");
});

test("DT-03 tapping again unchecks it", async () => {
  vi.mocked(toggleCompletion).mockResolvedValue({ ok: true, completed: false });
  render(
    <DayView
      {...baseProps({
        completions: [{ goalId: "d1", periodStart: "2026-09-23" }],
      })}
    />,
  );
  expect(screen.getByText("Done")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Read 20 pages/ }));

  expect(await screen.findByText("Pending")).toBeInTheDocument();
});

test("DT-06 future days show upcoming goals with no checkbox", () => {
  render(
    <DayView {...baseProps({ date: "2026-09-25", todayDate: "2026-09-23" })} />,
  );
  expect(screen.getByText("Upcoming")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Read 20 pages/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("This day hasn't happened yet")).toBeInTheDocument();
});

test("DT-05 a past day shows the editing banner", () => {
  render(
    <DayView {...baseProps({ date: "2026-09-21", todayDate: "2026-09-23" })} />,
  );
  expect(screen.getByText("Editing a past day")).toBeInTheDocument();
});

test("DT-07 non-owners see status text with no checkbox", () => {
  render(<DayView {...baseProps({ role: "viewer" })} />);
  expect(screen.getByText("Pending")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Read 20 pages/ }),
  ).not.toBeInTheDocument();
});

test("DT-09 statuses render distinctly", () => {
  render(
    <DayView
      {...baseProps({
        date: "2026-09-22",
        todayDate: "2026-09-23",
        goals: [
          dailyGoal,
          { ...dailyGoal, id: "d2", title: "D2" },
          { ...dailyGoal, id: "d3", title: "D3" },
        ],
        completions: [{ goalId: "d1", periodStart: "2026-09-22" }],
        exceptions: [
          {
            goalId: "d2",
            startsOn: "2026-09-22",
            endsOn: "2026-09-22",
            reason: "Sick",
          },
        ],
      })}
    />,
  );
  expect(screen.getByText("Done")).toBeInTheDocument();
  expect(screen.getByText("Excused — Sick")).toBeInTheDocument();
  expect(screen.getByText("Missed")).toBeInTheDocument();
});

test("DT-10 progress line reads N of M done", () => {
  render(
    <DayView
      {...baseProps({
        goals: [dailyGoal, { ...dailyGoal, id: "d2", title: "D2" }],
        completions: [{ goalId: "d1", periodStart: "2026-09-23" }],
      })}
    />,
  );
  expect(screen.getByText(/1 of 2 done/)).toBeInTheDocument();
});

test("DT-10 progress line reads All done", () => {
  render(
    <DayView
      {...baseProps({
        completions: [{ goalId: "d1", periodStart: "2026-09-23" }],
      })}
    />,
  );
  expect(screen.getByText(/All done/)).toBeInTheDocument();
});

test("DT-11 the streak line is shown", () => {
  render(
    <DayView
      {...baseProps({
        completions: [
          { goalId: "d1", periodStart: "2026-09-21" },
          { goalId: "d1", periodStart: "2026-09-22" },
        ],
        date: "2026-09-23",
        todayDate: "2026-09-23",
      })}
    />,
  );
  expect(screen.getByText(/2-day streak/)).toBeInTheDocument();
});

test("DT-12 the failures line is shown", () => {
  render(<DayView {...baseProps()} />);
  expect(screen.getByText(/failures in September/)).toBeInTheDocument();
});

test("DT-14 navigation links skip the forward link on today", () => {
  render(<DayView {...baseProps()} />);
  expect(screen.getByText("← Sep 22")).toBeInTheDocument();
  expect(screen.getByText("Today")).toBeInTheDocument();
  expect(screen.queryByText(/→$/)).not.toBeInTheDocument();
});

test("DT-14 navigation links include the forward link on a past day", () => {
  render(
    <DayView {...baseProps({ date: "2026-09-21", todayDate: "2026-09-23" })} />,
  );
  expect(screen.getByText("Sep 22 →")).toBeInTheDocument();
});

test("DT-15 the owner sees an empty-state prompt", () => {
  render(<DayView {...baseProps({ goals: [] })} />);
  expect(screen.getByText(/No goals yet\./)).toBeInTheDocument();
});

test("DT-15 a non-owner sees the owner's name", () => {
  render(<DayView {...baseProps({ goals: [], role: "viewer" })} />);
  expect(screen.getByText("Nigel hasn't added goals yet.")).toBeInTheDocument();
});

test("EXC-01 the owner sees a Mark an exception button; non-owners don't", () => {
  const { unmount } = render(<DayView {...baseProps({ role: "owner" })} />);
  expect(
    screen.getByRole("button", { name: "Mark an exception" }),
  ).toBeInTheDocument();
  unmount();

  render(<DayView {...baseProps({ role: "viewer" })} />);
  expect(
    screen.queryByRole("button", { name: "Mark an exception" }),
  ).not.toBeInTheDocument();
});

test("EXC-02 creating an exception excuses the goal immediately", async () => {
  vi.mocked(createException).mockResolvedValue({
    ok: true,
    exception: {
      id: "exc-1",
      goalId: null,
      startsOn: "2026-09-23",
      endsOn: "2026-09-23",
      reason: "Flu",
    },
  });
  render(<DayView {...baseProps()} />);

  fireEvent.click(screen.getByRole("button", { name: "Mark an exception" }));
  fireEvent.change(screen.getByLabelText("Reason"), {
    target: { value: "Flu" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Excused — Flu")).toBeInTheDocument();
});

test("EXC-06 removing an exception restores the goal's status", async () => {
  vi.mocked(removeException).mockResolvedValue({ ok: true });
  render(
    <DayView
      {...baseProps({
        exceptions: [
          {
            id: "exc-1",
            goalId: null,
            startsOn: "2026-09-23",
            endsOn: "2026-09-23",
            reason: "Flu",
          },
        ],
      })}
    />,
  );
  expect(screen.getByText("Excused — Flu")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Remove exception" }));

  await vi.waitFor(() => expect(removeException).toHaveBeenCalledWith("exc-1"));
  expect(await screen.findByText("Pending")).toBeInTheDocument();
});

test("EXC-06 the owner can remove an exception on a future (read-only) day too", () => {
  render(
    <DayView
      {...baseProps({
        date: "2026-09-25",
        todayDate: "2026-09-23",
        exceptions: [
          {
            id: "exc-1",
            goalId: null,
            startsOn: "2026-09-25",
            endsOn: "2026-09-25",
            reason: "Flu",
          },
        ],
      })}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Remove exception" }),
  ).toBeInTheDocument();
});

test("DT-16 the Accountability partners section renders for any role", () => {
  for (const role of ["owner", "partner", "viewer"] as const) {
    const { unmount } = render(<DayView {...baseProps({ role })} />);
    expect(
      screen.getByRole("heading", { name: "Accountability partners" }),
    ).toBeInTheDocument();
    unmount();
  }
});
