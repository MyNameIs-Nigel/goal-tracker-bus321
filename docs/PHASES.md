# Build Phases

The plan for taking this from a blank `create-next-app` to a live tracker at `https://bus321.nigel-smith.dev` with as little human involvement as possible. Each phase follows [DOCS → TESTS → CODE](WORKFLOW.md), ends with a deployed, verified result, and lists the exact [human tasks](HUMAN_TASKS.md) it depends on.

**Hard date:** the accountability contract starts **Saturday 2026-09-19**. Docs were written Tuesday 2026-09-15; human gates H1–H3 cleared Wednesday 2026-09-16.

## Status

| Phase | Name | Status | Target |
|-------|------|--------|--------|
| 0 | Foundation — tooling, CI/CD, Vercel | ✅ done 2026-09-16 (H9 ✅, Neon branching on) | Wed 9/16 |
| 1 | Auth & roles | 🔄 code merged & deployed ([#6](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/6)); production sign-in verification needs Nigel (this sandbox's network can't reach `bus321.nigel-smith.dev`, and Claude never completes Google OAuth for him) | Wed 9/16 – Thu 9/17 |
| 2 | Goals & daily tracking | 🔄 code merged & deployed ([#8](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/8), [#9](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/9), [#10](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/10)); production verification needs Nigel, same sandbox limitation as Phase 1 | Thu 9/17 – Fri 9/18 |
| 3 | Partners, contract & vision, history | ☐ not started | Fri 9/18 – Sat 9/19 |
| 4 | Launch | ☐ not started | Sat 9/19 |
| 5 | Owner reminders (post-launch) | ☐ not started | after launch |

Claude updates this table as phases start and finish (✅ done, 🔄 in progress, ⏸ blocked on Hn).

## How a phase runs

1. Nigel says **"start Phase N"** (or "continue"). Claude does not start a phase on its own.
2. Claude re-reads the phase's specs, refines them if anything is unclear or contradictory (docs PR first), then works feature by feature: tests → code → PR → green CI → merge → verify on the deployment.
3. Human tasks are requested **at the start of the phase**, all at once, so you can do them in one sitting while Claude builds everything that doesn't depend on them.
4. The phase is done when every exit criterion below is verifiably true on the real deployment, and the status table says so.

## MVP line

If 9/19 is at risk, this is what must be live for the contract to start, in priority order. Everything below the line can land the following week without breaking the assignment.

**Must (by 9/19):** sign in with Google · owner / partner / viewer roles · goals CRUD · today view with check-off · edit past days · exceptions · partner "I checked today" · contract & vision editable and readable · custom domain.

**Should (by ~9/22):** history calendar and month summary.

**Later:** owner reminders.

---

## Phase 0 — Foundation

**Goal:** a repo where a trivial PR goes green on every check, gets a preview deployment, and merging deploys to production. Nothing app-specific yet.

**Depends on humans:** [H1](HUMAN_TASKS.md#h1-decide-public-repo-or-github-pro) ✅ (public) and [H2](HUMAN_TASKS.md#h2-log-in-to-the-vercel-cli-once) ✅ (project `goal-tracker-bus321` exists, CLI linked) — both done 2026-09-16. Nothing blocks this phase.

**Docs (already written):** [CI_CD.md](CI_CD.md), [TESTING.md](TESTING.md), [WORKFLOW.md](WORKFLOW.md), [ARCHITECTURE.md](ARCHITECTURE.md).

**Tests first:** a sanity unit test proving Vitest runs; a unit test for the flow-check script's rules; a Playwright smoke test that `/` renders the app name (against the placeholder page).

**Code:**
- `.nvmrc` = 24, `engines.node` in `package.json`; Prettier; npm scripts (`lint`, `format`, `format:check`, `typecheck`, `test`, `test:e2e`, `build`).
- Vitest + React Testing Library + jsdom; Playwright (chromium + mobile emulation projects) with `webServer`.
- `docker-compose.yml` with a `postgres:17` service for local dev and local E2E (same image as CI); `.env.example` documents `DATABASE_URL` pointing at it.
- `.github/workflows/ci.yml` (lint, typecheck, unit, e2e, build), `flow-check.yml`, `pr-title.yml`; `.github/dependabot.yml`; `.github/PULL_REQUEST_TEMPLATE.md`; `scripts/flow-check.mjs`.
- Repo settings via `gh`: squash-merge only, delete branch on merge, auto-merge allowed; labels `skip-flow-check`, `dependencies`; branch protection with required checks (if H1 allows).
- Vercel: project already created and linked ✅; add `vercel.json` (framework, build command with migrations); Preview env `E2E_AUTH=1`; Production `BETTER_AUTH_URL` (= `https://bus321.nigel-smith.dev` since H6), `BETTER_AUTH_SECRET` generated in place for Production and Preview.
- Replace the placeholder home page with a minimal "BUS 321 Goal Tracker" page (no auth yet) so the smoke test has something real.

**Exit criteria:**
- [x] A PR with a one-line change shows all checks green: `lint`, `typecheck`, `unit`, `e2e`, `build`, `flow-check`, `pr-title`, plus the Vercel preview check. — [#1](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/1), all nine green on the first run.
- [x] The preview URL renders the placeholder page.
- [x] Merging deploys to `https://goal-tracker-bus321.vercel.app`.
- [x] Confirmed whether Neon created a preview branch for the PR; result recorded in `ARCHITECTURE.md § Environments`. — Nigel checked the Neon console in [H9](HUMAN_TASKS.md#h9-turn-on-branch-protection-and-set-the-preview-env-vars): **branching is on**, so each preview deployment gets its own database branch.
- [x] Dependabot opened (or is scheduled to open) its first PR and it is auto-labeled `skip-flow-check`. — it ran on the merge and opened two, grouped exactly as configured: [#2](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/2) `minor-and-patch` and [#3](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/3) `major`, both labelled `skip-flow-check` and `dependencies`.
- [x] `docs/PHASES.md` status updated.

**Account-level configuration** (branch protection, squash-only merge settings, Vercel env vars) was done by Nigel in [H9](HUMAN_TASKS.md#h9-turn-on-branch-protection-and-set-the-preview-env-vars) on 2026-09-16 and verified by Claude; `main` now requires all eight checks (`lint`, `typecheck`, `unit`, `e2e`, `build`, `flow-check`, `pr-title`, `Vercel`) with admins enforced.

---

## Phase 1 — Auth & roles

**Goal:** anyone with a Google account can sign in; Nigel is `owner`; everyone else is `viewer` until promoted; Nigel can promote from `/people`.

**Depends on humans:** [H3](HUMAN_TASKS.md#h3-create-the-neon-database-through-vercel) ✅ (done 2026-09-16), [H4](HUMAN_TASKS.md#h4-create-the-google-oauth-client) ✅, [H5](HUMAN_TASKS.md#h5-put-the-google-secrets-and-your-owner-email-into-vercel) ✅ (both 2026-09-16). Nothing human-blocked; [H6](HUMAN_TASKS.md#h6-point-bus321nigel-smithdev-at-vercel) is also done, so the end-of-phase sign-in check runs at `https://bus321.nigel-smith.dev`.

**Specs:** [authentication](specs/authentication.md), [roles-and-permissions](specs/roles-and-permissions.md), [people](specs/people.md).

**Code (outline):** Drizzle schema + first migration (Better Auth tables with `role`, plus the app tables from [DATA_MODEL.md](DATA_MODEL.md) so later phases only add data, not structure); Better Auth with Google provider + Drizzle adapter + owner bootstrap hook; `proxy.ts` optimistic redirect; Data Access Layer (`requireUser`, `requireOwner`, `requirePartner`); test-mode endpoints (`/api/e2e/sign-in`, `/api/e2e/reset`) and seed; sign-in page; authenticated layout with nav and user menu; `/people`.

**Exit criteria:**
- [x] Every scenario ID in the three specs has a passing test (unit, component, or E2E) — [#6](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/6), all nine checks green, `npm run trace` shows no gap for `authentication`/`roles-and-permissions`/`people` beyond the documented Phase 2/3 deferrals (ROLE-04 and the goal/document parts of ROLE-03/05). Verified locally against a real Postgres (48/48 Playwright, both projects) since this sandbox has no Docker; CI's own Postgres-17-container run is the canonical check and was green before merge.
- [ ] On production: Nigel signs in with Google and lands on `/today` as owner; a second Google account lands as viewer; Nigel promotes it to partner on `/people`; the change is effective on that user's next page load. **Needs Nigel** — Claude never completes an OAuth consent on his behalf (`WORKFLOW.md`), and this session's network egress is policy-blocked even from reading the production URL to check the surrounding UI (confirmed via the agent proxy: `CONNECT` to `bus321.nigel-smith.dev` and generic web hosts alike return 403). Production build **is** live and green (Vercel deployment `dpl_Hq7ZajRDBmasVnR2J9RoNVsyBWBp`, aliased to `bus321.nigel-smith.dev`, state `READY`).
- [ ] Unauthenticated `/today` redirects to `/`; `/people` is a 404 for non-owners; `/api/e2e/*` is a 404 in production. Guaranteed by the code (`proxy.ts`, `requireOwner()`, and `isE2eEnabled()`'s `VERCEL_ENV !== "production"` gate) and covered by `e2e/authentication.spec.ts` / `e2e/roles-and-permissions.spec.ts` against the same logic — but not re-clicked-through on the real production URL, for the same sandbox reason as above.
- [ ] Preview deployment: the three test sign-in buttons work. Same limitation — the preview URL is also outside this session's reachable network.

A session with normal network access (or Nigel himself) should complete the three unchecked boxes above; nothing else is blocking.

---

## Phase 2 — Goals & daily tracking

**Goal:** Nigel can define goals and record each day; everyone can see the truth for any day.

**Depends on humans:** none.

**Specs:** [goals](specs/goals.md), [daily-tracking](specs/daily-tracking.md), [exceptions](specs/exceptions.md).

**Code (outline):** pure `lib/` modules for periods, counting, status, failures, streak (heavily unit-tested against [DATA_MODEL.md](DATA_MODEL.md)); `/goals` with owner CRUD; `/today` and `/day/[date]`; exception dialog; server actions with role checks; mobile-first layout.

**Exit criteria:**
- [x] Every scenario ID in the three specs has a passing test — [#8](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/8), [#9](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/9), [#10](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/10), all checks green on each. `npm run trace` shows `goals.md` 12/12, `daily-tracking.md` 15/16 (DT-16 deferred to Phase 3 per its own "Phased test coverage" note, mirroring the Phase 1 pattern), `exceptions.md` 9/9.
- [ ] On production as owner: create three goals (one per cadence), check off today, open yesterday and check something off, mark an exception with a reason; streak and failure count match the rules by hand-calculation. **Needs Nigel** — same reason as Phase 1's unchecked boxes: this sandbox has no Docker (so no local Postgres to run a dev server against) and its network egress can't reach either `bus321.nigel-smith.dev` or the `*.vercel.app` preview URLs. The equivalent flow — goals CRUD, check-off, editing a past day, exceptions, streak and failure math — is exercised end-to-end by `e2e/goals.spec.ts`, `e2e/daily-tracking.spec.ts`, and `e2e/exceptions.spec.ts` against a real `postgres:17` container in CI, and passed on the commits that are now on `main`.
- [ ] As viewer on a phone-width viewport: the same day is readable without horizontal scrolling and no write controls are visible. Playwright's `mobile` project (`devices["Pixel 7"]`, `playwright.config.ts`) runs the full e2e suite in CI, including the viewer-sees-no-write-controls assertions in `daily-tracking.spec.ts` and `exceptions.spec.ts` — but that's emulated viewport width, not a real phone, and not on the production URL. **Needs Nigel** for the actual look on his own phone.

---

## Phase 3 — Partners, contract & vision, history

**Goal:** partners can do their job; the contract lives in the app; the month is visible at a glance.

**Depends on humans:** none to build; [H7](HUMAN_TASKS.md#h7-write-your-content-in-the-app) becomes possible once merged.

**Specs:** [partner-check-ins](specs/partner-check-ins.md), [contract-and-vision](specs/contract-and-vision.md), [history](specs/history.md).

**Code (outline):** partner check-in section on today/day views; rich text editor (Tiptap) for the two documents with server-side sanitization; contract dates form; `/history` calendar + month summary + partner log.

**Exit criteria:**
- [ ] Every scenario ID in the three specs has a passing test.
- [ ] On production: a partner account clicks "I checked today", leaves a note; owner and a viewer both see it. Owner writes and saves both documents; a viewer reads them. `/history` shows the correct day statuses for the last week.

---

## Phase 4 — Launch

**Goal:** live on the real domain, on real phones, with real content, before Saturday.

**Depends on humans:** [H6](HUMAN_TASKS.md#h6-point-bus321nigel-smithdev-at-vercel) ✅ (DNS, done 2026-09-16), [H7](HUMAN_TASKS.md#h7-write-your-content-in-the-app) (content), [H8](HUMAN_TASKS.md#h8-share-the-link-with-your-partners) (share).

**Code:** empty/loading/error states audit; accessibility pass (labels, focus order, contrast, hit targets ≥ 44px); page metadata and favicon; `BETTER_AUTH_URL` switched to the custom domain; production smoke run of every spec's happy path with the built-in browser at phone and desktop widths.

**Exit criteria:**
- [ ] `https://bus321.nigel-smith.dev` loads over HTTPS; the `*.vercel.app` URL redirects to it.
- [ ] Google sign-in works on the custom domain.
- [ ] Nigel's content is in; at least two partners are promoted and have checked in once.
- [ ] Lighthouse (mobile) accessibility ≥ 95 on `/today`.

---

## Phase 5 — Owner reminders (post-launch)

**Goal:** Nigel gets a browser notification on desktop when the day is ending with goals still unchecked. Owner only. Spec: [owner-reminders](specs/owner-reminders.md) (planned; scenarios are written when this phase starts).

**Depends on humans:** granting the browser's notification permission once; possibly one Vercel Cron setting.

**Exit criteria:** to be written with the spec.
