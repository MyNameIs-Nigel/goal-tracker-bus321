# BUS 321 Goal Tracker

A goal-tracking web app for one owner (Nigel) whose accountability partners —
classmates in BUS 321 — sign in with Google and check his progress every day.
It replaces the shared document that step 5 of the class assignment asks for.

Live at **https://bus321.nigel-smith.dev** (production also at
`https://goal-tracker-bus321.vercel.app`).

## Start here

[`docs/`](docs/README.md) is the source of truth; code follows it. If the code
and the docs disagree, the docs win.

| Read                                                                | For                                          |
| ------------------------------------------------------------------- | -------------------------------------------- |
| [docs/PHASES.md](docs/PHASES.md)                                    | the build plan and where we are              |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                        | stack, layout, request flow, environments    |
| [docs/WORKFLOW.md](docs/WORKFLOW.md)                                | DOCS → TESTS → CODE, branches, PRs           |
| [docs/TESTING.md](docs/TESTING.md) · [docs/CI_CD.md](docs/CI_CD.md) | where tests live, what CI enforces           |
| [AGENTS.md](AGENTS.md)                                              | the constraints, for humans and agents alike |

## Running it

Node 24 (see `.nvmrc`) and Docker.

```bash
npm ci
cp .env.example .env.local
docker compose up -d        # Postgres 17, the same image CI uses
npm run dev                 # http://localhost:3000
```

Never point `.env.local` at Neon — the E2E reset endpoint truncates tables and
the only Neon database is production's ([ADR-0003](docs/adr/0003-public-repo-and-local-database.md)).

## Checks

```bash
npm run check      # lint, format:check, typecheck, unit, build — before every push
npm test           # unit and component (Vitest)
npm run test:e2e   # Playwright, desktop and mobile (builds first)
npm run trace      # which spec scenarios still have no test
```

CI runs the same jobs on every PR and Vercel deploys a preview; merging to
`main` deploys to production.
