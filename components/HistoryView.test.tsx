import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import HistoryView from "./HistoryView";
import { buildHistoryData } from "@/lib/view/history";

const contract = { contractStart: "2026-09-19", contractEnd: null };
const readGoal = {
  id: "d3",
  title: "Read 20 pages",
  cadence: "daily" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const gymGoal = {
  id: "w1",
  title: "Gym",
  cadence: "weekly" as const,
  startsOn: "2026-09-01",
  endsOn: null,
  sortOrder: 0,
};
const flu = {
  id: "exc-1",
  goalId: null,
  startsOn: "2026-09-21",
  endsOn: "2026-09-21",
  reason: "Flu",
};

function september(
  today = "2026-09-30",
  doneDays = [19, 22, 23, 24, 25, 26, 27, 28, 29],
) {
  return buildHistoryData({
    month: "2026-09",
    today,
    goals: [readGoal, gymGoal],
    contract,
    completions: doneDays.map((day) => ({
      goalId: "d3",
      periodStart: `2026-09-${day}`,
    })),
    exceptions: [flu],
    partners: [
      { id: "alice", name: "Alice", image: null },
      { id: "bob", name: "Bob", image: null },
    ],
    checkins: [1, 2, 3].map((day) => ({
      userId: "alice",
      date: `2026-09-0${day}`,
      note: null,
      createdAt: "2026-09-01T00:00:00Z",
    })),
  });
}

test("HIST-01 the calendar shows each day with an accessible status and a legend", () => {
  render(<HistoryView data={september("2026-09-23", [19, 22])} />);
  expect(
    screen.getByRole("heading", { name: "September 2026" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("September 20, missed")).toBeInTheDocument();
  expect(screen.getByLabelText("September 21, excused")).toBeInTheDocument();
  expect(screen.getByLabelText("September 23, open")).toBeInTheDocument();
  expect(
    screen.getByLabelText("September 1, not counting"),
  ).toBeInTheDocument();
  const legend = screen.getByRole("list", { name: "Legend" });
  expect(legend).toHaveTextContent("Clean");
  expect(legend).toHaveTextContent("Missed");
  expect(legend).toHaveTextContent("Excused");
  expect(legend).toHaveTextContent("Open");
  expect(legend).toHaveTextContent("Not counting");
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    expect(screen.getByText(day)).toBeInTheDocument();
  }
});

test("HIST-02 month navigation links only where a month is offered", () => {
  const { unmount } = render(<HistoryView data={september("2026-10-05")} />);
  expect(
    screen.queryByRole("link", { name: "← August" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "October →" })).toHaveAttribute(
    "href",
    "/history?month=2026-10",
  );
  unmount();

  render(
    <HistoryView
      data={buildHistoryData({
        month: "2026-10",
        today: "2026-10-05",
        goals: [],
        contract,
        completions: [],
        exceptions: [],
        partners: [],
        checkins: [],
      })}
    />,
  );
  expect(screen.getByRole("link", { name: "← September" })).toHaveAttribute(
    "href",
    "/history?month=2026-09",
  );
  expect(
    screen.queryByRole("link", { name: "November →" }),
  ).not.toBeInTheDocument();
});

test("HIST-03 each day links to its day page", () => {
  render(<HistoryView data={september("2026-09-23")} />);
  expect(
    screen.getByLabelText("September 20, missed").closest("a"),
  ).toHaveAttribute("href", "/day/2026-09-20");
});

test("HIST-04 the month summary", () => {
  render(<HistoryView data={september()} />);
  expect(screen.getByText("2 failures")).toBeInTheDocument();
  expect(screen.getByText("Sep 20 · Read 20 pages")).toBeInTheDocument();
  expect(screen.getByText("Week of Sep 21 · Gym")).toBeInTheDocument();
  expect(screen.getByText("1 exception")).toBeInTheDocument();
  expect(screen.getByText("Sep 21 · Whole day · Flu")).toBeInTheDocument();
  expect(screen.getByText("82% complete")).toBeInTheDocument();
});

test("HIST-04 zero failures and nothing counted yet", () => {
  render(
    <HistoryView
      data={buildHistoryData({
        month: "2026-09",
        today: "2026-09-15",
        goals: [readGoal],
        contract,
        completions: [],
        exceptions: [],
        partners: [],
        checkins: [],
      })}
    />,
  );
  expect(screen.getByText("0 failures")).toBeInTheDocument();
  expect(screen.getByText("0 exceptions")).toBeInTheDocument();
  expect(screen.getByText("Nothing counted yet")).toBeInTheDocument();
});

test("HIST-05 the Weekly & monthly table lists each period with its status", () => {
  render(<HistoryView data={september()} />);
  const section = screen.getByRole("region", { name: "Weekly & monthly" });
  const rows = within(section).getAllByRole("row").slice(1); // skip header
  expect(rows).toHaveLength(4);
  expect(rows[0]).toHaveTextContent("Gym");
  expect(rows[0]).toHaveTextContent("Week of Sep 7");
  expect(rows[0]).toHaveTextContent("Not counting");
  expect(rows[2]).toHaveTextContent("Week of Sep 21");
  expect(rows[2]).toHaveTextContent("Missed");
  expect(rows[3]).toHaveTextContent("Pending");
});

test("HIST-05 the table is absent with no weekly or monthly goals", () => {
  render(
    <HistoryView
      data={buildHistoryData({
        month: "2026-09",
        today: "2026-09-30",
        goals: [readGoal],
        contract,
        completions: [],
        exceptions: [],
        partners: [],
        checkins: [],
      })}
    />,
  );
  expect(
    screen.queryByRole("region", { name: "Weekly & monthly" }),
  ).not.toBeInTheDocument();
});

test("PCI-09 the Partners block shows N of M days and a strip", () => {
  render(<HistoryView data={september("2026-09-15")} />);
  const section = screen.getByRole("region", { name: "Partners" });
  expect(section).toHaveTextContent("Alice — 3 of 15 days");
  expect(section).toHaveTextContent("Bob — 0 of 15 days");
  expect(
    within(section).getByLabelText("Alice, September 1, checked"),
  ).toBeInTheDocument();
  expect(
    within(section).getByLabelText("Alice, September 4, not checked"),
  ).toBeInTheDocument();
  expect(
    within(section).getByLabelText("Alice, September 16, not yet"),
  ).toBeInTheDocument();
});

test("HIST-06 no partners", () => {
  render(
    <HistoryView
      data={buildHistoryData({
        month: "2026-09",
        today: "2026-09-15",
        goals: [],
        contract,
        completions: [],
        exceptions: [],
        partners: [],
        checkins: [],
      })}
    />,
  );
  expect(screen.getByRole("region", { name: "Partners" })).toHaveTextContent(
    "No partners yet.",
  );
});

test("HOVER-06 the month summary boxes take the border-only accent", () => {
  const { container } = render(<HistoryView data={september()} />);
  for (const id of [
    "failures-heading",
    "exceptions-heading",
    "completion-heading",
  ]) {
    const box = container.querySelector(`#${id}`)?.closest("section");
    expect(box, id).toHaveClass("ui-hover-edge");
    // Nothing here is clickable, so it must never gain a fill.
    expect(box, id).not.toHaveClass("ui-hover-surface");
  }
});
