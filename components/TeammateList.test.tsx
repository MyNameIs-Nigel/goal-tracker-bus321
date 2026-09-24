import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/checkins", () => ({
  checkIn: vi.fn(),
  saveNote: vi.fn(),
}));

const { default: TeammateList } = await import("./TeammateList");
const { checkIn, saveNote } = await import("@/lib/actions/checkins");

const TODAY = "2026-09-23";

const blake = {
  teamId: "team-blake",
  name: "Blake Brown",
  image: null,
  summary: "2 of 3 done · 4-day streak",
  checkin: null,
};
const casey = {
  teamId: "team-casey",
  name: "Casey Clark",
  image: null,
  summary: "No goals yet",
  checkin: null,
};

// 02:30 UTC on 9/24 is 8:30 PM on 9/23 in America/Denver.
const blakeCheckin = {
  teamId: "team-blake",
  userId: "user-avery",
  date: TODAY,
  note: null,
  createdAt: "2026-09-24T02:30:00Z",
};

function renderList(teammates = [blake, casey]) {
  return render(
    <TeammateList
      date={TODAY}
      teammates={teammates}
      shareUrl="https://bus321.nigel-smith.dev"
    />,
  );
}

const row = (name: string) =>
  screen
    .getAllByRole("listitem")
    .find((item) => item.textContent?.includes(name))!;

beforeEach(() => {
  vi.mocked(checkIn).mockReset();
  vi.mocked(saveNote).mockReset();
});

test("PCI-01 every teammate is listed by name with their day and a Check in button", () => {
  renderList();
  expect(
    screen.getByRole("heading", { name: "Your teammates" }),
  ).toBeInTheDocument();
  const rows = screen.getAllByRole("listitem");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("Blake Brown");
  expect(rows[0]).toHaveTextContent("2 of 3 done · 4-day streak");
  expect(rows[1]).toHaveTextContent("Casey Clark");
  expect(rows[1]).toHaveTextContent("No goals yet");
  expect(
    within(rows[0]).getByRole("link", { name: "Blake Brown" }),
  ).toHaveAttribute("href", "/team/team-blake");
  expect(
    within(rows[0]).getByRole("button", { name: "Check in on Blake" }),
  ).toBeInTheDocument();
  expect(
    within(rows[1]).getByRole("button", { name: "Check in on Casey" }),
  ).toBeInTheDocument();
  expect(screen.getByText("0 of 2 checked")).toBeInTheDocument();
});

test("PCI-02 one tap checks in: the button becomes Checked ✓ with the time, and the count moves", async () => {
  vi.mocked(checkIn).mockResolvedValue({ ok: true, checkin: blakeCheckin });
  renderList();

  fireEvent.click(screen.getByRole("button", { name: "Check in on Blake" }));

  await waitFor(() =>
    expect(row("Blake Brown")).toHaveTextContent("Checked ✓ 8:30 PM"),
  );
  expect(checkIn).toHaveBeenCalledWith("team-blake", TODAY);
  expect(
    screen.queryByRole("button", { name: "Check in on Blake" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("1 of 2 checked")).toBeInTheDocument();
});

test("PCI-03 a note is optional: Add a note, save it, and it shows on the row", async () => {
  vi.mocked(saveNote).mockResolvedValue({
    ok: true,
    checkin: { ...blakeCheckin, note: "Nice streak, keep it up" },
  });
  renderList([{ ...blake, checkin: blakeCheckin }, casey]);

  expect(screen.queryByLabelText("Note for Blake")).not.toBeInTheDocument();
  fireEvent.click(
    within(row("Blake Brown")).getByRole("button", { name: "Add a note" }),
  );
  fireEvent.change(screen.getByLabelText("Note for Blake"), {
    target: { value: "Nice streak, keep it up" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));

  await waitFor(() =>
    expect(saveNote).toHaveBeenCalledWith(
      "team-blake",
      TODAY,
      "Nice streak, keep it up",
    ),
  );
  await waitFor(() =>
    expect(screen.queryByLabelText("Note for Blake")).not.toBeInTheDocument(),
  );
  expect(row("Blake Brown")).toHaveTextContent("Nice streak, keep it up");
  expect(
    within(row("Blake Brown")).getByRole("button", { name: "Edit note" }),
  ).toBeInTheDocument();
});

test("PCI-04 a note over 280 characters shows the error and is not sent", async () => {
  renderList([{ ...blake, checkin: blakeCheckin }, casey]);
  fireEvent.click(screen.getByRole("button", { name: "Add a note" }));
  fireEvent.change(screen.getByLabelText("Note for Blake"), {
    target: { value: "x".repeat(281) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));

  expect(
    await screen.findByText("Keep the note under 280 characters"),
  ).toBeInTheDocument();
  expect(saveNote).not.toHaveBeenCalled();
});

test("PCI-07 no teammates yet — share the link", () => {
  renderList([]);
  expect(
    screen.getByText("No teammates yet. Share the link:"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("https://bus321.nigel-smith.dev"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  expect(screen.queryByText(/of 0 checked/)).not.toBeInTheDocument();
});

test("PCI-08 a double tap sends one check-in and shows one check", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(checkIn).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }) as never,
  );
  renderList();

  const button = screen.getByRole("button", { name: "Check in on Blake" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(button).toBeDisabled());
  expect(checkIn).toHaveBeenCalledTimes(1);

  resolve({ ok: true, checkin: blakeCheckin });
  await waitFor(() =>
    expect(screen.getAllByText(/Checked ✓ 8:30 PM/)).toHaveLength(1),
  );
});
