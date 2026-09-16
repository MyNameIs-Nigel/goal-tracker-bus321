import { expect, test } from "./fixtures";

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
    page.getByText("Nigel’s goals, and the people keeping him honest."),
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

test("AUTH-05 signed-in visitors skip the sign-in page", async ({
  page,
  signInAs,
}) => {
  await signInAs("viewer");
  await page.goto("/");
  await expect(page).toHaveURL("/today");
});

test("AUTH-06 sign out ends the session", async ({ page, signInAs }) => {
  await signInAs("owner");
  await page.goto("/today");

  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL("/");
  await page.goto("/today");
  await expect(page).toHaveURL("/");
});

test("AUTH-07 the session survives a reload", async ({ page, signInAs }) => {
  await signInAs("partner");
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

test("AUTH-09 test sign-in signs in as the seeded partner and lands on /today", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Test sign-in")).toBeVisible();

  await page.getByRole("button", { name: "Partner", exact: true }).click();
  await expect(page).toHaveURL("/today");
});

test("AUTH-11 reset seeds three users and sign-in works for each role", async ({
  page,
  signInAs,
}) => {
  for (const role of ["owner", "partner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/today");
    await expect(page).toHaveURL("/today");
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

  await signInAs("owner");
  await page.goto("/today");
  // 04:30 UTC is still 2026-09-19 evening in America/Denver.
  await expect(page.getByText("2026-09-19")).toBeVisible();
});

test("AUTH-12 the header shows who you are", async ({ page, signInAs }) => {
  await signInAs("viewer");
  await page.goto("/today");

  await page.getByRole("button", { name: "User menu" }).click();
  await expect(page.getByRole("menu")).toContainText("Test Viewer");
  await expect(page.getByRole("menu")).toContainText("viewer@e2e.local");
  await expect(page.getByRole("menu")).toContainText("Viewer");
});
