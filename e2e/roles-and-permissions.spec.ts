import { expect, test } from "./fixtures";

// ROLE-04 needs the partner check-in action (Phase 3); the goal/document
// parts of ROLE-03/ROLE-05 need those actions (Phase 2/3). See
// docs/specs/roles-and-permissions.md § Phased test coverage. ROLE-03's
// "Server Action rejects" side is a unit test:
// lib/actions/people.test.ts.

test("ROLE-01 viewers can read everything, with no write controls", async ({
  page,
  signInAs,
}) => {
  await signInAs("viewer");
  for (const path of [
    "/today",
    "/day/2026-09-19",
    "/goals",
    "/contract",
    "/history",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("button", { name: /add goal/i })).toHaveCount(
      0,
    );
  }
});

test("ROLE-02 owner-only pages are not found for others", async ({
  page,
  signInAs,
}) => {
  for (const role of ["viewer", "partner"] as const) {
    await signInAs(role);
    const response = await page.goto("/people");
    expect(response?.status()).toBe(404);
  }
});

test("ROLE-05 the owner can do everything in the matrix", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  const response = await page.goto("/people");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
});

test("ROLE-06 exactly one owner, fixed in the UI", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/people");
  await expect(page.getByText("Owner (you)")).toBeVisible();
  // Three seeded users, one owner: exactly two role selects (partner, viewer).
  await expect(page.getByRole("combobox")).toHaveCount(2);
});

test("ROLE-07 role changes take effect immediately, without re-signing in", async ({
  page,
  browser,
  signInAs,
}) => {
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await viewerPage.request.post("/api/e2e/sign-in", {
    data: { role: "viewer" },
  });
  await viewerPage.goto("/today");
  await viewerPage.getByRole("button", { name: "User menu" }).click();
  await expect(
    viewerPage.getByRole("region", { name: "Your profile" }),
  ).toContainText("Viewer");
  await viewerPage.getByRole("button", { name: "User menu" }).click();

  await signInAs("owner");
  await page.goto("/people");
  await page
    .getByRole("combobox", { name: "Role for Test Viewer" })
    .selectOption("partner");
  await expect(page.getByText("Test Viewer is now a partner")).toBeVisible();

  await viewerPage.goto("/today");
  await viewerPage.getByRole("button", { name: "User menu" }).click();
  await expect(
    viewerPage.getByRole("region", { name: "Your profile" }),
  ).toContainText("Partner");

  await viewerContext.close();
});

test("ROLE-08 the primary nav shows People only for the owner", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/today");
  const ownerNav = page.getByRole("navigation", { name: "Primary" });
  await expect(ownerNav.getByRole("link", { name: "Today" })).toBeVisible();
  await expect(ownerNav.getByRole("link", { name: "People" })).toBeVisible();

  await signInAs("viewer");
  await page.goto("/today");
  const viewerNav = page.getByRole("navigation", { name: "Primary" });
  await expect(viewerNav.getByRole("link", { name: "People" })).toHaveCount(0);
});
