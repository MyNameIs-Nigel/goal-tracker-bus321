# Data Model

Postgres via Drizzle. `db/schema.ts` is the code-side source of truth and must match this document; a PR that changes one changes both. Everything under **Derived rules** is computed in pure functions in `lib/` and is **never stored**.

## Conventions

- Primary keys are UUIDs (`gen_random_uuid()`), except Better Auth's tables (its own IDs) and `settings`.
- Timestamps are `timestamptz`; calendar dates are `date`. A `date` is always a calendar date in `APP_TIMEZONE` (`America/Denver`); it has no time and is never converted.
- `created_at` / `updated_at` on every app table, maintained by the application.
- Text lengths are enforced in the Server Action *and* by a `CHECK (char_length(...) <= n)` in the table.

## Tables

### Managed by Better Auth (shape per its docs at implementation time)

`user`, `session`, `account`, `verification`. We add one column and one index to `user`:

| Column | Type | Notes |
|---|---|---|
| `role` | `text NOT NULL DEFAULT 'viewer'` | `CHECK (role IN ('owner','partner','viewer'))` |

Partial unique index: `CREATE UNIQUE INDEX one_owner ON "user" (role) WHERE role = 'owner';`

`user` also carries `name`, `email` (unique), `image` (avatar URL) and `created_at` from Google via Better Auth; `/people` displays those.

### `goals`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `title` | `text NOT NULL` | 1–120 chars |
| `description` | `text NULL` | ≤ 500 chars, plain text |
| `cadence` | `text NOT NULL` | `CHECK (cadence IN ('daily','weekly','monthly'))` |
| `starts_on` | `date NOT NULL` | default: today at creation |
| `ends_on` | `date NULL` | set by *archive*; `NULL` = active. May be earlier than `starts_on` (see *Counting*) |
| `sort_order` | `integer NOT NULL DEFAULT 0` | order within a cadence group |
| `created_at`, `updated_at` | `timestamptz NOT NULL` | |

Cadence is **locked** once the goal has any completion (period semantics would otherwise change under existing rows). Deleting a goal is allowed only when it has no completions; deletion cascades to its exceptions.

### `completions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `goal_id` | `uuid NOT NULL → goals ON DELETE CASCADE` | |
| `period_start` | `date NOT NULL` | first day of the period (the date itself / the Monday / the 1st) |
| `completed_at` | `timestamptz NOT NULL DEFAULT now()` | |

`UNIQUE (goal_id, period_start)`. Toggling off deletes the row. Owner-only.

### `exceptions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `goal_id` | `uuid NULL → goals ON DELETE CASCADE` | `NULL` = whole-day exception (all goals) |
| `starts_on` | `date NOT NULL` | |
| `ends_on` | `date NOT NULL` | `CHECK (ends_on >= starts_on AND ends_on - starts_on <= 31)` |
| `reason` | `text NOT NULL` | 1–280 chars, always shown to partners |
| `created_at` | `timestamptz NOT NULL` | |

Owner-only. Future dates allowed (pre-declared vacations).

### `partner_checkins`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `user_id` | `text NOT NULL → user ON DELETE CASCADE` | must have role `partner` at write time |
| `date` | `date NOT NULL` | always *today* at write time |
| `note` | `text NULL` | ≤ 280 chars, plain text |
| `created_at`, `updated_at` | `timestamptz NOT NULL` | |

`UNIQUE (user_id, date)`. A partner can update the note of today's row; nothing else.

### `documents`

| Column | Type | Notes |
|---|---|---|
| `key` | `text PK` | `CHECK (key IN ('vision','contract'))` |
| `body_html` | `text NOT NULL DEFAULT ''` | sanitized HTML, ≤ 20,000 chars |
| `updated_at` | `timestamptz NOT NULL` | |
| `updated_by` | `text NULL → user ON DELETE SET NULL` | |

Two rows, created by the first migration. Owner-only writes.

### `settings`

| Column | Type | Notes |
|---|---|---|
| `id` | `integer PK` | `CHECK (id = 1)` — single row, created by the first migration |
| `contract_start` | `date NULL` | |
| `contract_end` | `date NULL` | `CHECK (contract_end IS NULL OR contract_start IS NULL OR contract_end >= contract_start)` |
| `updated_at` | `timestamptz NOT NULL` | |

Owner-only writes, from the `/contract` page.

---

## Derived rules

Notation: **T** = today (in `APP_TIMEZONE`). A period **P** has `P.start` and `P.end` (inclusive dates). **G** is a goal.

### Periods

| Cadence | Period containing date *d* | `period_start` |
|---|---|---|
| daily | `[d, d]` | `d` |
| weekly | Monday through Sunday of the ISO week containing *d* | that Monday |
| monthly | first through last day of *d*'s month | the 1st |

