import { expect, teamPath, test } from "./fixtures";
import { addGoal, openProfile, resetAt, teammateRow } from "./helpers";

// Wednesday 2026-09-23; every seeded contract starts 9/19.
const FIXED_NOW = "2026-09-23T18:00:00Z";

async function setContractEnd(
  page: import("@playwright/test").Page,
  end: string,
) {
  await page.goto("/contract");
  await page.getByRole("button", { name: "Edit dates" }).click();
  await page.getByLabel("End date").fill(end);
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.getByRole("button", { name: "Edit dates" })).toBeVisible();
}

/** `checker` checks in on `target` today, optionally with a note. */
async function checkIn(
  page: import("@playwright/test").Page,
  target: string,
  note?: string,
) {
  await page.goto("/today");
  await page.getByRole("button", { name: `Check in on ${target}` }).click();
  await expect(teammateRow(page, target).getByText(/Checked ✓/)).toBeVisible();
  if (note) {
    await teammateRow(page, target)
      .getByRole("button", { name: "Add a note" })
      .click();
    await page.getByLabel(`Note for ${target}`).fill(note);
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByLabel(`Note for ${target}`)).toHaveCount(0);
  }
}

test("EXP-01 the profile menu links to the export", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/today");
  const profile = await openProfile(page);
  await profile.getByRole("link", { name: "Export report" }).click();
  await expect(page).toHaveURL(/\/export$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Goal report" }),
  ).toBeVisible();
});

test("EXP-02 the default range is the contract", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await setContractEnd(page, "2026-11-19");
  await page.goto("/export");
  await expect(page.getByLabel("From", { exact: true })).toHaveValue(
    "2026-09-19",
  );
  await expect(page.getByLabel("To", { exact: true })).toHaveValue(
    "2026-11-19",
  );
  await expect(page.getByText("Avery Adams · Team Avery")).toBeVisible();
  await expect(
    page.getByText("Sep 19, 2026 – Nov 19, 2026", { exact: true }),
  ).toBeVisible();
});

test("EXP-04 a custom range", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "Read 20 pages", startsOn: "2026-09-19" });
  await page.goto("/export");
  await page.getByLabel("From", { exact: true }).fill("2026-09-20");
  await page.getByLabel("To", { exact: true }).fill("2026-09-22");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page).toHaveURL(/\/export\?from=2026-09-20&to=2026-09-22$/);
  const log = page.getByRole("region", { name: "Daily log" });
  const rows = log.getByRole("row").filter({ hasText: /Sep \d+/ });
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("Sun, Sep 20");
  await expect(rows.last()).toContainText("Tue, Sep 22");
});

test("EXP-12 check-ins from partners, and optionally the ones you made", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("blake");
  await checkIn(page, "Avery", "Nice work on the reading");
  await signInAs("avery");
  await checkIn(page, "Blake", "Keep going!");

  await page.goto("/export");
  const received = page.getByRole("region", {
    name: "Check-ins from partners",
  });
  await expect(received).toContainText("Blake Brown — 1 day");
  await expect(received).toContainText("Sep 23 — Nice work on the reading");
  await expect(received).toContainText("Casey Clark — 0 days");
  await expect(
    page.getByRole("region", { name: "Check-ins you made" }),
  ).toHaveCount(0);

  await page.getByLabel("Include check-ins I made on teammates").check();
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page).toHaveURL(/given=1/);
  const given = page.getByRole("region", { name: "Check-ins you made" });
  await expect(given).toContainText("Team Blake — 1 day");
  await expect(given).toContainText("Sep 23 — Keep going!");
});

test("EXP-13 Download PDF prints just the report", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/export");
  await page.evaluate(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => {
      (window as unknown as { printed: number }).printed++;
    };
  });
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { printed: number }).printed,
    ),
  ).toBe(1);

  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Goal report" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await expect(page.getByRole("button", { name: "User menu" })).toBeHidden();
  await expect(page.getByRole("form", { name: "Report options" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeHidden();
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.body);
    return [style.color, style.backgroundColor];
  });
  expect(colors).toEqual(["rgb(20, 24, 26)", "rgb(255, 255, 255)"]);
});

test("EXP-14 Download CSV", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "Read 20 pages", startsOn: "2026-09-19" });
  await page.goto("/export?from=2026-09-19&to=2026-09-20");
  const href = await page
    .getByRole("link", { name: "Download CSV" })
    .getAttribute("href");
  expect(href).toBe("/export/csv?from=2026-09-19&to=2026-09-20");

  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("text/csv; charset=utf-8");
  expect(response.headers()["content-disposition"]).toBe(
    'attachment; filename="goal-report-avery-2026-09-19-to-2026-09-20.csv"',
  );
  expect((await response.text()).split("\r\n")).toEqual([
    "record,date,end_date,goal,cadence,status,reason,person,note",
    "goal,2026-09-19,2026-09-19,Read 20 pages,daily,Missed,,,",
    "goal,2026-09-20,2026-09-20,Read 20 pages,daily,Missed,,,",
    "",
  ]);
});

test("EXP-16 only your own team, and signed out goes to sign-in", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  const blakeTeam = teamPath("blake").split("/")[2];
  await page.goto(`/export?team=${blakeTeam}`);
  await expect(page.getByText("Avery Adams · Team Avery")).toBeVisible();
  const csv = await page.request.get(
    `/export/csv?team=${blakeTeam}&from=2026-09-19&to=2026-09-19`,
  );
  expect(csv.headers()["content-disposition"]).toContain("goal-report-avery");

  await page.context().clearCookies();
  await page.goto("/export");
  await expect(page).toHaveURL(/\/$/);
  const signedOut = await page.request.get("/export/csv", {
    maxRedirects: 0,
  });
  expect(signedOut.status()).toBe(307);
  expect(signedOut.headers()["location"]).toMatch(/\/$/);
});

test("EXP-17 fits a 375px-wide phone without horizontal scrolling", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/goals");
  for (const title of ["Read 20 pages", "Walk the dog", "Practice piano"]) {
    await addGoal(page, { title, startsOn: "2026-09-19" });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/export");
  await expect(
    page.getByRole("heading", { level: 1, name: "Goal report" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
