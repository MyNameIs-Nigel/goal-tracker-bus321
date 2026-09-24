import { expect, teamPath, test } from "./fixtures";
import { addGoal, region, resetAt, teammateRow } from "./helpers";

// Fixes "today" to Wednesday 2026-09-23 (Denver), 5 days into the seeded
// 2026-09-19 contract — the exact date DT-01/DT-11/DT-12 use as examples.
const FIXED_NOW = "2026-09-23T18:00:00Z";

test("DT-01 the header names the day and the contract day", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
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
  await signInAs("avery");
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

test("DT-03 a student checks off a daily goal and it survives a reload", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
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

test("DT-05 a student edits their own past day", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
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
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });

  await page.goto("/day/2026-09-25");
  await expect(page.getByText("Upcoming")).toBeVisible();
  await expect(page.getByRole("button", { name: /D1/ })).toHaveCount(0);
});

test("DT-07 a teammate's day shows statuses, not controls", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "D1", startsOn: "2026-09-19" });

  await signInAs("blake");
  await page.goto(teamPath("avery"));
  await expect(page.getByText("Pending")).toBeVisible();
  await expect(page.getByRole("button", { name: /D1/ })).toHaveCount(0);

  await page.goto(teamPath("avery", "/day/2026-09-21"));
  await expect(page.getByText("Missed")).toBeVisible();
  await expect(page.getByRole("button", { name: /D1/ })).toHaveCount(0);
  await expect(page.getByText("Editing a past day")).toHaveCount(0);
});

test("DT-08 invalid dates are not found", async ({ page, signInAs }) => {
  await signInAs("avery");
  expect((await page.goto("/day/2026-13-45"))?.status()).toBe(404);
  expect((await page.goto("/day/hello"))?.status()).toBe(404);
  expect((await page.goto(teamPath("blake", "/day/hello")))?.status()).toBe(
    404,
  );
});

test("DT-14 navigating days, on your team and on a teammate's", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/day/2026-09-21");

  await expect(page.getByText("← Sep 20")).toBeVisible();
  await expect(page.getByText("Sep 22 →")).toBeVisible();
  await page.getByText("Sep 22 →").click();
  await expect(
    page.getByRole("heading", { name: "Tuesday, September 22" }),
  ).toBeVisible();

  await page.goto(teamPath("blake", "/day/2026-09-21"));
  await page.getByText("← Sep 20").click();
  await expect(page).toHaveURL(teamPath("blake", "/day/2026-09-20"));
  await page
    .getByRole("main")
    .getByRole("link", { name: "Today" })
    .first()
    .click();
  await expect(page).toHaveURL(teamPath("blake"));
});

test("DT-15 your first goal is one line away on /today; a teammate's empty day names them", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("blake");
  await page.goto(teamPath("avery"));
  await expect(page.getByText("Avery hasn't added goals yet.")).toBeVisible();

  await signInAs("avery");
  await page.goto("/today");
  await expect(page.getByText("No goals yet.")).toBeVisible();
  await page.getByLabel("Your first daily goal").fill("Read 20 pages");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const goal = page.getByRole("button", { name: /Read 20 pages/ });
  await expect(goal).toContainText("Pending");
  await expect(page).toHaveURL("/today");
  await page.reload();
  await expect(goal).toContainText("Pending");
});

test("DT-16 /today is your day, then your teammates, then who checked on you", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "D1" });
  await page.goto("/today");

  const headings = await page.locator("main h2").allTextContents();
  expect(headings[0]).toMatch(/^Today/);
  expect(headings.slice(-2)).toEqual(["Your teammates", "Checked on you"]);

  await page.goto(teamPath("blake"));
  const teamHeadings = await page.locator("main h2").allTextContents();
  expect(teamHeadings.at(-1)).toBe("Partners");
  expect(teamHeadings).not.toContain("Your teammates");
});

test("DT-17 the daily routine never leaves /today", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "Read 20 pages" });
  await addGoal(page, { title: "Workout" });

  await page.goto("/today");
  // A marker on the document: any real navigation or reload would drop it.
  await page.evaluate(() => {
    (window as unknown as { stayed: boolean }).stayed = true;
  });

  await page.getByRole("button", { name: /Read 20 pages/ }).click();
  await page.getByRole("button", { name: /Workout/ }).click();
  await expect(page.getByText("Today · All done")).toBeVisible();
  await page.getByRole("button", { name: "Check in on Blake" }).click();
  await expect(teammateRow(page, "Blake Brown")).toContainText("Checked ✓");
  await page.getByRole("button", { name: "Check in on Casey" }).click();
  await expect(teammateRow(page, "Casey Clark")).toContainText("Checked ✓");

  expect(
    await page.evaluate(
      () => (window as unknown as { stayed?: boolean }).stayed,
    ),
  ).toBe(true);
  await expect(page).toHaveURL("/today");

  await page.reload();
  await expect(page.getByText("Today · All done")).toBeVisible();
  await expect(region(page, "Your teammates")).toContainText("2 of 2 checked");
});
