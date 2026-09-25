import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@/lib/actions/checkins", () => ({
  checkIn: vi.fn(),
  saveNote: vi.fn(),
}));

const { default: TeamCheckins } = await import("./TeamCheckins");
const { checkIn } = await import("@/lib/actions/checkins");

const avery = { id: "user-avery", name: "Avery Adams", image: null };
const blake = { id: "user-blake", name: "Blake Brown", image: null };
const casey = { id: "user-casey", name: "Casey Clark", image: null };

// 02:12 UTC on 9/24 is 8:12 PM on 9/23 in America/Denver.
const blakeOnAvery = {
  teamId: "team-avery",
  userId: "user-blake",
  date: "2026-09-23",
  note: "Nice streak, keep it up",
  createdAt: "2026-09-24T02:12:00Z",
};

beforeEach(() => {
  vi.mocked(checkIn).mockReset();
});

test("PCI-10 Checked on you lists each partner with their time, note, or Not yet", () => {
  render(
    <TeamCheckins
      heading="Checked on you"
      teamId="team-avery"
      teamFirstName="Avery"
      date="2026-09-23"
      todayDate="2026-09-23"
      currentUserId="user-avery"
      partners={[blake, casey]}
      checkins={[blakeOnAvery]}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Checked on you" }),
  ).toBeInTheDocument();
  const rows = screen.getAllByRole("listitem");
  expect(rows[0]).toHaveTextContent("Blake Brown");
  expect(rows[0]).toHaveTextContent("Checked ✓ 8:12 PM");
  expect(rows[0]).toHaveTextContent("Nice streak, keep it up");
  expect(rows[1]).toHaveTextContent("Casey Clark");
  expect(rows[1]).toHaveTextContent("Not yet");
});

test("PCI-06 your own team never offers you a Check in", () => {
  render(
    <TeamCheckins
      heading="Checked on you"
      teamId="team-avery"
      teamFirstName="Avery"
      date="2026-09-23"
      todayDate="2026-09-23"
      currentUserId="user-avery"
      partners={[blake, casey]}
      checkins={[]}
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("PCI-11 on a teammate's page today, your own row has the Check in button", async () => {
  vi.mocked(checkIn).mockResolvedValue({
    ok: true,
    checkin: {
      teamId: "team-blake",
      userId: "user-avery",
      date: "2026-09-23",
      note: null,
      createdAt: "2026-09-24T02:30:00Z",
    },
  });
  render(
    <TeamCheckins
      heading="Partners"
      teamId="team-blake"
      teamFirstName="Blake"
      date="2026-09-23"
      todayDate="2026-09-23"
      currentUserId="user-avery"
      partners={[avery, casey]}
      checkins={[]}
    />,
  );
  expect(screen.getAllByRole("button")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Check in on Blake" }));
  await waitFor(() =>
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent(
      "Checked ✓ 8:30 PM",
    ),
  );
  expect(checkIn).toHaveBeenCalledWith("team-blake", "2026-09-23");
});

test("PCI-05 a past day is read-only, even for your own row", () => {
  render(
    <TeamCheckins
      heading="Partners"
      teamId="team-blake"
      teamFirstName="Blake"
      date="2026-09-21"
      todayDate="2026-09-23"
      currentUserId="user-avery"
      partners={[avery, casey]}
      checkins={[
        {
          ...blakeOnAvery,
          teamId: "team-blake",
          userId: "user-casey",
          date: "2026-09-21",
        },
      ]}
    />,
  );
  expect(screen.getByText("Checked ✓ 8:12 PM")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});

test("HIST-06 / PCI-07 with no other students the section says so", () => {
  render(
    <TeamCheckins
      heading="Checked on you"
      teamId="team-avery"
      teamFirstName="Avery"
      date="2026-09-23"
      todayDate="2026-09-23"
      currentUserId="user-avery"
      partners={[]}
      checkins={[]}
    />,
  );
  expect(screen.getByText("No partners yet.")).toBeInTheDocument();
});
