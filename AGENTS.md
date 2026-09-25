<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: BUS 321 Goal Tracker

A goal-tracking web app for a class. **Every student who signs in with Google owns a team** ("Team Nigel", "Team Avery"), and **every other student is instantly a partner on it** — three students means three teams with two partners each. Each day a student ticks off their own goals and checks in on each teammate, all on one page. It exists to satisfy step 5 of the BUS 321 assignment (*"make your accountability document available to your partners"*) as a real app instead of a shared doc. The assignment's content (vision, goals, contract) is **data each student enters in the app**, not something in this repo. Optimize for how little effort the daily routine takes: open the link, land on today, tap, done — under 30 seconds.

## Source of truth

`docs/` is the source of truth; code follows it. Start with [`docs/README.md`](docs/README.md), then [`docs/PHASES.md`](docs/PHASES.md) for where we are.

| Doc | What |
|---|---|
| `docs/PHASES.md` | build phases, exit criteria, **current status** |
| `docs/HUMAN_TASKS.md` | the account setup only Nigel could do — all done |
| `docs/ARCHITECTURE.md` · `docs/DATA_MODEL.md` | stack, layout, request flow, tables, and the derived rules (periods, counting, failures, streak) |
| `docs/WORKFLOW.md` · `docs/CI_CD.md` · `docs/TESTING.md` | how work moves, what CI enforces, where tests live |
| `docs/specs/*.md` | one spec per feature; Given/When/Then scenarios with IDs that tests name |
| `docs/adr/` | decisions — `0001` is Nigel's first answers, `0002` Claude's gap-filling defaults, `0005` the teams redesign |

## Decisions in one breath (details: `docs/adr/0001-initial-scope.md`, `docs/adr/0005-every-student-owns-a-team.md`)

Vercel · `https://bus321.nigel-smith.dev` (Cloudflare DNS) · Better Auth with Google as the only provider · anyone with a Google account signs in as a **student** and gets a **team** · every other student is a partner, nothing to promote, no roles · each student's vision, contract **and goals** are edited in the app and stored in Neon Postgres via Drizzle · `America/Denver` defines "today" · students may edit their own past days freely; failures are derived, never stored · exceptions need a reason and are visible to partners · just show the monthly failure count · **no reminders or notifications** · Tailwind v4, no component library, one calm green accent, mobile-first · Vitest + RTL + Playwright · test-only sign-in with **fake students** for previews/CI/local (`E2E_AUTH=1`) · docs→tests→code enforced by a CI `flow-check` job · squash merges, Conventional Commit PR titles, Dependabot, Prettier · npm, Node 24.

## Non-negotiables

- **Next.js App Router**, TypeScript strict, Tailwind v4. Read `node_modules/next/dist/docs/` before touching a framework API (see the block above — this version differs from training data; middleware is `proxy.ts`).
- **Every student owns exactly one team; every other student is a partner.** Partnership is derived, never stored or granted.
- **Google OAuth only.** A classmate signs in with zero setup and lands on `/today`.
- **Ownership is real.** You write only your own team's data; you check in only on other teams. Authorization lives in the Data Access Layer — `requireUser()` returns the caller's team — and every Server Action scopes its writes to it. UI hiding is a courtesy, not security.
- **The daily routine is one page.** `/today` is your goals at the top, then a one-tap check-in for each teammate. Logging in and checking in take under 30 seconds.
- **Stunning through simplicity.** Clean, minimal, fast, phone-first. A classmate should understand the whole app in ten seconds.
- **Fake data until release.** Tests and local runs use the seeded fake students; no real student's data is used to test anything.
- **GitHub is the source of truth; GitHub Actions runs checks; Vercel deploys.** Remote: `MyNameIs-Nigel/goal-tracker-bus321`.
- **Secrets never pass through Claude.** No reading `.env*` values into chat, no typing secrets, no committing them.

## Implementation flow — always, in this order

```
EDIT/ADD DOCS  -->  EDIT/ADD TESTS  -->  EDIT/ADD CODE
```

1. **Docs first.** The behavior is in `docs/specs/<feature>.md` (and `DATA_MODEL.md` for data) before anything else. The docs change is the first commit of the branch.
2. **Tests second.** Every scenario ID gets a test that names it (`test("GOAL-03 …")`). Run them; confirm they fail for the right reason.
3. **Code last.** The minimum that makes the tests pass and matches the spec.

A PR that changes code without docs and tests is incomplete; CI's `flow-check` fails it. Details and the pre-authorized actions in `docs/WORKFLOW.md`.

## Autonomy

Nigel wants as little human involvement as possible. Inside the active phase Claude branches, commits, opens PRs, fixes CI, **merges its own green PRs** (each merge deploys to production — intended), sets non-secret env vars and repo settings the docs specify, and updates `docs/PHASES.md`. Claude asks before starting a phase, doing anything destructive to production data, changing repo visibility, spending money, contacting classmates, or reversing an accepted ADR. Nothing currently needs Nigel (`docs/HUMAN_TASKS.md`).

## Current state

**Phases 0–4 shipped a single-owner tracker (2026-09-16/17). Phase 5 — Teams — is in progress (started at Nigel's request 2026-09-24)** and replaces the owner/partner/viewer model with a team per student ([ADR-0005](docs/adr/0005-every-student-owns-a-team.md)). Check the status table in `docs/PHASES.md` — Claude keeps it current.

Infrastructure is fully set up: the repo is **public**, Vercel project **`goal-tracker-bus321`** deploys `main` to `https://bus321.nigel-smith.dev` (functions in `pdx1`), Google OAuth is configured in Production, and `main` is protected with all eight checks required. Neon Postgres is **Production only**; Preview has no database (ADR-0004). Local dev/E2E use a local Postgres, never Neon (ADR-0003). Nigel has signed in with Google on production.
