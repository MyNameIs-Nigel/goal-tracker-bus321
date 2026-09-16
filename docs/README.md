# Documentation — the source of truth

Everything about how this project behaves and how it is built is written here **before** it is tested or coded. If the code and the docs disagree, the docs win and the code is wrong — or the docs need a PR first.

## Map

| Read this | To learn |
|---|---|
| [PHASES.md](PHASES.md) | The build plan: phases, exit criteria, current status, and where a human is needed |
| [HUMAN_TASKS.md](HUMAN_TASKS.md) | Every step that needs Nigel, with exact click-by-click / copy-paste instructions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, folder layout, request flow, auth, time handling, environment variables |
| [DATA_MODEL.md](DATA_MODEL.md) | Tables, invariants, and the derived rules (periods, counting, failures, streaks) |
| [WORKFLOW.md](WORKFLOW.md) | DOCS → TESTS → CODE in practice; branches, PRs, and what Claude does without asking |
| [CI_CD.md](CI_CD.md) | GitHub Actions jobs, required checks, Vercel deploys, database migrations |
| [TESTING.md](TESTING.md) | Test layers, tooling, E2E sign-in, the CI database, naming and traceability |
| [specs/](specs/README.md) | One spec per feature; Given/When/Then scenarios with stable IDs that tests reference |
| [adr/](adr/README.md) | Decision records — why things are the way they are |
| [QUESTIONS.md](QUESTIONS.md) | Open questions awaiting Nigel (currently none) |

## Reading order for a fresh session

1. [`AGENTS.md`](../AGENTS.md) at the repo root — the constraints.
2. [`PHASES.md`](PHASES.md) — where we are and what's next.
3. The spec(s) for the current phase.
4. [`DATA_MODEL.md`](DATA_MODEL.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md) as needed.
5. [`WORKFLOW.md`](WORKFLOW.md) before opening a PR.

## Changing the truth

- **Behavior change** → edit the spec (and `DATA_MODEL.md` if data changes) as the *first* commit of the PR, then tests, then code.
- **Decision change** → add a new ADR that supersedes the old one. Never rewrite an accepted ADR.
- **A question only Nigel can answer** → add it to `QUESTIONS.md` with a recommended answer, then keep working on everything that doesn't depend on it.
