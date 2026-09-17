import { expect, test } from "./fixtures";
import { addGoal, resetAt } from "./helpers";

// HIST-01's example: Wednesday 2026-09-23, contract from 9/19 (seeded).
const FIXED_NOW = "2026-09-23T18:00:00Z";

/** Owner: one daily goal, done on 9/19 and 9/22, sick on 9/21. */
async function seedSeptember(page: import("@playwright/test").Page) {
  await page.goto("/goals");
  await addGoal(page, { title: "Read 20 pages", startsOn: "2026-09-01" });
  for (const date of ["2026-09-19", "2026-09-22"]) {
    await page.goto(`/day/${date}`);
    await page.getByRole("button", { name: /Read 20 pages/ }).click();
    await expect(page.getByText("Done", { exact: true })).toBeVisible();
  }
  await page.goto("/day/2026-09-21");
  await page.getByRole("button", { name: "Mark an exception" }).click();
  await page.getByLabel("Reason").fill("Flu");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Excused — Flu")).toBeVisible();
}

test("HIST-01 the calendar shows day statuses with a legend", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await seedSeptember(page);

  await signInAs("viewer");
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "September 2026" }),
  ).toBeVisible();
  await expect(page.getByLabel("September 19, clean")).toBeVisible();
  await expect(page.getByLabel("September 20, missed")).toBeVisible();
  await expect(page.getByLabel("September 21, excused")).toBeVisible();
  await expect(page.getByLabel("September 22, clean")).toBeVisible();
  await expect(page.getByLabel("September 23, open")).toBeVisible();
  await expect(page.getByLabel("September 24, upcoming")).toBeVisible();
  await expect(page.getByLabel("September 18, not counting")).toBeVisible();
  const legend = page.getByRole("list", { name: "Legend" });
  for (const item of ["Clean", "Missed", "Excused", "Open", "Not counting"]) {
    await expect(legend.getByText(item, { exact: true })).toBeVisible();
  }
});

test("HIST-02 month navigation", async ({ page, signInAs }) => {
  await resetAt(page, "2026-10-05T18:00:00Z");
  await signInAs("viewer");
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "November →" })).toHaveCount(0);

  await page.getByRole("link", { name: "← September" }).click();
  await expect(page).toHaveURL(/\/history\?month=2026-09$/);
  await expect(
    page.getByRole("heading", { name: "September 2026" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "← August" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "October →" })).toBeVisible();
});

test("HIST-03 a day links to its day page", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("viewer");
  await page.goto("/history");
  await page.getByLabel("September 20, not counting").click();
  await expect(page).toHaveURL(/\/day\/2026-09-20$/);
  await expect(
    page.getByRole("heading", { name: "Sunday, September 20" }),
  ).toBeVisible();
});

test("HIST-04 the month summary matches the rules", async ({
  page,
  signInAs,
}) => {
  // End of the month: 9/20 and the week of 9/21 are failures; Read is done
  // on 9/19 and 9/22–9/29 (9 of 11 counting past periods = 82%).
  await resetAt(page, "2026-09-30T18:00:00Z");
  await signInAs("owner");
  await seedSeptember(page);
  await page.goto("/goals");
  await addGoal(page, {
    title: "Gym",
    cadence: "Weekly",
    startsOn: "2026-09-01",
  });
  for (const day of [23, 24, 25, 26, 27, 28, 29]) {
    await page.goto(`/day/2026-09-${day}`);
    await page.getByRole("button", { name: /Read 20 pages/ }).click();
    await expect(page.getByText("Done", { exact: true })).toBeVisible();
  }
  await page.goto("/day/2026-09-28");
  await page.getByRole("button", { name: /Gym/ }).click();
  await expect(page.getByText("Done", { exact: true })).toHaveCount(2);

  await page.goto("/history?month=2026-09");
  await expect(page.getByText("2 failures")).toBeVisible();
  await expect(page.getByText("Sep 20 · Read 20 pages")).toBeVisible();
  await expect(page.getByText("Week of Sep 21 · Gym")).toBeVisible();
  await expect(page.getByText("1 exception")).toBeVisible();
  await expect(page.getByText("Sep 21 · Whole day · Flu")).toBeVisible();
  await expect(page.getByText("82% complete")).toBeVisible();

  // HIST-05 on the same data.
  const table = page.getByRole("region", { name: "Weekly & monthly" });
  await expect(
    table.getByRole("row").filter({ hasText: "Week of Sep 21" }),
  ).toContainText("Missed");
  await expect(
    table.getByRole("row").filter({ hasText: "Week of Sep 28" }),
  ).toContainText("Done");
});

test("HIST-05 weekly and monthly goals are tabled with a status", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, {
    title: "Gym",
    cadence: "Weekly",
    startsOn: "2026-09-01",
  });
  await addGoal(page, {
    title: "Budget",
    cadence: "Monthly",
    startsOn: "2026-09-01",
  });

  await signInAs("partner");
  await page.goto("/history");
  const table = page.getByRole("region", { name: "Weekly & monthly" });
  await expect(
    table.getByRole("row").filter({ hasText: "Week of Sep 21" }),
  ).toContainText("Pending");
  await expect(
    table.getByRole("row").filter({ hasText: "Week of Sep 14" }),
  ).toContainText("Not counting");
  await expect(
    table.getByRole("row").filter({ hasText: "Budget" }),
  ).toContainText("Not counting");
});

test("PCI-09 partners show N of M days and a strip on /history", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, "2026-09-15T18:00:00Z");
  await signInAs("partner");
  await page.goto("/today");
  await page.getByRole("button", { name: "I checked today" }).click();
  await expect(page.getByText(/Checked ✓/)).toBeVisible();

  await page.goto("/history?month=2026-09");
  const partners = page.getByRole("region", { name: "Partners" });
  await expect(partners).toContainText("Test Partner — 1 of 15 days");
  await expect(
    partners.getByLabel("Test Partner, September 15, checked"),
  ).toBeVisible();
  await expect(
    partners.getByLabel("Test Partner, September 14, not checked"),
  ).toBeVisible();
  await expect(
    partners.getByLabel("Test Partner, September 16, not yet"),
  ).toBeVisible();
});

test("HIST-07 fits a 375px-wide phone without horizontal scrolling", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await seedSeptember(page);
  await page.goto("/goals");
  await addGoal(page, {
    title: "A goal with a fairly long title to wrap",
    cadence: "Weekly",
    startsOn: "2026-09-01",
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/history");
  await expect(
    page.getByRole("heading", { name: "September 2026" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("HIST-08 an invalid month falls back to the current month", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("viewer");
  for (const month of ["2026-13", "abc"]) {
    await page.goto(`/history?month=${month}`);
    await expect(
      page.getByRole("heading", { name: "September 2026" }),
    ).toBeVisible();
  }
});
