import { expect, teamPath, test } from "./fixtures";
import { addGoal, region, resetAt, teammateRow } from "./helpers";

// 02:12 UTC on 9/24 is 8:12 PM on Wednesday 2026-09-23 in America/Denver —
// PCI-02's example time. The direct-action rejections (another date, your own
// team, no user-id parameter) are unit tests: lib/actions/checkins.test.ts.
// PCI-07 (you're the only student) and PCI-08 (double tap) are component
// tests — components/TeammateList.test.tsx — since the seed always has three
// students and a browser can't reliably tap twice inside one round trip.
const FIXED_NOW = "2026-09-24T02:12:00Z";

test("PCI-01 your teammates are listed with their day and a Check in button", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("blake");
  await page.goto("/goals");
  await addGoal(page, { title: "Practice Spanish" });
  await addGoal(page, { title: "Lights out by 11" });
  await page.goto("/today");
  await page.getByRole("button", { name: /Practice Spanish/ }).click();
  await expect(page.getByText("Today · 1 of 2 done")).toBeVisible();

  await signInAs("avery");
  await page.goto("/today");
  const rows = region(page, "Your teammates").getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Blake Brown");
  await expect(rows.nth(0)).toContainText("1 of 2 done · No streak yet");
  await expect(rows.nth(1)).toContainText("Casey Clark");
  await expect(rows.nth(1)).toContainText("No goals yet");
  await expect(
    rows.nth(0).getByRole("button", { name: "Check in on Blake" }),
  ).toBeVisible();
  await expect(
    rows.nth(1).getByRole("button", { name: "Check in on Casey" }),
  ).toBeVisible();
  await expect(
    rows.nth(0).getByRole("link", { name: "Blake Brown" }),
  ).toHaveAttribute("href", teamPath("blake"));
});

test("PCI-02 one tap checks in, and it survives a reload", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/today");
  await expect(region(page, "Your teammates")).toContainText("0 of 2 checked");

  await page.getByRole("button", { name: "Check in on Blake" }).click();
  await expect(teammateRow(page, "Blake Brown")).toContainText(
    "Checked ✓ 8:12 PM",
  );
  await expect(
    page.getByRole("button", { name: "Check in on Blake" }),
  ).toHaveCount(0);
  await expect(region(page, "Your teammates")).toContainText("1 of 2 checked");

  await page.reload();
  await expect(teammateRow(page, "Blake Brown")).toContainText(
    "Checked ✓ 8:12 PM",
  );
  await expect(region(page, "Your teammates")).toContainText("1 of 2 checked");
});

test("PCI-03 an optional note reaches the teammate, and saving again replaces it", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto("/today");
  await page.getByRole("button", { name: "Check in on Blake" }).click();

  const blake = teammateRow(page, "Blake Brown");
  await blake.getByRole("button", { name: "Add a note" }).click();
  await page.getByLabel("Note for Blake").fill("Nice streak, keep it up");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(blake).toContainText("Nice streak, keep it up");
  await expect(page.getByLabel("Note for Blake")).toHaveCount(0);

  await signInAs("blake");
  await page.goto("/today");
  await expect(region(page, "Checked on you")).toContainText(
    "Nice streak, keep it up",
  );

  await signInAs("avery");
  await page.goto("/today");
  await blake.getByRole("button", { name: "Edit note" }).click();
  await page.getByLabel("Note for Blake").fill("Second note");
  await page.getByRole("button", { name: "Save note" }).click();
  await expect(blake).toContainText("Second note");

  await signInAs("blake");
  await page.goto("/today");
  await expect(region(page, "Checked on you")).toContainText("Second note");
  await expect(region(page, "Checked on you")).not.toContainText(
    "Nice streak, keep it up",
  );
});

test("PCI-05 a teammate's past day shows check-ins read-only, with no button", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto(teamPath("blake", "/day/2026-09-21"));

  await expect(region(page, "Partners")).toBeVisible();
  await expect(region(page, "Partners")).toContainText("Not yet");
  await expect(page.getByRole("button", { name: /Check in/ })).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("PCI-06 your own pages never offer a check-in on yourself", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  for (const path of ["/today", "/day/2026-09-22"]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: /Check in on Avery/ }),
    ).toHaveCount(0);
    await expect(
      region(page, "Checked on you").getByRole("button"),
    ).toHaveCount(0);
  }
});

test("PCI-10 Checked on you shows who checked, when, and who hasn't", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("blake");
  await page.goto("/today");
  await page.getByRole("button", { name: "Check in on Avery" }).click();
  await expect(teammateRow(page, "Avery Adams")).toContainText("Checked ✓");

  await signInAs("avery");
  await page.goto("/today");
  const rows = region(page, "Checked on you").getByRole("listitem");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Blake Brown");
  await expect(rows.nth(0)).toContainText("Checked ✓ 8:12 PM");
  await expect(rows.nth(1)).toContainText("Casey Clark");
  await expect(rows.nth(1)).toContainText("Not yet");
});

test("PCI-11 you can check in from a teammate's page too", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("avery");
  await page.goto(teamPath("blake"));

  const partners = region(page, "Partners").getByRole("listitem");
  await expect(partners).toHaveCount(2);
  await expect(partners.nth(0)).toContainText("Avery Adams");
  await expect(partners.nth(1)).toContainText("Casey Clark");
  await page.getByRole("button", { name: "Check in on Blake" }).click();
  await expect(partners.nth(0)).toContainText("Checked ✓ 8:12 PM");

  await page.goto("/today");
  await expect(teammateRow(page, "Blake Brown")).toContainText(
    "Checked ✓ 8:12 PM",
  );
});
