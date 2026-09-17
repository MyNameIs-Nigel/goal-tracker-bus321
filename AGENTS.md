<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: BUS 321 Goal Tracker

A goal-tracking web app for **one owner** (Nigel) whose accountability partners — classmates in BUS 321 — sign in with Google and check his progress every day. It exists to satisfy step 5 of the class assignment (*"make your accountability document available to your partners"*) as a real app instead of a shared doc. The assignment's content (vision, goals, contract) is **data the owner enters in the app**, not something in this repo. Optimize for how easy it is for a classmate to open the link and see the truth.

## Source of truth

`docs/` is the source of truth; code follows it. Start with [`docs/README.md`](docs/README.md), then [`docs/PHASES.md`](docs/PHASES.md) for where we are.

| Doc | What |
|---|---|
| `docs/PHASES.md` | build phases, exit criteria, **current status** |
| `docs/HUMAN_TASKS.md` | the only things Nigel has to do, step by step |
| `docs/ARCHITECTURE.md` · `docs/DATA_MODEL.md` | stack, layout, request flow, tables, and the derived rules (periods, counting, failures, streak) |
| `docs/WORKFLOW.md` · `docs/CI_CD.md` · `docs/TESTING.md` | how work moves, what CI enforces, where tests live |
| `docs/specs/*.md` | one spec per feature; Given/When/Then scenarios with IDs that tests name |
| `docs/adr/` | decisions — `0001` is Nigel's answers, `0002` is Claude's gap-filling defaults |

## Decisions in one breath (details: `docs/adr/0001-initial-scope.md`)

Vercel · `https://bus321.nigel-smith.dev` (Cloudflare DNS) · Better Auth with Google as the only provider · anyone with a Google account signs in as `viewer` · roles `owner` / `partner` / `viewer`, owner promotes in-app · vision, contract **and goals** are edited in the app and stored in Neon Postgres via Drizzle · `America/Denver` defines "today" · owner may edit past days freely; failures are derived, never stored · exceptions need a reason and are visible to partners · just show the monthly failure count · Tailwind v4, no component library, one calm green accent, mobile-first · Vitest + RTL + Playwright · test-only sign-in for previews/CI/local (`E2E_AUTH=1`) · docs→tests→code enforced by a CI `flow-check` job · squash merges, Conventional Commit PR titles, Dependabot, Prettier · npm, Node 24 · **contract starts Saturday 2026-09-19**.

## Non-negotiables

- **Next.js App Router**, TypeScript strict, Tailwind v4. Read `node_modules/next/dist/docs/` before touching a framework API (see the block above — this version differs from training data; middleware is `proxy.ts`).
- **Single owner.** Not multi-tenant. Never design for many users tracking their own goals.
- **Google OAuth only.** A classmate signs in with zero setup.
- **Roles are real.** Partners can *do* something (the daily check-in); the owner is the only writer of tracker data; authorization lives in the Data Access Layer and every Server Action calls it first. UI hiding is a courtesy, not security.
- **Stunning through simplicity.** Clean, minimal, fast, phone-first. A classmate should understand the whole app in ten seconds.
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

Nigel wants as little human involvement as possible. Inside the active phase Claude branches, commits, opens PRs, fixes CI, **merges its own green PRs** (each merge deploys to production — intended), sets non-secret env vars and repo settings the docs specify, and updates `docs/PHASES.md`. Claude asks before starting a phase, doing anything destructive to production data, changing repo visibility, spending money, contacting partners, or reversing an accepted ADR. Everything that needs Nigel is in `docs/HUMAN_TASKS.md`; request a phase's human tasks all at once at the start of the phase.

## Current state

**Phase 0 is done (2026-09-16); Phase 1 has not started.** Do not start a phase until Nigel says "start Phase N". Check the status table in `docs/PHASES.md` — Claude keeps it current.

Human gates cleared on 2026-09-16: repo is **public** (H1), Vercel project **`goal-tracker-bus321`** exists at `https://goal-tracker-bus321.vercel.app` and the folder is linked (H2), Neon Postgres is connected (H3, H9). Google OAuth client and its secrets are in Vercel Production (H4, H5); `https://bus321.nigel-smith.dev` is live (H6); `main` is protected with all eight checks required (H9). Local dev/E2E use Postgres in Docker, never Neon (`docs/adr/0003-public-repo-and-local-database.md`). As of 2026-09-17, Neon is **Production only** — Preview has no database at all, after Neon's Free-tier branch limit blocked a deployment (H10, `docs/adr/0004-preview-has-no-database.md`).
