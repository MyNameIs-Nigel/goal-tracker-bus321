import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/checkins", () => ({
  checkIn: vi.fn(),
  saveNote: vi.fn(),
}));

const { default: PartnerCheckins } = await import("./PartnerCheckins");
const { checkIn, saveNote } = await import("@/lib/actions/checkins");

const alice = { id: "alice", name: "Alice Adams", image: null };
const bob = { id: "bob", name: "Bob Brown", image: null };

const aliceCheckin = {
  userId: "alice",
  date: "2026-09-23",
  note: null,
  createdAt: "2026-09-24T02:12:00Z", // 8:12 PM Denver on 9/23
};

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-09-23",
    todayDate: "2026-09-23",
    role: "viewer" as const,
    currentUserId: "viewer-1",
    partners: [alice, bob],
    checkins: [aliceCheckin],
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(checkIn).mockReset();
  vi.mocked(saveNote).mockReset();
});

test("DT-16 the section is titled Accountability partners", () => {
  render(<PartnerCheckins {...baseProps()} />);
  expect(
    screen.getByRole("heading", { name: "Accountability partners" }),
  ).toBeInTheDocument();
});

test("PCI-01 partners are listed with their status and Denver time", () => {
  render(<PartnerCheckins {...baseProps()} />);
  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Alice Adams");
  expect(rows[0]).toHaveTextContent("Checked ✓ 8:12 PM");
  expect(rows[1]).toHaveTextContent("Bob Brown");
  expect(rows[1]).toHaveTextContent("Not yet");
});

test("PCI-02 a partner checks in and the button becomes Checked ✓ with a note field", async () => {
  vi.mocked(checkIn).mockResolvedValue({
    ok: true,
    checkin: {
      userId: "bob",
      date: "2026-09-23",
      note: null,
      createdAt: "2026-09-24T02:30:00Z",
    },
  });
  render(
    <PartnerCheckins
      {...baseProps({ role: "partner", currentUserId: "bob" })}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "I checked today" }));

  await waitFor(() =>
    expect(screen.getByText("Checked ✓ 8:30 PM")).toBeInTheDocument(),
  );
  expect(checkIn).toHaveBeenCalledWith("2026-09-23");
  expect(
    screen.queryByRole("button", { name: "I checked today" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Leave a note (optional)")).toBeInTheDocument();
});

test("PCI-03 a partner leaves a note and it is shown under their name", async () => {
  vi.mocked(saveNote).mockResolvedValue({
    ok: true,
    checkin: { ...aliceCheckin, note: "Nice streak, keep it up" },
  });
  render(
    <PartnerCheckins
      {...baseProps({ role: "partner", currentUserId: "alice" })}
    />,
  );

  fireEvent.change(screen.getByLabelText("Leave a note (optional)"), {
    target: { value: "Nice streak, keep it up" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));

  await waitFor(() =>
    expect(saveNote).toHaveBeenCalledWith(
      "2026-09-23",
      "Nice streak, keep it up",
    ),
  );
  await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
});

test("PCI-03 other people read the note under the partner's name", () => {
  render(
    <PartnerCheckins
      {...baseProps({
        checkins: [{ ...aliceCheckin, note: "Nice streak, keep it up" }],
      })}
    />,
  );
  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Nice streak, keep it up");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

test("PCI-04 a note over 280 characters shows the error and is not sent", async () => {
  render(
    <PartnerCheckins
      {...baseProps({ role: "partner", currentUserId: "alice" })}
    />,
  );

  fireEvent.change(screen.getByLabelText("Leave a note (optional)"), {
    target: { value: "x".repeat(281) },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save note" }));

  expect(
    await screen.findByText("Keep the note under 280 characters"),
  ).toBeInTheDocument();
  expect(saveNote).not.toHaveBeenCalled();
});

test("PCI-05 a past day is read-only for the partner", () => {
  render(
    <PartnerCheckins
      {...baseProps({
        role: "partner",
        currentUserId: "bob",
        date: "2026-09-21",
        checkins: [{ ...aliceCheckin, date: "2026-09-21" }],
      })}
    />,
  );
  expect(screen.getByText("Checked ✓ 8:12 PM")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

test("PCI-06 the owner and viewers never get the button", () => {
  for (const role of ["owner", "viewer"] as const) {
    const { unmount } = render(
      <PartnerCheckins {...baseProps({ role, currentUserId: "someone" })} />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    unmount();
  }
});

test("PCI-07 no partners yet — the owner gets a link to People, others don't", () => {
  const { unmount } = render(
    <PartnerCheckins
      {...baseProps({ role: "owner", partners: [], checkins: [] })}
    />,
  );
  expect(screen.getByText(/No partners yet\./)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Promote someone on the People page" }),
  ).toHaveAttribute("href", "/people");
  unmount();

  render(<PartnerCheckins {...baseProps({ partners: [], checkins: [] })} />);
  expect(screen.getByText(/No partners yet\./)).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("PCI-08 a double tap sends one check-in and shows one check", async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(checkIn).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }) as never,
  );
  render(
    <PartnerCheckins
      {...baseProps({ role: "partner", currentUserId: "bob" })}
    />,
  );

  const button = screen.getByRole("button", { name: "I checked today" });
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(button).toBeDisabled());
  expect(checkIn).toHaveBeenCalledTimes(1);

  resolve({
    ok: true,
    checkin: {
      userId: "bob",
      date: "2026-09-23",
      note: null,
      createdAt: "2026-09-24T02:30:00Z",
    },
  });
  await waitFor(() =>
    expect(screen.getAllByText(/Checked ✓ 8:30 PM/)).toHaveLength(1),
  );
});
