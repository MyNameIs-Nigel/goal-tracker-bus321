import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { expect, teamPath, test } from "./fixtures";
import { region, resetWithDemo, teammateRow } from "./helpers";

test("LAUNCH-01 production alias preserves path and query in permanent redirect", async ({
  request,
}) => {
  const response = await request.get("/history?month=2026-09", {
    headers: { host: "goal-tracker-bus321.vercel.app" },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe(
    "https://bus321.nigel-smith.dev/history?month=2026-09",
  );
  const local = await request.get("/", { maxRedirects: 0 });
  expect(local.status()).toBe(200);
});

test("LAUNCH-04 public identity images load without authentication", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^https:\/\/bus321\.nigel-smith\.dev\/opengraph-image/,
  );
  for (const path of ["/icon", "/opengraph-image"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

async function auditRoutes(page: Page, routes: readonly string[]) {
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations, `${colorScheme} ${route}`).toEqual([]);
      const small = await page
        .locator("button:visible, select:visible, nav a:visible")
        .evaluateAll((elements) =>
          elements
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.height < 44 || r.width < 44;
            })
            .map((el) => el.textContent || el.getAttribute("aria-label")),
        );
      expect(small, `Small targets on ${route}`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Horizontal overflow on ${route}`,
      ).toBe(true);
    }
  }
}

test("LAUNCH-03 your own and a teammate's routes pass accessibility in light and dark, with demo data", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.setTimeout(180_000);
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
  await resetWithDemo(page);
  await signInAs("avery");
  await auditRoutes(page, [
    "/today",
    "/goals",
    "/contract",
    "/history",
    teamPath("blake"),
    teamPath("blake", "/contract"),
    teamPath("blake", "/history"),
  ]);

  // A note field open on a teammate's row, and the profile panel.
  await page.goto("/today");
  await page.getByRole("button", { name: "Check in on Blake" }).click();
  await teammateRow(page, "Blake Brown")
    .getByRole("button", { name: "Add a note" })
    .click();
  await page.getByRole("button", { name: "User menu" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.goto("/today");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("LAUNCH-03 empty states pass accessibility too", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.setTimeout(120_000);
  if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
  await signInAs("casey");
  await auditRoutes(page, [
    "/today",
    "/goals",
    "/contract",
    "/history",
    teamPath("avery"),
  ]);
});

test("LAUNCH-05 every request is answered for the person making it", async ({
  page: avery,
  browser,
  signInAs,
}) => {
  // Blake gets a browser of his own; Avery is the fixture's (reset) page.
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  try {
    const blake = await context.newPage();
    await signInAs("avery");
    await blake.request.post("/api/e2e/sign-in", {
      data: { student: "blake" },
    });
    await Promise.all([avery.goto("/today"), blake.goto("/today")]);

    await expect(teammateRow(avery, "Blake Brown")).toBeVisible();
    await expect(teammateRow(avery, "Avery Adams")).toHaveCount(0);
    await expect(teammateRow(blake, "Avery Adams")).toBeVisible();
    await expect(teammateRow(blake, "Blake Brown")).toHaveCount(0);

    await avery.getByRole("button", { name: "Check in on Blake" }).click();
    await expect(teammateRow(avery, "Blake Brown")).toContainText("Checked ✓");
    await blake.reload();
    await expect(teammateRow(blake, "Avery Adams")).not.toContainText(
      "Checked ✓",
    );
    await expect(region(blake, "Checked on you")).toContainText("Checked ✓");
  } finally {
    await context.close();
  }
});

test("LAUNCH-06 open profile panel never covers the navigation", async ({
  page,
  signInAs,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "phone header layout only");
  await signInAs("avery");
  await page.goto("/today");
  await page.getByRole("button", { name: "User menu" }).click();
  const panel = page.getByRole("region", { name: "Your profile" });
  await expect(panel).toBeVisible();

  const panelBox = (await panel.boundingBox())!;
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const name of ["Today", "Goals", "Contract", "History"]) {
    const link = nav.getByRole("link", { name, exact: true });
    const linkBox = (await link.boundingBox())!;
    expect(
      linkBox.y + linkBox.height <= panelBox.y,
      `${name} overlaps the profile panel`,
    ).toBe(true);
  }

  // One tap navigates, rather than only dismissing the panel.
  await nav.getByRole("link", { name: "Goals", exact: true }).click();
  await expect(page).toHaveURL(/\/goals$/);
});
