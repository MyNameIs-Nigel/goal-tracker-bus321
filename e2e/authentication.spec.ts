import { expect, test } from "./fixtures";
import { openProfile, region, teammateRow } from "./helpers";

test("AUTH-01 unauthenticated visitors are sent to the sign-in page", async ({
  page,
}) => {
  await page.goto("/today");
  await expect(page).toHaveURL("/");
});

test("AUTH-02 the sign-in page offers Google", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "BUS 321 Goal Tracker" }),
  ).toBeVisible();
  await expect(
    page.getByText("Your goals, and the classmates keeping you honest."),
  ).toBeVisible();

  const button = page.getByRole("button", { name: "Continue with Google" });
  await expect(button).toBeVisible();

  const socialRequest = page.waitForRequest(
    (request) =>
      request.url().includes("/api/auth/sign-in/social") &&
      request.method() === "POST",
  );
  await button.click();
  await expect(socialRequest).resolves.toBeTruthy();
});

test("AUTH-03 first sign-in creates a student with a team and lands on /today", async ({
  page,
}) => {
  // Dana has never signed in; the test button path is the same one Google's
  // callback takes: a session, then /today.
  await page.goto("/");
  const response = await page.request.post("/api/e2e/sign-in", {
    data: { student: "dana" },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/");
  await expect(page).toHaveURL("/today");
  await expect(page.getByText("No goals yet.")).toBeVisible();
  await expect(await openProfile(page)).toContainText("Team Dana");
});

test("AUTH-05 signed-in visitors skip the sign-in page", async ({
  page,
  signInAs,
}) => {
  await signInAs("casey");
  await page.goto("/");
  await expect(page).toHaveURL("/today");
});

test("AUTH-06 sign out ends the session", async ({ page, signInAs }) => {
  await signInAs("avery");
  await page.goto("/today");

  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/");
  await page.goto("/today");
  await expect(page).toHaveURL("/");
});

test("AUTH-07 the session survives a reload", async ({ page, signInAs }) => {
  await signInAs("blake");
  await page.goto("/today");
  await page.reload();
  await expect(page).toHaveURL("/today");
});

test("AUTH-08 a cancelled sign-in is friendly", async ({ page }) => {
  await page.goto("/?error=1");
  await expect(
    page.getByRole("alert").getByText("Sign-in didn’t complete. Try again."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("AUTH-09 test sign-in signs in as a fake student and lands on /today", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Test sign-in")).toBeVisible();
  for (const name of ["Avery", "Casey", "Load demo data"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("button", { name: "Blake", exact: true }).click();
  await expect(page).toHaveURL("/today");
  await expect(await openProfile(page)).toContainText("blake@e2e.local");
});

test("AUTH-11 reset seeds three students and sign-in works for each", async ({
  page,
  signInAs,
}) => {
  for (const [student, name] of [
    ["avery", "Avery Adams"],
    ["blake", "Blake Brown"],
    ["casey", "Casey Clark"],
  ] as const) {
    await signInAs(student);
    await page.goto("/today");
    await expect(page).toHaveURL("/today");
    await expect(await openProfile(page)).toContainText(name);
  }
});

test("AUTH-11 reset's `now` pins lib/clock.ts until the next reset", async ({
  page,
  signInAs,
}) => {
  const response = await page.request.post("/api/e2e/reset", {
    data: { now: "2026-09-20T04:30:00Z" },
  });
  expect(response.ok()).toBe(true);

  await signInAs("avery");
  await page.goto("/today");
  // 04:30 UTC is still 2026-09-19 evening in America/Denver (a Saturday).
  await expect(
    page.getByRole("heading", { name: "Saturday, September 19" }),
  ).toBeVisible();
});

test("AUTH-12 the header shows who you are", async ({ page, signInAs }) => {
  await signInAs("avery");
  await page.goto("/today");

  const profile = await openProfile(page);
  await expect(profile).toContainText("Avery Adams");
  await expect(profile).toContainText("avery@e2e.local");
  await expect(profile).toContainText("Team Avery");
});

test("AUTH-13 Load demo data fills the app with a fake class and signs in as Avery", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load demo data" }).click();
  await expect(page).toHaveURL("/today");

  await expect(page.getByText("Read 20 pages")).toBeVisible();
  await expect(teammateRow(page, "Blake Brown")).toContainText("All done");
  await expect(teammateRow(page, "Casey Clark")).toContainText("1 of 2 done");
  await expect(region(page, "Checked on you")).toContainText("Checked ✓");
  await expect(await openProfile(page)).toContainText("Team Avery");
});
