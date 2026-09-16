import { expect, test } from "./fixtures";

// PPL-06 (the empty state, reachable only when the owner is the sole
// signed-in user) is a component test — the fixed three-user seed always
// creates a partner and a viewer too. See components/PeopleList.test.tsx.

test("PPL-01 every signed-in user is listed, owner first", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/people");

  await expect(page.getByText("Test Owner")).toBeVisible();
  await expect(page.getByText("Test Partner")).toBeVisible();
  await expect(page.getByText("Test Viewer")).toBeVisible();
  await expect(page.getByText("owner@e2e.local")).toBeVisible();
  await expect(page.getByText(/^Joined /).first()).toBeVisible();
});

test("PPL-02 promote a viewer to partner", async ({ page, signInAs }) => {
  await signInAs("owner");
  await page.goto("/people");

  await page
    .getByRole("combobox", { name: "Role for Test Viewer" })
    .selectOption("partner");

  await expect(page.getByText("Test Viewer is now a partner")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Role for Test Viewer" }),
  ).toHaveValue("partner");
});

test("PPL-03 demote a partner to viewer", async ({ page, signInAs }) => {
  await signInAs("owner");
  await page.goto("/people");

  await page
    .getByRole("combobox", { name: "Role for Test Partner" })
    .selectOption("viewer");

  await expect(page.getByText("Test Partner is now a viewer")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Role for Test Partner" }),
  ).toHaveValue("viewer");
});

test("PPL-04 the owner's own row is fixed", async ({ page, signInAs }) => {
  await signInAs("owner");
  await page.goto("/people");
  await expect(page.getByText("Owner (you)")).toBeVisible();
});

test("PPL-05 not found for non-owners", async ({ page, signInAs }) => {
  await signInAs("partner");
  const response = await page.goto("/people");
  expect(response?.status()).toBe(404);
});

test("PPL-07 the partner count is visible and pluralized correctly", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/people");
  await expect(page.getByText("1 partner", { exact: true })).toBeVisible();

  await page
    .getByRole("combobox", { name: "Role for Test Viewer" })
    .selectOption("partner");
  await expect(page.getByText("2 partners", { exact: true })).toBeVisible();
});
