import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  // Every test resets the *shared* database via POST /api/e2e/reset
  // (docs/TESTING.md § E2E setup) against a single `npm run start` server,
  // so two tests running at once would stomp each other's seeded state.
  // Serial execution trades speed for the "every test starts from the same
  // state" guarantee that reset is meant to provide.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  // Tests run against the production build, as the Next.js Playwright guide
  // recommends. `npm run test:e2e` builds first; CI builds in its own step.
  webServer: {
    command: "npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
