import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

const socialMock = vi.fn();
vi.mock("@/lib/auth-client", () => ({ signIn: { social: socialMock } }));

const { default: GoogleSignInButton } = await import("./GoogleSignInButton");

test("AUTH-02 offers a Continue with Google button", () => {
  render(<GoogleSignInButton />);
  expect(
    screen.getByRole("button", { name: "Continue with Google" }),
  ).toBeInTheDocument();
});

test("clicking starts the Google flow with the /today callback", () => {
  render(<GoogleSignInButton />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  expect(socialMock).toHaveBeenCalledWith(
    expect.objectContaining({ provider: "google", callbackURL: "/today" }),
  );
});

test("disables itself after the first tap so a double-tap can't start two flows", () => {
  render(<GoogleSignInButton />);
  const button = screen.getByRole("button", { name: "Continue with Google" });
  fireEvent.click(button);
  expect(button).toBeDisabled();
});
