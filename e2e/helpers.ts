import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Fills and saves the /goals "Add goal" form (docs/specs/goals.md), then
 * waits for the new row to render. Without that wait a test that navigates
 * straight after can abort the in-flight Server Action (the row is added
 * client-side only once the action returns), which on a fast machine loses
 * the goal entirely.
 */
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
  await expect(
    page.locator("div.rounded-xl", {
      has: page.getByText(title, { exact: true }),
    }),
  ).toBeVisible();
}

/** Reseeds and pins lib/clock.ts to `now` (docs/TESTING.md § Clock). */
export async function resetAt(
  page: Page,
  now: string,
  { demo = false }: { demo?: boolean } = {},
) {
  const response = await page.request.post("/api/e2e/reset", {
    data: { now, demo },
  });
  if (!response.ok()) throw new Error(`reset failed: ${response.status()}`);
}

/** Reseeds with the fake demo class, relative to the real clock. */
export async function resetWithDemo(page: Page) {
  const response = await page.request.post("/api/e2e/reset", {
    data: { demo: true },
  });
  if (!response.ok()) throw new Error(`reset failed: ${response.status()}`);
}

/** A section of a page, by its heading (every section is aria-labelledby). */
export function region(page: Page, name: string): Locator {
  return page.getByRole("region", { name, exact: true });
}

/** One teammate's row in `/today`'s "Your teammates". */
export function teammateRow(page: Page, name: string): Locator {
  return region(page, "Your teammates")
    .getByRole("listitem")
    .filter({ hasText: name });
}

/** Opens the user menu and returns the profile panel. */
export async function openProfile(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "User menu" }).click();
  return page.getByRole("region", { name: "Your profile" });
}
