import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import ExportView from "./ExportView";
import { buildExport } from "@/lib/view/export";

const contract = { contractStart: "2026-09-19", contractEnd: "2026-11-19" };
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

function data(given = false) {
  return buildExport({
    ownerName: "Avery Adams",
    range: { from: "2026-09-17", to: "2026-09-30" },
    today: "2026-09-30",
    goals: [readGoal, gymGoal],
    contract,
    completions: [{ goalId: "d3", periodStart: "2026-09-19" }],
    exceptions: [
      {
        id: "e1",
        goalId: null,
        startsOn: "2026-09-21",
        endsOn: "2026-09-21",
        reason: "Flu",
      },
    ],
    partners: [{ id: "blake", name: "Blake Brown", image: null }],
    received: [
      {
        userId: "blake",
        date: "2026-09-22",
        note: "Nice work on the reading",
      },
    ],
    given: given
      ? [{ ownerName: "Blake Brown", date: "2026-09-22", note: "Keep going!" }]
      : null,
  });
}

const documents = { vision: "<p>Be a steady reader.</p>", contract: "" };

function renderView(given = false) {
  return render(
    <ExportView
      data={data(given)}
      documents={documents}
      given={given}
      csvHref="/export/csv?from=2026-09-17&to=2026-09-30"
    />,
  );
}

test("EXP-02 the header and the range form", () => {
  renderView();
  expect(
    screen.getByRole("heading", { level: 1, name: "Goal report" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Avery Adams · Team Avery")).toBeInTheDocument();
  expect(screen.getByText("Sep 17, 2026 – Sep 30, 2026")).toBeInTheDocument();
  expect(screen.getByLabelText("From")).toHaveValue("2026-09-17");
  expect(screen.getByLabelText("To")).toHaveValue("2026-09-30");
  const form = screen.getByRole("form", { name: "Report options" });
  expect(form).toHaveAttribute("action", "/export");
  expect(form).toHaveAttribute("method", "get");
  expect(within(form).getByRole("button", { name: "Update" })).toBeVisible();
});

test("EXP-06 the summary", () => {
  renderView();
  const summary = screen.getByRole("region", { name: "Summary" });
  expect(summary).toHaveTextContent("1 of 11 counting past periods done");
  expect(summary).toHaveTextContent("9% complete");
  expect(summary).toHaveTextContent("10 failures");
  expect(summary).toHaveTextContent("1 exception");
  expect(summary).toHaveTextContent("Longest streak: 1 day");
});

test("EXP-07 vision and contract, or Not written yet", () => {
  renderView();
  expect(
    within(screen.getByRole("region", { name: "Vision" })).getByText(
      "Be a steady reader.",
    ),
  ).toBeInTheDocument();
  expect(
    within(screen.getByRole("region", { name: "Contract" })).getByText(
      "Not written yet.",
    ),
  ).toBeInTheDocument();
});

test("EXP-08 goals are listed with their record", () => {
  renderView();
  const goals = screen.getByRole("region", { name: "Goals" });
  const items = within(goals).getAllByRole("listitem");
  expect(items[0]).toHaveTextContent("Read 20 pages");
  expect(items[0]).toHaveTextContent("Daily");
  expect(items[0]).toHaveTextContent("Started Sep 1");
  expect(items[0]).toHaveTextContent("1 of 10 done");
  expect(items[1]).toHaveTextContent("Gym");
});

test("EXP-09 the daily log marks each goal and grays days outside the contract", () => {
  renderView();
  const log = screen.getByRole("region", { name: "Daily log" });
  expect(
    within(log).getByRole("heading", { name: "September 2026" }),
  ).toBeInTheDocument();
  expect(
    within(log).getByRole("columnheader", { name: "Read 20 pages" }),
  ).toBeInTheDocument();
  const row = (label: string) =>
    within(log).getByRole("row", { name: new RegExp(`^${label}`) });
  expect(row("Fri, Sep 18")).toHaveTextContent("Outside contract");
  expect(row("Fri, Sep 18")).toHaveClass("text-muted");
  expect(row("Sat, Sep 19")).toHaveTextContent("Done");
  expect(row("Sun, Sep 20")).toHaveTextContent("Missed");
  expect(row("Mon, Sep 21")).toHaveTextContent("Excused");
  expect(row("Tue, Sep 22")).toHaveTextContent("Blake");
  const legend = within(log).getByRole("list", { name: "Legend" });
  for (const text of [
    "✓ Done",
    "✗ Missed",
    "E Excused",
    "· Pending",
    "– Not counting",
  ]) {
    expect(legend).toHaveTextContent(text);
  }
});

test("EXP-10 the weekly & monthly table", () => {
  renderView();
  const table = screen.getByRole("region", { name: "Weekly & monthly" });
  expect(table).toHaveTextContent("Week of Sep 21");
  expect(table).toHaveTextContent("Missed");
});

test("EXP-11 check-ins from partners with notes", () => {
  renderView();
  const received = screen.getByRole("region", {
    name: "Check-ins from partners",
  });
  expect(received).toHaveTextContent("Blake Brown — 1 day");
  expect(received).toHaveTextContent("Sep 22 — Nice work on the reading");
});

test("EXP-12 check-ins you made only when asked for", () => {
  const { unmount } = renderView();
  expect(
    screen.getByRole("checkbox", {
      name: "Include check-ins I made on teammates",
    }),
  ).not.toBeChecked();
  expect(
    screen.queryByRole("region", { name: "Check-ins you made" }),
  ).not.toBeInTheDocument();
  unmount();

  renderView(true);
  expect(
    screen.getByRole("checkbox", {
      name: "Include check-ins I made on teammates",
    }),
  ).toBeChecked();
  const given = screen.getByRole("region", { name: "Check-ins you made" });
  expect(given).toHaveTextContent("Team Blake — 1 day");
  expect(given).toHaveTextContent("Sep 22 — Keep going!");
});

test("EXP-13 Download PDF opens the print dialog; the controls don't print", () => {
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  renderView();
  fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
  expect(print).toHaveBeenCalledOnce();
  expect(screen.getByRole("form", { name: "Report options" })).toHaveClass(
    "print:hidden",
  );
  expect(
    screen.getByRole("button", { name: "Download PDF" }).closest("div"),
  ).toHaveClass("print:hidden");
  print.mockRestore();
});

test("EXP-14 Download CSV links to the CSV with the same range", () => {
  renderView();
  expect(screen.getByRole("link", { name: "Download CSV" })).toHaveAttribute(
    "href",
    "/export/csv?from=2026-09-17&to=2026-09-30",
  );
});
