import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

test("the home page names the app", () => {
  render(<Home />);
  expect(
    screen.getByRole("heading", { level: 1, name: "BUS 321 Goal Tracker" }),
  ).toBeInTheDocument();
});
