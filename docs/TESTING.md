# Testing

Tests are the executable form of the specs. Every scenario ID in `docs/specs/*.md` has at least one test whose name starts with that ID. Tests are written before the code and must fail first.

> **Phase 0 note.** The foundation's own tests (`scripts/flow-check.test.ts`, `e2e/smoke.spec.ts`) have no scenario ID — there is no spec behind them — so `npm run trace` ignores them. `e2e/fixtures.ts`, the reset endpoint, the seed and `signInAs` described below shipped with Phase 1.

## Layers and where a scenario lives

| Layer | Tool | What goes here | Location |
|---|---|---|---|
| **Unit** | Vitest | pure logic: periods, counting, status, failures, streak, contract day, exception coverage, sanitization, flow-check rules, input validation | next to the module: `lib/periods.test.ts` |
| **Component** | Vitest + React Testing Library + jsdom | rendering and interaction of client components in isolation: forms validate, controls hidden for non-owners, status badges, empty states | next to the component: `components/GoalForm.test.tsx` |
| **E2E** | Playwright | whole flows through the real app against a real database: sign in as a role, do the thing, see the result; authorization at the boundary; redirects; mobile layout | `e2e/<spec-name>.spec.ts`, one file per spec doc |

Rules of thumb:

- If it can be a unit test, it is a unit test. The rules in [DATA_MODEL.md](DATA_MODEL.md) get table-driven unit tests with dates chosen around the interesting edges (week/month boundaries, contract start, archive day, DST changeovers in `America/Denver`).
- `async` Server Components are not unit-testable (Next.js 16 guide) — their behavior is covered by E2E.
- Each E2E scenario is **one** test. Don't re-test unit-level logic through the browser.
- Authorization is tested twice: the UI hides the control (component/E2E), and the Server Action rejects the call anyway (E2E via a direct request, or a unit test of the action with a stubbed session).

## Naming and traceability

```ts
test("GOAL-03 rejects an empty title with an inline error", async () => { … })
```

The ID is the first token of the test name. `npm run trace` lists every scenario ID in `docs/specs/` (each `### PREFIX-NN` heading) and flags any that no test file names — run before opening a PR. It is a helper, not a gate: it always reports and exits 0 unless `--strict` is passed, which makes any uncovered scenario an error. It is not a CI job — the specs for unstarted phases are legitimately uncovered.

## Unit and component setup (Vitest)

- `vitest.config.mts`: `@vitejs/plugin-react`, `vite-tsconfig-paths` (for `@/*`), `environment: "jsdom"`, `setupFiles: ["./vitest.setup.ts"]` (imports `@testing-library/jest-dom/vitest`).
- Coverage via `@vitest/coverage-v8`, reported in CI as an artifact. No threshold gate in v1.
- Time: pure functions take `today` as a parameter — never call `new Date()` inside `lib/`. Tests pass explicit dates.

## E2E setup (Playwright)

- `playwright.config.ts`: `testDir: "e2e"`, `baseURL: "http://localhost:3000"`, `webServer: { command: "npm run start", reuseExistingServer: !process.env.CI }` after `npm run build`; two projects — `chromium` (desktop) and `mobile` (`devices["Pixel 7"]`). Retries: 2 in CI, 0 locally. Trace on first retry; screenshot on failure. `workers: 1` / `fullyParallel: false` — every test resets the one shared database, so tests run serially against the single running server rather than racing each other's resets.
- **Database:** a real Postgres. CI uses a `postgres:17` service container; locally, the same image via `docker compose up -d` (`DATABASE_URL` in `.env.local` points at it). Never Neon: the reset endpoint truncates tables, and the only Neon database is production's ([ADR-0003](adr/0003-public-repo-and-local-database.md)).
- **Reset:** `POST /api/e2e/reset` truncates every app table (`goals`, `completions`, `exceptions`, `partner_checkins`, `documents`, `settings`, and the Better Auth tables), then reseeds. A `beforeEach` fixture in `e2e/fixtures.ts` calls it, so every test starts from the same state. It is a 404 outside test mode.
- **Seed** (`db/seed.e2e.ts`): three users — `owner@e2e.local` (role owner, name "Test Owner"), `partner@e2e.local` (partner, "Test Partner"), `viewer@e2e.local` (viewer, "Test Viewer"); `settings` with `contract_start = 2026-09-19`; empty documents.
- **Sign-in:** `POST /api/e2e/sign-in` with `{ role: "owner" | "partner" | "viewer" }` creates a Better Auth session for the seeded user and sets the cookie. The fixture exposes `signInAs("owner")`. The sign-in page's test buttons hit the same endpoint (that's what humans use on previews).
- **Clock:** `E2E_FIXED_NOW` (ISO timestamp) pins `lib/clock.ts` when test mode is on. Tests that care about "yesterday" or the week boundary set it via the reset endpoint's optional `{ now }` body (the server stores it in memory for the test run), so no restart is needed. Default when unset: real time.
- **Google is never touched.** The Google button is asserted to exist and to point at the Better Auth sign-in endpoint; the flow itself is Google's problem, and production verification is done by Nigel signing in once.

## What to test for each role

Every feature spec lists its role behavior. The E2E file for a spec usually has this shape:

```
describe("owner")   — can do the thing, sees the result
describe("partner") — sees the result, can only do partner things
describe("viewer")  — sees the result, controls absent, direct action → Forbidden
```

## Mobile

The `mobile` Playwright project runs every E2E test at 412×915 with touch. Layout scenarios (`HIST-07`, `DT-*` readability) assert no horizontal overflow: `document.documentElement.scrollWidth <= window.innerWidth`.

## Flakiness policy

A test that fails intermittently is fixed or deleted the same day; it is never retried into green and forgotten. Retries exist in CI only to survive infrastructure hiccups.

## Commands

| | |
|---|---|
| `npm test` | unit + component, once |
| `npm run test:watch` | same, watching |
| `npm run test:e2e` | Playwright, both projects (builds first) |
| `npm run test:e2e -- --project=chromium --ui` | pick and watch |
| `npm run trace` | scenario ID ↔ test coverage report |
