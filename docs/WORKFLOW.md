# Workflow

How work actually moves through this repo. The short version:

```
EDIT/ADD DOCS  -->  EDIT/ADD TESTS  -->  EDIT/ADD CODE
```

…one feature per PR, every PR green before merge, and Claude does all of it unless a step is listed in [HUMAN_TASKS.md](HUMAN_TASKS.md).

## The three steps, concretely

### 1. Docs

- The behavior is written in `docs/specs/<feature>.md` as Given/When/Then scenarios with stable IDs (`GOAL-03`), before any test or code. Data changes go in `docs/DATA_MODEL.md`; structural changes in `docs/ARCHITECTURE.md`.
- If a spec already exists (most v1 specs do), step 1 is *reading it and fixing what's wrong or missing*. A spec that survives contact with implementation unchanged is fine — "no doc changes needed" is a legitimate outcome, but it must be a conscious one.
- The docs change is the **first commit** on the branch. It can be reviewed on its own.

### 2. Tests

- Every scenario ID gets at least one test that names it: `test("GOAL-03 rejects an empty title", …)`. Where a scenario lives (unit / component / E2E) follows [TESTING.md](TESTING.md).
- Tests are written **before** the code and run once to confirm they **fail** for the right reason. The PR body records this ("tests failed before implementation: yes").
- Pure logic (dates, periods, streaks, permissions, sanitization) is unit-tested exhaustively; UI flows get one E2E per scenario, not more.

### 3. Code

- The minimum that makes the tests pass and matches the spec. No speculative features, no "while I'm here" refactors — those are their own PRs.
- Match the surrounding code's style. Read the Next.js 16 docs in `node_modules/next/dist/docs/` before touching a framework API (the version differs from training data).
- `npm run lint && npm run typecheck && npm test && npm run build` locally before pushing; E2E locally when the change touches a flow.

## Branches, commits, PRs

- **`main` is always deployable.** Every merge to `main` is a production deploy.
- **Branch names:** `<type>/<short-slug>` — `feat/goal-crud`, `fix/streak-off-by-one`, `docs/exceptions-spec`, `ci/flow-check`, `chore/deps`.
- **One feature (spec) per PR**, small enough to review in ten minutes. Phase 0 tooling may be split into a few PRs.
- **PR title = Conventional Commit**, because squash-merge turns the title into the commit on `main`: `feat(goals): owner can add, edit, archive goals`. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`, `ci`, `build`, `style`. Scope optional. Enforced by the `pr-title` check.
- **PR body** follows `.github/PULL_REQUEST_TEMPLATE.md`: spec link, scenario IDs covered, docs changed, tests-failed-first confirmation, checklist.
- **Merge:** squash, then the branch is deleted automatically. No merge commits, no rebase merges.
- **Never** push directly to `main`. Never force-push a shared branch.

## What CI enforces

See [CI_CD.md](CI_CD.md) for the jobs. The flow itself is enforced by the **`flow-check`** job: a PR that changes code paths (`app/`, `components/`, `lib/`, `db/`, `proxy.ts`, `next.config.ts`) must also change something under `docs/` **and** a test file. Escape hatch: the `skip-flow-check` label (Dependabot PRs get it automatically). The label is for genuine exceptions — a typo fix in a string, a dependency bump — not for skipping the workflow.

## What Claude does without asking

Nigel's stated goal is *as little human involvement as possible*. By adopting this document, the following are pre-authorized for work inside the currently active phase:

- Create branches, commit, push, open PRs, and fix red CI on its own PRs.
- **Merge its own PR** once every required check is green and the PR is within the active phase's specs. This deploys to production — that is the intended pipeline.
- Re-run flaky jobs; open a follow-up `fix/` PR when production verification finds a problem.
- Set **non-secret** Vercel environment variables and repository settings that the docs specify (labels, merge strategy, branch protection, Dependabot).
- Run database migrations that are additive (new tables/columns/indexes).
- Update `docs/PHASES.md` status and write new ADRs for decisions it makes.

Claude **asks first** for:

- Starting a new phase, or work outside the active phase.
- Anything destructive on production data (dropping columns, deleting rows, resetting the database).
- Changing repo visibility, spending money, buying a domain, or accepting terms of service.
- Sending anything to partners or classmates.
- Reversing a decision recorded in an accepted ADR (it writes a new ADR and asks).

Claude **never**:

- Handles a secret — no reading `.env.local` values into chat, no typing secrets, no committing them.
- Signs in to Nigel's accounts or completes an OAuth consent on his behalf.
- Merges a PR with a red or skipped required check, or uses `skip-flow-check` to avoid writing docs or tests.

## Definition of done (per feature)

- Spec is current; every scenario has a named test; all tests green in CI.
- Deployed to production and verified there by Claude with the built-in browser at phone and desktop widths.
- `PHASES.md` exit criteria ticked where applicable.
