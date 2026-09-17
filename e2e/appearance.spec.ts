import { expect, test } from "./fixtures";

test("THEME-02 explicit appearance persists across pages and reload", async ({
  page,
  signInAs,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await signInAs("viewer");
  await page.goto("/today");
  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.getByRole("link", { name: "Goals", exact: true }).click();
  await page.reload();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await page.getByRole("button", { name: "User menu" }).click();
  await expect(
    page.getByRole("radio", { name: "Light", exact: true }),
  ).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(13, 16, 18)",
  );
});
test("THEME-03 system follows device changes live", async ({
  page,
  signInAs,
}) => {
  await signInAs("partner");
  await page.goto("/today");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(13, 16, 18)",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
});
test("THEME-04 arrow keys select appearance and Escape closes the panel", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.goto("/today");
  await page.getByRole("button", { name: "User menu" }).click();
  await page.getByRole("radio", { name: "System" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "User menu" })).toBeFocused();
});
test("THEME-06 saved appearance applies before hydration and reduced motion stops the slider", async ({
  page,
  signInAs,
}) => {
  await signInAs("owner");
  await page.addInitScript(() => localStorage.setItem("bus321-theme", "dark"));
  await page.route("**/_next/**/*.js", (route) => route.abort());
  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(13, 16, 18)",
  );
  await page.unrouteAll();
  await page.reload();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "User menu" }).click();
  await expect(page.locator(".theme-indicator")).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
