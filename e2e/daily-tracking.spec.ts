import { expect, test } from "./fixtures";
import { addGoal } from "./helpers";

// Fixes "today" to Wednesday 2026-09-23 (Denver), 5 days into the seeded
// 2026-09-19 contract — the exact date DT-01/DT-11/DT-12 use as examples.
const FIXED_NOW = "2026-09-23T18:00:00Z";

async function resetAt(page: import("@playwright/test").Page, now: string) {
  const response = await page.request.post("/api/e2e/reset", { data: { now } });
  if (!response.ok()) throw new Error(`reset failed: ${response.status()}`);
}

test("DT-01 the header names the day and the contract day", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/today");

  await expect(
    page.getByRole("heading", { name: "Wednesday, September 23" }),
  ).toBeVisible();
  await expect(page.getByText("Day 5")).toBeVisible();
});

test("DT-02 goals are grouped into Today/This week/This month", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });
  await addGoal(page, { title: "W1", cadence: "Weekly" });
  await addGoal(page, { title: "M1", cadence: "Monthly" });

  await page.goto("/today");
  await expect(page.getByText("This week")).toBeVisible();
  await expect(page.getByText("This month")).toBeVisible();
  await expect(page.getByText(/due Sunday, Sep 27/)).toBeVisible();
  await expect(page.getByText(/due Wednesday, Sep 30/)).toBeVisible();
});

test("DT-03 owner checks off a daily goal and it survives a reload", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "Read 20 pages" });

  await page.goto("/today");
  await page.getByRole("button", { name: /Read 20 pages/ }).click();
  // exact: true — the progress heading ("Today · All done") also contains
  // the word "done" and would otherwise match too.
  await expect(page.getByText("Done", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Read 20 pages/ }).click();
  await expect(page.getByText("Pending", { exact: true })).toBeVisible();
});

test("DT-05 owner edits a past day", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1", startsOn: "2026-09-19" });

  await page.goto("/day/2026-09-21");
  await expect(
    page.getByRole("heading", { name: "Monday, September 21" }),
  ).toBeVisible();
  await expect(page.getByText("Editing a past day")).toBeVisible();

  await page.getByRole("button", { name: /D1/ }).click();
  await expect(page.getByText("Done", { exact: true })).toBeVisible();
});

test("DT-06 future days are read-only for completions", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });

  await page.goto("/day/2026-09-25");
  await expect(page.getByText("Upcoming")).toBeVisible();
  await expect(page.getByRole("button", { name: /D1/ })).toHaveCount(0);
});

test("DT-07 non-owners see statuses, not controls", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });

  for (const role of ["partner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/today");
    await expect(page.getByText("Pending")).toBeVisible();
    await expect(page.getByRole("button", { name: /D1/ })).toHaveCount(0);
  }
});

test("DT-08 invalid dates are not found", async ({ page, signInAs }) => {
  await signInAs("owner");
  expect((await page.goto("/day/2026-13-45"))?.status()).toBe(404);
  expect((await page.goto("/day/hello"))?.status()).toBe(404);
});

test("DT-14 navigating days", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/day/2026-09-21");

  await expect(page.getByText("← Sep 20")).toBeVisible();
  await expect(page.getByText("Sep 22 →")).toBeVisible();
  await page.getByText("Sep 22 →").click();
  await expect(
    page.getByRole("heading", { name: "Tuesday, September 22" }),
  ).toBeVisible();
});

test("DT-15 empty state", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/today");
  await expect(page.getByText("No goals yet.")).toBeVisible();

  await signInAs("viewer");
  await page.goto("/today");
  await expect(page.getByText("Test hasn't added goals yet.")).toBeVisible();
});
