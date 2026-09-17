import { expect, test } from "./fixtures";
import { resetAt } from "./helpers";

// 02:12 UTC on 9/24 is 8:12 PM on Wednesday 2026-09-23 in America/Denver —
// PCI-01's example time. ROLE-04's "another date / another user" rejections
// are unit tests (lib/actions/checkins.test.ts): the action has no user-id
// parameter and refuses any date but today.
const FIXED_NOW = "2026-09-24T02:12:00Z";

const section = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Accountability partners" });

test("PCI-01 partners and their status are listed for everyone", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);

  // A second partner: the owner promotes the seeded viewer.
  await signInAs("owner");
  await page.goto("/people");
  await page
    .getByRole("combobox", { name: "Role for Test Viewer" })
    .selectOption("partner");
  await expect(page.getByText("Test Viewer is now a partner")).toBeVisible();

  await signInAs("partner");
  await page.goto("/today");
  await page.getByRole("button", { name: "I checked today" }).click();
  await expect(section(page).getByText("Checked ✓ 8:12 PM")).toBeVisible();

  await signInAs("owner");
  await page.goto("/today");
  const rows = section(page).getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Test Partner");
  await expect(rows.nth(0)).toContainText("Checked ✓ 8:12 PM");
  await expect(rows.nth(1)).toContainText("Test Viewer");
  await expect(rows.nth(1)).toContainText("Not yet");
});

test("PCI-02 a partner checks in and it survives a reload", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("partner");
  await page.goto("/today");

  await expect(section(page).getByText("Not yet")).toBeVisible();
  await page.getByRole("button", { name: "I checked today" }).click();

  await expect(section(page).getByText(/Checked ✓/)).toBeVisible();
  await expect(page.getByLabel("Leave a note (optional)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I checked today" }),
  ).toHaveCount(0);

  await page.reload();
  await expect(section(page).getByText(/Checked ✓/)).toBeVisible();
  await expect(page.getByLabel("Leave a note (optional)")).toBeVisible();
});

test("PCI-03 a partner leaves a note, everyone reads it, and saving again replaces it", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("partner");
  await page.goto("/today");
  await page.getByRole("button", { name: "I checked today" }).click();

  await page
    .getByLabel("Leave a note (optional)")
    .fill("Nice streak, keep it up");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await signInAs("viewer");
  await page.goto("/today");
  await expect(
    section(page).getByText("Nice streak, keep it up"),
  ).toBeVisible();

  await signInAs("partner");
  await page.goto("/today");
  await page.getByLabel("Leave a note (optional)").fill("Second note");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await signInAs("viewer");
  await page.goto("/today");
  await expect(section(page).getByText("Second note")).toBeVisible();
  await expect(section(page).getByText("Nice streak, keep it up")).toHaveCount(
    0,
  );
});

test("PCI-05 a past day shows check-ins read-only, with no button", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("partner");
  await page.goto("/day/2026-09-21");

  await expect(section(page)).toBeVisible();
  await expect(section(page).getByText("Not yet")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I checked today" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Leave a note (optional)")).toHaveCount(0);
});

test("PCI-06 the owner and viewers don't get the button", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  for (const role of ["owner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/today");
    await expect(section(page)).toBeVisible();
    await expect(
      page.getByRole("button", { name: "I checked today" }),
    ).toHaveCount(0);
  }
});

test("PCI-07 no partners yet — owner gets the People link, others don't", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/people");
  await page
    .getByRole("combobox", { name: "Role for Test Partner" })
    .selectOption("viewer");
  await expect(page.getByText("Test Partner is now a viewer")).toBeVisible();

  await page.goto("/today");
  await expect(section(page).getByText("No partners yet.")).toBeVisible();
  await expect(
    section(page).getByRole("link", {
      name: "Promote someone on the People page",
    }),
  ).toHaveAttribute("href", "/people");

  await signInAs("viewer");
  await page.goto("/today");
  await expect(section(page).getByText("No partners yet.")).toBeVisible();
  await expect(section(page).getByRole("link")).toHaveCount(0);
});

test("DT-16 the Accountability partners section is on the day page for every role", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  for (const role of ["owner", "partner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/today");
    await expect(
      page.getByRole("heading", { name: "Accountability partners" }),
    ).toBeVisible();
  }
});
