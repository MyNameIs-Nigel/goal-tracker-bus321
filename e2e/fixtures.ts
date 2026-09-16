import { test as base, expect } from "@playwright/test";

/**
 * docs/TESTING.md § E2E setup. Every test starts from the same seeded state
 * (`POST /api/e2e/reset`, run once per test via the `page` fixture), and
 * `signInAs` hits the same endpoint the sign-in page's test buttons use.
 */

export type Role = "owner" | "partner" | "viewer";

type Fixtures = {
  signInAs: (role: Role) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    const response = await page.request.post("/api/e2e/reset");
    if (!response.ok()) {
      throw new Error(`e2e reset failed: ${response.status()}`);
    }
    await use(page);
  },

  signInAs: async ({ page }, use) => {
    await use(async (role: Role) => {
      const response = await page.request.post("/api/e2e/sign-in", {
        data: { role },
      });
      if (!response.ok()) {
        throw new Error(`sign-in as ${role} failed: ${response.status()}`);
      }
    });
  },
});

export { expect };
