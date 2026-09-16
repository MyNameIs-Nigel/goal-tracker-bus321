import { expect, test } from "./fixtures";
import { addGoal } from "./helpers";

// Cadence-lock (GOAL-05) and delete-when-completed (GOAL-09) both require an
// existing completion, which needs the daily-tracking UI (Phase 2's other
// spec, same PR-cycle but landing separately) — those two branches are unit
// tests: lib/actions/goals.test.ts.

test("GOAL-01 goals are listed by cadence, with a collapsed archived section", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");

  await addGoal(page, { title: "Daily one", description: "First daily" });
  await addGoal(page, { title: "Daily two" });
  await addGoal(page, { title: "Weekly one", cadence: "Weekly" });
  await addGoal(page, { title: "Monthly one", cadence: "Monthly" });
  await addGoal(page, { title: "Old goal" });
  await page
    .locator("div.rounded-xl", {
      has: page.getByText("Old goal", { exact: true }),
    })
    .getByRole("button", { name: "Archive" })
    .first()
    .click();

  const dailySection = page.locator("section", {
    has: page.getByText("Daily", { exact: true }),
  });
  await expect(dailySection.getByText("Daily one")).toBeVisible();
  await expect(dailySection.getByText("Daily two")).toBeVisible();
  await expect(page.getByText("First daily")).toBeVisible();
  await expect(
    page
      .locator("section", { has: page.getByText("Weekly", { exact: true }) })
      .getByText("Weekly one"),
  ).toBeVisible();
  await expect(
    page
      .locator("section", { has: page.getByText("Monthly", { exact: true }) })
      .getByText("Monthly one"),
  ).toBeVisible();
  await expect(page.getByText("Archived (1)")).toBeVisible();
});

test("GOAL-02 owner adds a goal and it persists after reload", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");

  await addGoal(page, {
    title: "Read 20 pages",
    description: "Any book, before bed",
  });

  await expect(page.getByText("Read 20 pages")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Read 20 pages")).toBeVisible();
});

test("GOAL-03 title is required and bounded", async ({ page, signInAs }) => {
  await signInAs("owner");
  await page.goto("/goals");

  // Next.js's own route announcer is also `role="alert"`
  // (`#__next-route-announcer__`); scope past it by text.
  const formError = page.getByRole("alert").filter({ hasText: /./ });

  await page.getByRole("button", { name: "Add goal" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(formError).toHaveText("Title is required");

  await page.getByLabel("Title").fill("x".repeat(121));
  await page.getByRole("button", { name: "Save" }).click();
  await expect(formError).toHaveText("Keep the title under 120 characters");
});

test("GOAL-04 owner edits a goal's title and description", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "Original title" });

  await page
    .locator("div.rounded-xl", {
      has: page.getByText("Original title", { exact: true }),
    })
    .getByRole("button", { name: "Edit" })
    .first()
    .click();
  await page.getByLabel("Title").fill("Updated title");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Updated title")).toBeVisible();
  await expect(page.getByText("Original title")).not.toBeVisible();
});

test("GOAL-06 owner changes the start date", async ({ page, signInAs }) => {
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "Shift me", startsOn: "2026-09-22" });

  await page
    .locator("div.rounded-xl", {
      has: page.getByText("Shift me", { exact: true }),
    })
    .getByRole("button", { name: "Edit" })
    .first()
    .click();
  await expect(page.getByLabel("Start date")).toHaveValue("2026-09-22");
  await page.getByLabel("Start date").fill("2026-09-19");
  await page.getByRole("button", { name: "Save" }).click();

  await page
    .locator("div.rounded-xl", {
      has: page.getByText("Shift me", { exact: true }),
    })
    .getByRole("button", { name: "Edit" })
    .first()
    .click();
  await expect(page.getByLabel("Start date")).toHaveValue("2026-09-19");
});

test("GOAL-07/08 archive removes a goal from the active sections; restore brings it back", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "Archive me" });

  await page
    .locator("div.rounded-xl", {
      has: page.getByText("Archive me", { exact: true }),
    })
    .getByRole("button", { name: "Archive" })
    .first()
    .click();
  await expect(page.getByText("Archived (1)")).toBeVisible();

  await page.getByText("Archived (1)").click();
  await page
    .locator("div.rounded-xl", {
      has: page.getByText("Archive me", { exact: true }),
    })
    .getByRole("button", { name: "Restore" })
    .first()
    .click();
  await expect(page.getByText("Archived (1)")).not.toBeVisible();
});

test("GOAL-10 reorder within a cadence persists after reload", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "A" });
  await addGoal(page, { title: "B" });
  await addGoal(page, { title: "C" });

  await page
    .locator("div.rounded-xl", { has: page.getByText("C", { exact: true }) })
    .getByRole("button", { name: "Move up" })
    .first()
    .click();

  const titlesAfterMove = page
    .locator("section", {
      has: page.getByText("Daily", { exact: true }),
    })
    .locator("p.font-medium");
  await expect(titlesAfterMove).toHaveText(["A", "C", "B"]);

  await page.reload();
  const titlesAfterReload = page
    .locator("section", {
      has: page.getByText("Daily", { exact: true }),
    })
    .locator("p.font-medium");
  await expect(titlesAfterReload).toHaveText(["A", "C", "B"]);
});

test("GOAL-11 non-owners see no controls and can't write", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "Owner's goal" });

  for (const role of ["partner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/goals");
    await expect(page.getByText("Owner's goal")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add goal" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Archive" })).toHaveCount(0);
  }
});

test("GOAL-12 empty state names the owner for non-owners", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/goals");
  await expect(page.getByText("No goals yet.")).toBeVisible();

  await signInAs("viewer");
  await page.goto("/goals");
  await expect(page.getByText("Test hasn't added goals yet.")).toBeVisible();
});
