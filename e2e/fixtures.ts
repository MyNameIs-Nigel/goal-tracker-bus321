import { test as base, expect } from "@playwright/test";

import { E2E_TEAM_IDS } from "../lib/e2e";

/**
 * docs/TESTING.md § E2E setup. Every test starts from the same seeded state
 * (`POST /api/e2e/reset`, run once per test via the `page` fixture): three
 * fake students, Avery, Blake and Casey, each with a team. Dana is signed up
 * the first time a test signs her in. `signInAs` hits the same endpoint the
 * sign-in page's test buttons use.
 */

export type Student = "avery" | "blake" | "casey" | "dana";

type Fixtures = {
  signInAs: (student: Student) => Promise<void>;
};

/** A seeded student's team page (`/team/<id>`), plus an optional sub-path. */
export function teamPath(
  student: keyof typeof E2E_TEAM_IDS,
  rest = "",
): string {
  return `/team/${E2E_TEAM_IDS[student]}${rest}`;
}

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    // Archive/delete/remove-exception confirm with a native `confirm()`
    // dialog (docs/specs/goals.md § UI); Playwright auto-dismisses dialogs
    // unless told otherwise, which would silently no-op every such action.
    page.on("dialog", (dialog) => dialog.accept());

    const response = await page.request.post("/api/e2e/reset");
    if (!response.ok()) {
      throw new Error(`e2e reset failed: ${response.status()}`);
    }
    await use(page);
  },

  signInAs: async ({ page }, use) => {
    await use(async (student: Student) => {
      const response = await page.request.post("/api/e2e/sign-in", {
        data: { student },
      });
      if (!response.ok()) {
        throw new Error(`sign-in as ${student} failed: ${response.status()}`);
      }
    });
  },
});

export { expect };
