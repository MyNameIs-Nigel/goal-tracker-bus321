import type { Page } from "@playwright/test";

/** Fills and saves the /goals "Add goal" form (docs/specs/goals.md). */
export async function addGoal(
  page: Page,
  {
    title,
    description = "",
    cadence = "Daily",
    startsOn,
  }: {
    title: string;
    description?: string;
    cadence?: "Daily" | "Weekly" | "Monthly";
    startsOn?: string;
  },
) {
  await page.getByRole("button", { name: "Add goal" }).click();
  await page.getByLabel("Title").fill(title);
  if (description) await page.getByLabel("Description").fill(description);
  // The radio input is visually hidden (its label carries the pill style);
  // click the label text rather than the input itself.
  await page.locator("form").getByText(cadence, { exact: true }).click();
  if (startsOn) await page.getByLabel("Start date").fill(startsOn);
  await page.getByRole("button", { name: "Save" }).click();
}
