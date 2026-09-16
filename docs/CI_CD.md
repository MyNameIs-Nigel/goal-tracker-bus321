# CI/CD

GitHub Actions checks every PR; Vercel's Git integration deploys every PR to a preview and every merge to production. No deploy tokens, no GitHub secrets.

## Workflows

All live in `.github/workflows/`. Every job runs on `ubuntu-latest`, Node from `.nvmrc` via `actions/setup-node` with npm caching, `npm ci`, and a `concurrency` group per ref with `cancel-in-progress: true`.

### `ci.yml` — on `pull_request` and `push` to `main`

| Job (= check name) | Runs | Notes |
|---|---|---|
| `lint` | `npm run lint` · `npm run format:check` | ESLint (Next config) + Prettier. Prettier owns code and config; `*.md` is in `.prettierignore` — the docs are prose and the source of truth, and reflowed tables would bury a one-word edit in a twenty-line diff |
| `typecheck` | `npm run typecheck` (`next typegen && tsc --noEmit`) | `next typegen` writes the route-aware globals (`LayoutProps`, `PageProps`, `RouteContext`) into `.next/types`; without it `tsc` fails on a file that has never been built |
| `unit` | `npm test` (`vitest run`) | uploads coverage as an artifact; no threshold gate in v1 |
| `e2e` | migrate → `npm run build` → `npx playwright test` | Postgres 17 **service container**; env: `DATABASE_URL` (container), `E2E_AUTH=1`, `E2E_FIXED_NOW` unset, `BETTER_AUTH_SECRET=ci-only-not-secret`, `BETTER_AUTH_URL=http://localhost:3000`, `OWNER_EMAIL=owner@e2e.local`. `npm run db:migrate` runs Drizzle Kit's migrator against the container; there's no separate seed step — each test seeds itself via `POST /api/e2e/reset` (`e2e/fixtures.ts`'s `page` fixture, docs/TESTING.md § E2E setup). Installs `chromium` with `--with-deps`. Uploads the Playwright report on failure. |
| `build` | `npm run build` | caches `~/.npm` and `.next/cache` with the key from the Next.js CI caching guide (`hashFiles(package-lock.json)` + source hash, restore-key on lockfile alone) |
| `audit` | `npm audit --audit-level=high` | `continue-on-error: true` — informational |

`e2e` also proves the production build, but `build` stays a separate, fast, required check so a broken build is diagnosed without reading Playwright output.

### `flow-check.yml` — on `pull_request` (opened, synchronize, labeled, unlabeled)

Enforces DOCS → TESTS → CODE. Runs `node scripts/flow-check.mjs` with the list of changed files (`git diff --name-only origin/${base}...HEAD`) and the PR's labels.

Rule: if any changed file matches a **code** glob, the PR must also change at least one **docs** file and at least one **test** file.

| Class | Globs |
|---|---|
| code | `app/**`, `components/**`, `lib/**`, `db/**`, `proxy.ts`, `next.config.ts` |
| docs | `docs/**`, `AGENTS.md` |
| tests | `**/*.test.ts`, `**/*.test.tsx`, `e2e/**`, `vitest.config.*`, `playwright.config.*` |

**Precedence:** a file is classified once, tests → docs → code. A colocated test such as `app/page.test.tsx` matches both `app/**` and `**/*.test.tsx`; it counts as a **test** and never as a code change, so adding a test to an existing component is not itself a reason to demand more docs.

Skipped (green with a notice) when the PR carries the `skip-flow-check` label or the author is `dependabot[bot]`. On failure the job prints exactly which class is missing and links to `docs/WORKFLOW.md`. The script's rule logic is a pure function with its own unit tests (the first real test in the repo).

### `pr-title.yml` — on `pull_request` (opened, edited, synchronize)

`amannn/action-semantic-pull-request` — title must be a Conventional Commit: `type(scope)?: subject`. Allowed types: `feat fix docs test refactor perf chore ci build style`. Subject: any case, no trailing period. This is the commit message on `main` after squash-merge, so it's checked.

### `dependabot.yml` (in `.github/`, not a workflow)

- npm: weekly, Monday 06:00 `America/Denver`; groups `minor-and-patch` (all minor + patch bumps in one PR) and `major` (one PR per major); labels `dependencies`, `skip-flow-check`; commit prefix `chore(deps)`.
- github-actions: weekly, same grouping, same labels.

Dependabot PRs still need every `ci.yml` job green. With branch protection + auto-merge enabled, Claude enables auto-merge on grouped minor/patch PRs after a glance at the changelog; majors are read first.

## Required checks (branch protection on `main`)

[H1](HUMAN_TASKS.md#h1-decide-public-repo-or-github-pro) was resolved on 2026-09-16 — the repo is **public**, so branch protection is available (verified via the API). Claude configures it with `gh api` in Phase 0; Actions minutes are unlimited on public repos.

- `lint`, `typecheck`, `unit`, `e2e`, `build`, `flow-check`, `pr-title`
- `Vercel` (the preview deployment status the Vercel GitHub app posts)
- Require a pull request before merging; 0 required approvals (single-person project; the checks are the review); dismiss stale approvals n/a.
- Require linear history; squash merge only; delete branch on merge; allow auto-merge.
- Rules apply to administrators too — no "just this once" pushes to `main`.

## Deploys (Vercel)

- **Production**: every push to `main`. Domain `bus321.nigel-smith.dev`; the `*.vercel.app` alias redirects to it (Vercel domain setting, after H6).
- **Preview**: every PR. The Vercel GitHub app comments the URL on the PR and posts a status check. Preview environment has `E2E_AUTH=1`, so the three test sign-in buttons work there for manual review (Vercel's deployment protection keeps previews private to Nigel's account).
- **`vercel.json`** (committed):
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "framework": "nextjs",
    "buildCommand": "npm run db:migrate && npm run build"
  }
  ```
  Node version comes from `engines.node` in `package.json`. No `installCommand` override; Vercel runs `npm ci` from the lockfile.

  This build command was correct from Phase 0 onward and has never needed editing: `db:migrate` was a no-op placeholder until Phase 1 pointed it at Drizzle's migrator (`scripts/db-migrate.mjs`, `drizzle-orm/node-postgres/migrator`).
- **Migrations run inside the build**, before `next build`, against whichever `DATABASE_URL` the environment has (production DB, or the Neon preview branch). They are additive-only in v1 ([DATA_MODEL.md § Migrations](DATA_MODEL.md#migrations)), so a preview that shares the production DB can't break it. A failed migration fails the build, and the previous deployment stays live. New migrations are generated with `npm run db:generate` after editing `db/schema.ts`, then committed.
- **Rollback**: Vercel → Deployments → promote the previous one. Or `git revert` on `main`.

## Caching

- `actions/setup-node` with `cache: npm` for `~/.npm` on every job.
- `build` and `e2e` additionally cache `.next/cache` per the Next.js guide:
  ```yaml
  - uses: actions/cache@v4
    with:
      path: |
        ~/.npm
        ${{ github.workspace }}/.next/cache
      key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
      restore-keys: |
        ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}-
  ```

## Secrets

None in GitHub Actions. CI's database is a container, its auth is the test mode, its `BETTER_AUTH_SECRET` is a fixed non-secret string. Vercel holds the real values (see [ARCHITECTURE.md § Environment variables](ARCHITECTURE.md#environment-variables)). If a future feature ever needs a real secret in CI, that's a new ADR and a human task.

## Local equivalents

| CI job | Local |
|---|---|
| lint | `npm run lint && npm run format:check` |
| typecheck | `npm run typecheck` |
| unit | `npm test` (`npm run test:watch` while developing) |
| e2e | `docker compose up -d` then `npm run test:e2e` (starts the app itself; `.env.local` points `DATABASE_URL` at the container and sets `E2E_AUTH=1`) |
| build | `npm run build` |
| flow-check | `node scripts/flow-check.mjs --base main` |
| trace | `npm run trace` (scenario ID ↔ test coverage; not a CI job) |

`npm run check` runs lint, format:check, typecheck, unit and build in sequence — the pre-push habit.
