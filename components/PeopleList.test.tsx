import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@/lib/actions/people", () => ({ setRole: vi.fn() }));

const { default: PeopleList } = await import("./PeopleList");
const { setRole } = await import("@/lib/actions/people");

const owner = {
  id: "owner-1",
  name: "Test Owner",
  email: "owner@e2e.local",
  image: null,
  role: "owner" as const,
  createdAt: "2026-09-16T00:00:00Z",
};

const viewer = {
  id: "viewer-1",
  name: "Val Viewer",
  email: "val@example.com",
  image: null,
  role: "viewer" as const,
  createdAt: "2026-09-16T00:00:00Z",
};

test("PPL-04 the owner's own row is fixed, with no role control", () => {
  render(
    <PeopleList people={[owner]} ownerId={owner.id} appUrl="https://x.test" />,
  );
  expect(screen.getByText("Owner (you)")).toBeInTheDocument();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

test("PPL-06 the empty state invites sharing when only the owner has signed in", () => {
  render(
    <PeopleList people={[owner]} ownerId={owner.id} appUrl="https://x.test" />,
  );
  expect(
    screen.getByText("No one else has signed in yet. Share the link:"),
  ).toBeInTheDocument();
  expect(screen.getByText("https://x.test")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
});

test("the empty state is absent once someone else has signed in", () => {
  render(
    <PeopleList
      people={[owner, viewer]}
      ownerId={owner.id}
      appUrl="https://x.test"
    />,
  );
  expect(
    screen.queryByText("No one else has signed in yet. Share the link:"),
  ).not.toBeInTheDocument();
});

test("PPL-02 promoting a viewer shows a toast and updates the row", async () => {
  vi.mocked(setRole).mockResolvedValue({
    ok: true,
    name: "Val Viewer",
    role: "partner",
  });
  render(
    <PeopleList
      people={[owner, viewer]}
      ownerId={owner.id}
      appUrl="https://x.test"
    />,
  );

  fireEvent.change(
    screen.getByRole("combobox", { name: "Role for Val Viewer" }),
    { target: { value: "partner" } },
  );

  await screen.findByText("Val Viewer is now a partner");
  expect(setRole).toHaveBeenCalledWith("viewer-1", "partner");
});
