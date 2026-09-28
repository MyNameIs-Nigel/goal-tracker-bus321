import { expect, test } from "./fixtures";
import { region } from "./helpers";

// Avery is seeded as the admin (db/seed.e2e.ts).

test("ADM-01 the admin sees every user", async ({ page, signInAs }) => {
  await signInAs("avery");
  await page.goto("/admin");
  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Blake Brown");
  await expect(rows.nth(1)).toContainText("blake@e2e.local");
  await expect(rows.nth(1)).toContainText("Active");
  await expect(
    page.getByRole("button", { name: "Disable Blake Brown" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Disable Avery/ })).toHaveCount(0);
});

test("ADM-02 anyone else gets a 404, and signed-out visitors go to /", async ({
  page,
  signInAs,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/");
  await signInAs("blake");
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
});

test("ADM-03..05 disable, lock out, and re-enable a user", async ({
  page,
  signInAs,
}) => {
  await signInAs("avery");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Disable Blake Brown" }).click();
  await expect(page.getByRole("button", { name: "Enable Blake Brown" })).toBeVisible();

  await signInAs("casey");
  await page.goto("/today");
  await expect(region(page, "Your teammates")).not.toContainText("Blake");

  // ADM-04: Blake can't get a session at all.
  const attempt = await page.request.post("/api/e2e/sign-in", {
    data: { student: "blake" },
  });
  expect(attempt.ok()).toBe(false);

  await signInAs("avery");
  await page.goto("/admin");
  await page.getByRole("button", { name: "Enable Blake Brown" }).click();
  await expect(page.getByRole("button", { name: "Disable Blake Brown" })).toBeVisible();

  await signInAs("blake");
  await page.goto("/today");
  await expect(page).toHaveURL("/today");
});

test("ADM-04 an already signed-in user is sent to /disabled", async ({
  page,
  signInAs,
  browser,
  baseURL,
}) => {
  await signInAs("blake");
  await page.goto("/today");
  await expect(page).toHaveURL("/today");

  const adminContext = await browser.newContext({ baseURL });
  const admin = await adminContext.newPage();
  await admin.request.post("/api/e2e/sign-in", { data: { student: "avery" } });
  await admin.goto("/admin");
  await admin.getByRole("button", { name: "Disable Blake Brown" }).click();
  await expect(admin.getByRole("button", { name: "Enable Blake Brown" })).toBeVisible();
  await adminContext.close();

  await page.goto("/today");
  await expect(page).toHaveURL("/disabled");
  await expect(page.getByText("Your account is disabled.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});
