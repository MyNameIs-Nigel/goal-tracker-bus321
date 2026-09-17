# ADR-0004: Preview deployments have no database — production only

**Status:** Accepted 2026-09-17
**Deciders:** Nigel

## Context

[H3](../HUMAN_TASKS.md#h3-create-the-neon-database-through-vercel) connected the Neon integration to Production **and** Preview, with "create a branch for each preview deployment" turned on ([H9](../HUMAN_TASKS.md#h9-turn-on-branch-protection-and-set-the-preview-env-vars)). Every open PR — and every push to one — gets its own preview deployment, so branches accumulated fast. On 2026-09-17, PR [#11](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/11) (a docs-only change, so unrelated to any code it touched) failed to deploy twice with `BUILD_FAILED` / "Resource provisioning failed," no build log lines at all. Nigel found the real error in the Vercel dashboard: **"Branch limit reached. Upgrade your plan or delete unused branches."** — Neon's Free tier caps the number of branches, and this project's had quietly hit it. The failure happens while Vercel/Neon provision the deployment's database branch, before `buildCommand` ever runs, so nothing in the build itself could have caught or fixed it.

## Decision

Preview deployments do not get a database at all. Only Production connects to Neon.

- The Neon integration's automatic per-preview branch creation is turned off ([H10](../HUMAN_TASKS.md#h10-turn-off-neon-preview-branching)).
- `DATABASE_URL` (and the other Neon-injected variables) are scoped to Production only — removed from Preview.
- `vercel.json`'s build command (`scripts/vercel-build.mjs`) runs `db:migrate` only when `VERCEL_ENV === "production"`; Preview builds skip it entirely and go straight to `next build`.
- Local dev, local E2E, and CI already never touched Neon ([ADR-0003](0003-public-repo-and-local-database.md) R2) — this just extends "Neon is production-only" to cover Preview too.

## Consequences

- The class of failure that blocked PR #11 twice can't recur: nothing about a Preview deployment asks Neon to provision anything.
- A Preview deployment can no longer render any page that queries the database — every tracker page will error at request time on a preview URL. This is an accepted trade-off: Preview's job is to prove the build succeeds and let the required `Vercel` check pass, not to be a working demo. Actual behavior per PR is verified by `e2e/*.spec.ts` against CI's own disposable `postgres:17` service container (unaffected by any of this), and the real thing is checked on production after merge.
- ADR-0003's Consequences noted that if branching turned out to be off, "previews share the production database." That contingency never happened and no longer applies — this ADR is the actual answer: previews get **no** database, shared or otherwise.
- One-time cleanup: existing stale preview branches past the limit still need deleting once in the Neon/Vercel dashboard ([H10](../HUMAN_TASKS.md#h10-turn-off-neon-preview-branching)) — turning off future auto-creation doesn't retroactively remove the ones already there.
