# ADR-0003: Repository is public; local database runs in Docker

**Status:** Accepted 2026-09-16
**Deciders:** Nigel (visibility), Claude (local database)

## Context

ADR-0001 A3 chose a private repository and left a note: GitHub Free does not offer branch protection on private repos, and with all personal content in the database the repo is code-only. Nigel resolved it ([H1](../HUMAN_TASKS.md#h1-decide-public-repo-or-github-pro)).

Separately, the Neon integration ([H3](../HUMAN_TASKS.md#h3-create-the-neon-database-through-vercel)) connected Preview and Production only. Local development and local E2E still need a Postgres, and the E2E harness's reset endpoint truncates every table — pointing a laptop at the production database is a foot-gun. Docker (29.x, with Compose) is installed on Nigel's machine.

## Decisions

| ID | Decision |
|---|---|
| R1 | **The repository is public** (changed 2026-09-16; resolves the note on ADR-0001 A3). Branch protection with required checks is configured in Phase 0. Nothing personal may ever be committed: owner email, partner emails, and all tracker content live in Vercel env vars and the database. |
| R2 | **Local development and local E2E use a Postgres container** (`docker-compose.yml`, `postgres:17`, the same image CI uses). `.env.local`'s `DATABASE_URL` points at it. Neon is touched only by Vercel builds and deployments; `vercel env pull` is never used to obtain database credentials. |
| R3 | The Neon Auth variables the integration created (`NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`) are ignored. Better Auth is the auth system (ADR-0001 B1). |

## Consequences

- Actions minutes are unlimited and branch protection is free — E4 in full.
- One `docker compose up -d` is the only local setup step, and it is Claude's.
- If Neon preview branching turns out to be off (checked in Phase 0), previews share the production database; additive-only migrations (ADR-0002 G9) already make that safe.
