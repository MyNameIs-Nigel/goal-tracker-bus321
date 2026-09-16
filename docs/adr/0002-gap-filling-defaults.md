# ADR-0002: Gap-filling defaults chosen by Claude

**Status:** Accepted 2026-09-15 — any item can be vetoed by Nigel by ID ("G4: no") and will be revisited in a superseding ADR
**Deciders:** Claude

## Context

ADR-0001 settles the big questions. Writing the specs and data model surfaced smaller decisions that don't change the shape of the work enough to justify asking. They are recorded here so they are visible, reversible, and not mistaken for requirements.

## Decisions

| ID | Decision | Rationale / alternative |
|---|---|---|
| G1 | **Weeks start on Monday** (ISO). | One constant in `lib/periods.ts`. Alternative: Sunday start (common on US calendars). |
| G2 | **Failures, streaks and day statuses are derived on read, never stored.** | Required by C5 (free editing of the past). Cheap at this scale (one user's rows). |
| G3 | **A goal counts in a period only if it existed at the period's start and wasn't archived before the period's end, and the period lies entirely inside the contract window.** Archive sets `ends_on` to yesterday. | Partial periods are never on the hook, so adding a weekly goal on Thursday or starting the contract on a Saturday can't create instant failures. Consequence: for a 9/19 start, weekly goals count from 9/21 and monthly from October. Full rules in [DATA_MODEL.md](../DATA_MODEL.md#active-vs-counting). |
| G4 | **Exception coverage:** a whole-day exception excuses that day's daily goals, and excuses a weekly/monthly goal only if it covers the *entire* period; a goal-specific exception excuses that goal for every period it overlaps. | A sick Tuesday shouldn't wipe the month's goal; a goal-specific exception is the explicit way to do that. Alternative: plain overlap everywhere (more lenient). |
| G5 | **Excused days are neutral for the streak** — they neither break nor extend it. | A week of vacation shouldn't add seven to a streak. Alternative: excused days count. |
| G6 | **Rich text = Tiptap; stored as sanitized HTML** with a six-item toolbar (bold, italic, heading, bullets, numbers, link); 20,000-char limit. | Standard, accessible, small. Alternative: markdown textarea (less "user focused"). |
| G7 | **Google sign-in only in production** (and optionally localhost). **Previews, CI and local dev use the test sign-in** (`E2E_AUTH=1`, double-gated by `VERCEL_ENV !== "production"`). | Google rejects wildcard redirect URIs, so previews can't use it anyway; this also removes Google from Claude's local workflow entirely. Preview URLs are protected by Vercel's deployment protection. |
| G8 | **CI database is a Postgres service container; GitHub Actions has zero secrets.** | Nothing to provision or rotate. Alternative: Neon branch per CI run (needs an API key). |
| G9 | **Migrations run in the Vercel build command** (`npm run db:migrate && npm run build`) via a committed `vercel.json`; **additive-only** in v1. | Simplest thing that works for both production and previews. Alternative: a migration workflow in Actions (needs `DATABASE_URL` as a GitHub secret). |
| G10 | **Claude merges its own green PRs inside the active phase.** | The pipeline's point is minimal human involvement; every merge is a production deploy and that is intended. Full list of pre-authorized actions in [WORKFLOW.md](../WORKFLOW.md#what-claude-does-without-asking). |
| G11 | **`APP_TIMEZONE` is a code constant**, not an env var; **Node version via `engines.node`** (Vercel honours it) plus `.nvmrc`. | Fewer human-managed knobs. |
| G12 | **Owner-only routes return 404** for everyone else; Server Actions throw `Forbidden`. | Nothing to enumerate; matches Next.js guidance. |
| G13 | **`/day/[date]`** is the surface for viewing/editing any date; `/today` is that page for today. Owner may complete goals only for dates ≤ today; exceptions may be declared for future dates. | Gives C5 (edit the past) a home; pre-declared vacations satisfy the contract's "allowances" clause. |
| G14 | **Cadence is locked once a goal has a completion**; delete is allowed only with no completions, otherwise archive. | `period_start` semantics differ per cadence; changing it would orphan rows. |
| G15 | **Partner check-ins are for today only**, one per partner per day, note ≤ 280 chars, editable the same day. | Matches "check the tracker every day"; nothing to backfill. |
| G16 | **`flow-check` globs:** code = `app/ components/ lib/ db/ proxy.ts next.config.ts`; docs = `docs/ AGENTS.md`; tests = `*.test.ts(x) e2e/ vitest.config.* playwright.config.*`; label `skip-flow-check`; Dependabot exempt. | Concrete enough to be a pure function with tests. |
| G17 | **Playwright runs two projects: `chromium` desktop and `mobile` (Pixel 7 emulation)**; every E2E runs on both. | D4 says mobile-first; this makes it a check, not an aspiration. |
| G18 | **Sessions last 30 days**, refreshed on activity; role read from the DB per request. | Classmates shouldn't have to sign in every week; promotions are immediate. |
| G19 | **Vercel `*.vercel.app` redirects to the custom domain** once H6 is done; `BETTER_AUTH_URL` = custom domain. | One canonical URL for Google redirect URIs and for sharing. |
| G20 | **Accent green** `#16a34a`-ish (Tailwind `green-600`) in light, `green-400` in dark; everything else `zinc`. Implementer may tune within "one calm green". | D2 asked for a single calm accent. |

## Consequences

Each of these is a small, local rule. Reversing one is a new ADR plus a spec/test/code PR — none of them is load-bearing for the architecture except G2 (which follows from C5) and G7 (which follows from Google's redirect-URI rules).
