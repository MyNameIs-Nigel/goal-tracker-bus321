import { expect, test } from "./fixtures";
import { addGoal, resetAt } from "./helpers";

// Wednesday 2026-09-23 (Denver), 5 days into the seeded 2026-09-19 contract.
const FIXED_NOW = "2026-09-23T18:00:00Z";

test("EXC-01 the owner can open the dialog on any day; non-owners never see it", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");

  for (const path of ["/today", "/day/2026-09-21", "/day/2026-09-28"]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Mark an exception" }),
    ).toBeVisible();
  }

  for (const role of ["partner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/today");
    await expect(
      page.getByRole("button", { name: "Mark an exception" }),
    ).toHaveCount(0);
  }
});

test("EXC-02 a whole-day exception excuses every daily goal that day", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });

  await page.goto("/day/2026-09-24");
  await page.getByRole("button", { name: "Mark an exception" }).click();
  await page.getByLabel("Reason").fill("Flu");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Excused — Flu")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Excused — Flu")).toBeVisible();
});

test("EXC-03 a goal-specific exception excuses only that goal", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });
  await addGoal(page, { title: "D2" });

  await page.goto("/day/2026-09-25");
  await page.getByRole("button", { name: "Mark an exception" }).click();
  await page.getByLabel("One goal").check();
  await page.getByLabel("Goal").selectOption({ label: "D1" });
  await page.getByLabel("From").fill("2026-09-25");
  await page.getByLabel("To").fill("2026-09-28");
  await page.getByLabel("Reason").fill("Camping, no books");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Excused — Camping, no books")).toBeVisible();
  // 2026-09-25 is a future day relative to fixed today 2026-09-23, so an
  // unexcused goal there reads "Upcoming", not "Pending".
  await expect(
    page
      .locator("div.rounded-xl", { has: page.getByText("D2", { exact: true }) })
      .getByText("Upcoming", { exact: true }),
  ).toBeVisible();
});

test("EXC-05 validation rejects a bad range and an empty reason", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/today");

  await page.getByRole("button", { name: "Mark an exception" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("alert")).toHaveText("A reason is required");

  await page.getByLabel("Reason").fill("Flu");
  await page.getByLabel("To").fill("2026-09-22");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "End date can't be before start date",
  );
});

test("EXC-06 owner removes an exception and the goal's status recomputes", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });

  await page.goto("/day/2026-09-24");
  await page.getByRole("button", { name: "Mark an exception" }).click();
  await page.getByLabel("Reason").fill("Flu");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Excused — Flu")).toBeVisible();

  await page.getByRole("button", { name: "Remove exception" }).click();
  await expect(page.getByText("Upcoming")).toBeVisible();
  await expect(page.getByText("Excused — Flu")).toHaveCount(0);
});

test("EXC-08 exceptions are visible to viewers", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });

  await page.goto("/day/2026-09-24");
  await page.getByRole("button", { name: "Mark an exception" }).click();
  await page.getByLabel("Reason").fill("Flu");
  await page.getByRole("button", { name: "Save" }).click();

  await signInAs("viewer");
  await page.goto("/day/2026-09-24");
  await expect(page.getByText("Excused — Flu")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove exception" }),
  ).toHaveCount(0);
});
