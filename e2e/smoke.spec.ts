import { expect, test } from "@playwright/test";

test("the home page renders the app name", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "BUS 321 Goal Tracker" }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/BUS 321 Goal Tracker/);
});

test("the home page does not scroll sideways", async ({ page }) => {
  await page.goto("/");
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});
