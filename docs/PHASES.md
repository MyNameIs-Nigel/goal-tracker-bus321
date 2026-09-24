# Build Phases

The plan for taking this from a blank `create-next-app` to a live tracker at `https://bus321.nigel-smith.dev` with as little human involvement as possible. Each phase follows [DOCS → TESTS → CODE](WORKFLOW.md) and ends with a deployed, verified result.

**Nothing is waiting on Nigel.** The account setup that needed him is done ([HUMAN_TASKS.md](HUMAN_TASKS.md)), he has signed in with Google on production (2026-09-24), and real content is not a task: the app is exercised with fake students until release ([ADR-0005](adr/0005-every-student-owns-a-team.md) T6).

## Status

| Phase | Name | Status |
|-------|------|--------|
| 0 | Foundation — tooling, CI/CD, Vercel | ✅ done 2026-09-16 |
| 1 | Auth & roles | ✅ done 2026-09-16 — roles later removed by Phase 5 |
| 2 | Goals & daily tracking | ✅ done 2026-09-16 |
| 3 | Partners, contract & vision, history | ✅ done 2026-09-16 |
| 4 | Launch polish | ✅ done 2026-09-17 |
| 5 | **Teams** — every student owns a team | 🔄 in progress (started at Nigel's request 2026-09-24) |
| — | Release | whenever Nigel shares the link |

Claude updates this table as phases start and finish (✅ done, 🔄 in progress).

## How a phase runs

1. Nigel asks for it (for example "start Phase N"). Claude does not start a phase on its own.
2. Claude re-reads the phase's specs, refines them if anything is unclear or contradictory, then works feature by feature: docs → tests → code → PR → green CI → merge.
3. The phase is done when every exit criterion below is verifiably true, and the status table says so.

---

## Phases 0–4 (done)

The single-owner tracker, as first specified in [ADR-0001](adr/0001-initial-scope.md):

- **0 — Foundation** ([#1](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/1)): Vitest, Playwright (desktop + Pixel 7), Prettier, CI (`lint`, `typecheck`, `unit`, `e2e`, `build`, `flow-check`, `pr-title`), Dependabot, Vercel project and domain, branch protection with all eight checks required.
- **1 — Auth & roles** ([#6](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/6)): Better Auth with Google, test sign-in, Data Access Layer. Its owner/partner/viewer roles and `/people` were removed in Phase 5.
- **2 — Goals & daily tracking** ([#8](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/8), [#9](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/9), [#10](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/10)): goals CRUD, `/today` and `/day/[date]`, the period/status/streak/failure rules, exceptions.
- **3 — Partners, contract & vision, history** ([#13](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/13), [#14](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/14), [#15](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/15)): check-ins with notes, rich-text vision and contract, the history calendar.
- **4 — Launch polish** ([#17](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/17)–[#20](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/20)): hover and focus accents, appearance control, generated icon and social image, canonical-domain redirect, accessibility pass (Lighthouse 100 on the main routes), functions moved to `pdx1` next to the database.

The planned owner-reminders phase was dropped ([ADR-0005](adr/0005-every-student-owns-a-team.md) T5).

---

## Phase 5 — Teams

**Goal:** the app serves a whole class. Every student who signs in owns a team; every other student is instantly a partner on it; the today page is the whole daily routine — your goals at the top, one-tap check-ins on your teammates below — in well under 30 seconds.

**Decision:** [ADR-0005](adr/0005-every-student-owns-a-team.md). **Depends on humans:** nothing. Production's database held no tracker data, so the destructive migration is safe (Nigel, 2026-09-24).

**Specs:** [teams](specs/teams.md) (new), and every spec revised for teams: [authentication](specs/authentication.md), [goals](specs/goals.md), [daily-tracking](specs/daily-tracking.md), [exceptions](specs/exceptions.md), [partner-check-ins](specs/partner-check-ins.md), [contract-and-vision](specs/contract-and-vision.md), [history](specs/history.md), [hover-feedback](specs/hover-feedback.md), [appearance](specs/appearance.md), [launch-readiness](specs/launch-readiness.md). Retired: `ROLE-*`, `PPL-*`, `REM`, `AUTH-04` ([specs/README.md § Retired](specs/README.md#retired)).

**Code (outline):** `teams` table and team-scoped `goals`, `exceptions`, `checkins`, `documents` (migration `0001_teams`); `requireUser()` returns the caller's team, creating it on first use; every action scoped to the caller's team; `/team/[id]` pages for teammates; `/today` rebuilt as *your day → your teammates → checked on you*; first-goal quick add on `/today`; fake students and a demo data set for test mode.

**Exit criteria:**
- [ ] Every scenario ID in the specs has a passing test (`npm run trace`), and all checks are green in CI. — locally: 113/113 scenarios named; lint, format, typecheck, 281 unit/component tests, build, and 172 Playwright tests (desktop + Pixel 7) green against a real Postgres. CI pending on the PR.
- [x] Locally, with demo data, at phone width: sign in → tick goals → check in on both teammates happens on `/today` alone (DT-17). — verified in both Playwright projects and by eye at iPhone width, light and dark.
- [ ] Merged and deployed: the production build applied `0001_teams`, and `/` still serves the sign-in page.

---

## Release

There is nothing to prepare. When Nigel wants classmates in, he sends them `https://bus321.nigel-smith.dev`; each person who signs in gets a team and joins everyone else's list immediately.