### Active vs. counting

**G is *active* on date *d*** iff `G.starts_on ≤ d` and (`G.ends_on IS NULL` or `d ≤ G.ends_on`). Active decides what the *Today* and *Day* pages **display**.

**G *counts* in period P** iff **all** of:

1. `G.starts_on ≤ P.start` — the goal existed at the start of the period (adding a weekly goal on Thursday doesn't put this week on the hook);
2. `G.ends_on IS NULL` or `G.ends_on ≥ P.end` — the goal wasn't archived during the period;
3. `settings.contract_start IS NULL` or `P.start ≥ contract_start`;
4. `settings.contract_end IS NULL` or `P.end ≤ contract_end`.

Counting decides what can **fail** and what feeds the **streak**. A goal that is displayed but not counting (e.g. before the contract starts) shows as *not counting yet*.

**Archive** sets `ends_on = T − 1 day`, so the goal disappears from today and today's period no longer counts. If that lands before `starts_on` (archived on its first day), the goal simply never counted — which is why `ends_on < starts_on` is allowed.

Consequence for a contract starting Saturday 2026-09-19: daily goals count from 9/19, weekly from Monday 9/21, monthly from October 1. Partial periods are never on the hook.

### Completed

`(G, P)` is **completed** iff a `completions` row exists with `(G.id, P.start)`.

### Excused

`(G, P)` is **excused** iff some `exceptions` row **E** satisfies one of:

- **goal-specific** (`E.goal_id = G.id`): `[E.starts_on, E.ends_on]` overlaps `[P.start, P.end]`;
- **whole-day** (`E.goal_id IS NULL`) and `G.cadence = 'daily'`: `P.start ∈ [E.starts_on, E.ends_on]`;
- **whole-day** and `G.cadence ≠ 'daily'`: `[E.starts_on, E.ends_on] ⊇ [P.start, P.end]` — a sick Tuesday excuses Tuesday's daily goals, not the week's or month's goals; a week-long vacation excuses the week.

### Status of `(G, P)`

Evaluated in order; first match wins.

| # | Condition | Status |
|---|---|---|
| 1 | G does not count in P | `not-counting` |
| 2 | completed | `done` |
| 3 | excused | `excused` |
| 4 | `P.end < T` | `failed` |
| 5 | `P.start ≤ T ≤ P.end` | `pending` |
| 6 | `P.start > T` | `upcoming` |

A **failure** is any `(G, P)` with status `failed`. **Failures in month M** = number of failures whose `P.start` falls in M (a week straddling a month boundary belongs to the month it starts in). Failures are recomputed on every read; editing a past day, adding an exception, or archiving a goal changes them retroactively — that's [decision C5](adr/0001-initial-scope.md).

### Day status (daily goals only; drives the history calendar and the streak)

For date *d*, consider the daily goals that **count** on *d*. In order:

| # | Condition | Day status |
|---|---|---|
| 1 | no counting daily goals | `none` |
| 2 | `d > T` | `upcoming` |
| 3 | every goal is `done` or `excused`, and at least one is `done` | `clean` |
| 4 | every goal is `excused` | `excused` |
| 5 | `d < T` (so at least one is `failed`) | `missed` |
| 6 | `d = T` (so at least one is `pending`) | `open` |

### Streak

Counts consecutive `clean` days, walking backwards from the most recent eligible day. `excused` days are **neutral** — they neither break nor extend the streak.

```
start = T if dayStatus(T) ∈ {clean, excused} else T − 1
streak = 0
for d = start, start−1, …:
  if dayStatus(d) = clean:   streak += 1
  elif dayStatus(d) = excused: continue
  else: stop
```

`none`, `missed`, and `open` (only possible for `d = T`, already handled by `start`) all stop the walk.

### Contract day

If `contract_start` is set and `contract_start ≤ T`: day **N** = `T − contract_start + 1`. If `contract_end` is also set: total **M** = `contract_end − contract_start + 1`, shown as "Day N of M". Before the start: "Contract starts in *k* days". After the end: "Contract ended *date*".

### Partner "checked today"

A partner **checked** on date *d* iff a `partner_checkins` row exists for `(user_id, d)`. Only `d = T` is writable.

---

## Migrations

- Drizzle Kit generates SQL migrations into `db/migrations/`; they are committed and reviewed like code.
- Applied by `npm run db:migrate` — in the Vercel build command (production and previews) and before the E2E job in CI.
- **Additive only** in v1 (new tables, nullable columns, indexes). Preview deployments may share the production database if Neon preview branching is off; additive migrations keep that safe. Anything destructive is a Phase-5+ conversation with a backup first.
- Migration 0001 creates every table above, including the `documents` and `settings` seed rows, so Phases 2–3 add data, not structure.
