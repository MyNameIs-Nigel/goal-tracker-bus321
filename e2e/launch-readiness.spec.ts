import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

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

for (const role of ["owner", "partner", "viewer"] as const) {
  test(`LAUNCH-03 ${role} main routes pass accessibility in light and dark`, async ({
    page,
    signInAs,
    isMobile,
  }) => {
    test.setTimeout(120_000);
    if (isMobile) await page.setViewportSize({ width: 375, height: 812 });
    await signInAs(role);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      for (const route of [
        "/today",
        "/goals",
        "/contract",
        "/history",
        ...(role === "owner" ? ["/people"] : []),
      ]) {
        await page.goto(route);
        await expect(page.locator("h1")).toBeVisible();
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(result.violations, `${role} ${colorScheme} ${route}`).toEqual(
          [],
        );
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
        ).toBe(true);
      }
    }
    await page.goto("/today");
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
}

test("LAUNCH-05 demotion refreshes authorization for an existing session and action", async ({
  page,
  browser,
  signInAs,
}) => {
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  try {
    const partner = await context.newPage();
    await partner.request.post("/api/e2e/sign-in", {
      data: { role: "partner" },
    });
    await partner.goto("/today");
    await expect(
      partner.getByRole("button", { name: "I checked today" }),
    ).toBeVisible();
    await signInAs("owner");
    await page.goto("/people");
    await page
      .getByRole("combobox", { name: "Role for Test Partner" })
      .selectOption("viewer");
    await expect(page.getByText("Test Partner is now a viewer")).toBeVisible();
    await partner.getByRole("button", { name: "I checked today" }).click();
    await expect(
      partner.getByRole("heading", { name: "We couldn’t load this page" }),
    ).toBeVisible();
    await partner.getByRole("button", { name: "Try again" }).click();
    await expect(partner.getByRole("heading", { level: 1 })).not.toHaveText(
      "We couldn’t load this page",
    );
    await expect(
      partner.getByRole("button", { name: "I checked today" }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("LAUNCH-06 open profile panel never covers the navigation", async ({
  page,
  signInAs,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "phone header layout only");
  await signInAs("owner");
  await page.goto("/today");
  await page.getByRole("button", { name: "User menu" }).click();
  const panel = page.getByRole("region", { name: "Your profile" });
  await expect(panel).toBeVisible();

  const panelBox = (await panel.boundingBox())!;
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const name of ["Today", "Goals", "History", "People"]) {
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
