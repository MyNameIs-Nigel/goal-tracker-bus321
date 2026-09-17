import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { addGoal } from "./helpers";

/**
 * docs/specs/hover-feedback.md. These assert *computed* styles in a real
 * browser rather than class names — the classes are unlayered CSS written to
 * outrank Tailwind's utilities layer, and only the browser can prove that
 * actually happened.
 */

// app/globals.css, light scheme.
const ACCENT = "rgb(47, 125, 90)";
const ACCENT_HOVER = "rgb(38, 104, 74)";
const TRANSPARENT = "rgba(0, 0, 0, 0)";
const DURATION = "0.15s";

test.use({ colorScheme: "light" });

function style(locator: Locator, property: string) {
  return locator.evaluate(
    (element, name) => getComputedStyle(element).getPropertyValue(name),
    property,
  );
}

/** Tabs until `locator` has focus, so `:focus-visible` really applies. */
async function tabTo(page: Page, locator: Locator) {
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    if (await locator.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("never reached the element with the keyboard");
}

test("HOVER-01 a nav link takes the accent on hover", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.skip(isMobile, "touch devices get no hover accent — that is HOVER-10");
  await signInAs("viewer");
  await page.goto("/today");

  const link = page.getByRole("link", { name: "Goals" });
  expect(await style(link, "color")).not.toBe(ACCENT);
  await link.hover();
  await expect.poll(() => style(link, "color")).toBe(ACCENT);
});

test("HOVER-02 a filled accent button deepens on hover", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.skip(isMobile, "touch devices get no hover accent — that is HOVER-10");
  await signInAs("owner");
  await page.goto("/goals");

  const button = page.getByRole("button", { name: "Add goal" });
  expect(await style(button, "background-color")).toBe(ACCENT);
  await button.hover();
  await expect.poll(() => style(button, "background-color")).toBe(ACCENT_HOVER);
});

test("HOVER-03 an outlined button takes an accent border and a tint", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.skip(isMobile, "touch devices get no hover accent — that is HOVER-10");
  await signInAs("owner");
  await page.goto("/today");

  const button = page.getByRole("button", { name: "Mark an exception" });
  const restingBackground = await style(button, "background-color");
  expect(await style(button, "border-top-color")).not.toBe(ACCENT);

  await button.hover();
  await expect.poll(() => style(button, "border-top-color")).toBe(ACCENT);
  expect(await style(button, "background-color")).not.toBe(restingBackground);
});

test("HOVER-05 a history day shows an outline on hover, and only that day", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.skip(isMobile, "touch devices get no hover accent — that is HOVER-10");
  await signInAs("viewer");
  // An explicit month, so the test doesn't depend on when CI runs.
  await page.goto("/history?month=2026-09");

  const day = page.getByRole("link", { name: /^September 10/ });
  const neighbour = page.getByRole("link", { name: /^September 11/ });
  expect(await style(day, "outline-color")).toBe(TRANSPARENT);

  const box = await day.boundingBox();
  await day.hover();
  await expect.poll(() => style(day, "outline-color")).toBe(ACCENT);
  expect(await style(neighbour, "outline-color")).toBe(TRANSPARENT);
  // An outline is not layout: the cell must not move or resize under it.
  expect(await day.boundingBox()).toEqual(box);
});

test("HOVER-07 accents transition in 150ms, nav bar included", async ({
  page,
  signInAs,
}) => {
  await signInAs("viewer");
  await page.goto("/today");

  const link = page.getByRole("link", { name: "Goals" });
  expect(await style(link, "transition-duration")).toBe(DURATION);
  const properties = await style(link, "transition-property");
  for (const property of [
    "color",
    "background-color",
    "border-color",
    "outline-color",
  ]) {
    expect(properties).toContain(property);
  }
});

test("HOVER-08 a disabled control shows no hover accent", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.skip(isMobile, "touch devices get no hover accent — that is HOVER-10");
  await signInAs("owner");
  await page.goto("/goals");
  await addGoal(page, { title: "Read 20 pages" });

  // One goal, so it can't move up.
  const button = page.getByRole("button", { name: "Move up" });
  await expect(button).toBeDisabled();
  const before = await style(button, "color");

  // Not `.hover()`: a disabled control is not actionable, and the point is
  // what the pointer being over it does *not* do.
  const box = await button.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.waitForTimeout(300);
  expect(await style(button, "color")).toBe(before);
});

test("HOVER-09 keyboard focus shows the same accent as hover", async ({
  page,
  signInAs,
}) => {
  await signInAs("viewer");
  await page.goto("/today");

  const link = page.getByRole("link", { name: "Goals" });
  expect(await style(link, "color")).not.toBe(ACCENT);
  await tabTo(page, link);
  await expect(link).toBeFocused();
  await expect.poll(() => style(link, "color")).toBe(ACCENT);
});

test("HOVER-10 a touch-only device gets no hover accent", async ({
  page,
  signInAs,
  isMobile,
}) => {
  test.skip(!isMobile, "the point of this one is the touch viewport");
  await signInAs("viewer");
  await page.goto("/today");

  expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(
    false,
  );

  const link = page.getByRole("link", { name: "Goals" });
  // The class is applied — it simply does nothing here, so a tapped link is
  // never left stuck in the accent.
  expect(await style(link, "transition-duration")).toBe(DURATION);
  const before = await style(link, "color");
  await link.hover();
  await page.waitForTimeout(300);
  expect(await style(link, "color")).toBe(before);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("HOVER-11 the accent still appears but does not animate", async ({
    page,
    signInAs,
    isMobile,
  }) => {
    test.skip(isMobile, "hover is covered on the desktop project");
    await signInAs("viewer");
    await page.goto("/today");

    const link = page.getByRole("link", { name: "Goals" });
    const duration = await style(link, "transition-duration");
    expect(Number.parseFloat(duration)).toBeLessThan(0.01);

    await link.hover();
    await expect.poll(() => style(link, "color")).toBe(ACCENT);
  });
});
