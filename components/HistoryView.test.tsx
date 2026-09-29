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
      { id: "blake", name: "Blake Brown", image: null },
      { id: "casey", name: "Casey Clark", image: null },
    ],
    checkins: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-19"].map(
      (date) => ({ userId: "blake", date }),
    ),
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
    screen.getByLabelText("September 1, outside contract"),
  ).toBeInTheDocument();
  const legend = screen.getByRole("list", { name: "Legend" });
  expect(legend).toHaveTextContent("Clean");
  expect(legend).toHaveTextContent("Missed");
  expect(legend).toHaveTextContent("Excused");
  expect(legend).toHaveTextContent("Open");
  expect(legend).toHaveTextContent("Not counting");
  expect(legend).toHaveTextContent("Outside contract");
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

test("HIST-03 a teammate's history links stay on their team", () => {
  const team = "0e9f5c1a-2b3c-4d5e-8f60-718293a4b5c6";
  render(<HistoryView data={september("2026-10-05")} teamId={team} />);
  expect(
    screen.getByLabelText("September 20, missed").closest("a"),
  ).toHaveAttribute("href", `/team/${team}/day/2026-09-20`);
  expect(screen.getByRole("link", { name: "October →" })).toHaveAttribute(
    "href",
    `/team/${team}/history?month=2026-10`,
  );
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

test("PCI-09 the Partners block shows N of M contract days and a contribution grid", () => {
  render(<HistoryView data={september("2026-09-23")} />);
  const section = screen.getByRole("region", { name: "Partners" });
  expect(section).toHaveTextContent("Sep 19 – Sep 23");
  // Blake's check-ins on 9/1–9/3 are before the contract and don't count.
  expect(section).toHaveTextContent("Blake Brown — 1 of 5 days");
  expect(section).toHaveTextContent("Casey Clark — 0 of 5 days");
  expect(
    within(section).getByLabelText("Blake Brown, September 19, checked"),
  ).toBeInTheDocument();
  expect(
    within(section).getByLabelText("Blake Brown, September 20, not checked"),
  ).toBeInTheDocument();
  expect(
    within(section).queryByLabelText("Blake Brown, September 24, not yet"),
  ).not.toBeInTheDocument(); // no contract end: the window stops at today
  expect(
    within(section).queryByLabelText("Blake Brown, September 18, not checked"),
  ).not.toBeInTheDocument();
  const grid = within(section).getByRole("table", {
    name: "Blake Brown's check-ins",
  });
  expect(within(grid).getAllByRole("row")).toHaveLength(7);
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

test("HIST-09 a day outside the contract is grayed out with a solid gray dot", () => {
  render(<HistoryView data={september("2026-09-23")} />);
  const outside = screen.getByLabelText("September 18, outside contract");
  expect(outside).toHaveClass("bg-border/50");
  expect(outside.querySelector("[data-dot]")).toHaveClass("bg-muted");
  const legend = screen.getByRole("list", { name: "Legend" });
  const legendDot = within(legend)
    .getByText("Outside contract")
    .querySelector("[data-dot]");
  expect(legendDot).toHaveClass("bg-muted");
  const notCounting = within(legend)
    .getByText("Not counting")
    .querySelector("[data-dot]");
  expect(notCounting).toHaveClass("border");
  expect(notCounting).not.toHaveClass("bg-muted");
});

test("HIST-10 your own history links to the export; a teammate's does not", () => {
  const { unmount } = render(<HistoryView data={september()} />);
  expect(screen.getByRole("link", { name: "Export report" })).toHaveAttribute(
    "href",
    "/export",
  );
  unmount();
  render(
    <HistoryView
      data={september()}
      teamId="0e9f5c1a-2b3c-4d5e-8f60-718293a4b5c6"
    />,
  );
  expect(
    screen.queryByRole("link", { name: "Export report" }),
  ).not.toBeInTheDocument();
});
