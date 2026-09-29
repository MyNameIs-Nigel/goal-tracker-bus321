# Data Model

Postgres via Drizzle. `db/schema.ts` is the code-side source of truth and must match this document; a PR that changes one changes both. Everything under **Derived rules** is computed in pure functions in `lib/` and is **never stored**.

Every student owns exactly one **team** ([ADR-0005](adr/0005-every-student-owns-a-team.md)); every tracker row belongs to one team. The derived rules below are the same for every team and always run over one team's rows.

## Conventions

- Primary keys are UUIDs (`gen_random_uuid()`), except Better Auth's tables (its own IDs) and `documents` (composite).
- Timestamps are `timestamptz`; calendar dates are `date`. A `date` is always a calendar date in `APP_TIMEZONE` (`America/Denver`); it has no time and is never converted.
- `created_at` / `updated_at` on every app table, maintained by the application.
- Text lengths are enforced in the Server Action *and* by a `CHECK (char_length(...) <= n)` in the table.
- Every app table reaches `teams` by a foreign key with `ON DELETE CASCADE`, directly or through `goals`.

## Tables

### Managed by Better Auth (shape per its docs at implementation time)

`user`, `session`, `account`, `verification`, unchanged from Better Auth's defaults. `user` carries `name`, `email` (unique), `image` (avatar URL) and `created_at` from Google. There is no role column ([ADR-0005](adr/0005-every-student-owns-a-team.md) T3). One app column is added: `disabled` (boolean, not null, default `false`) — a disabled user cannot use the app; new users are created `true` unless their email is in `admins` or the app is in test mode ([ADR-0006](adr/0006-admin-can-disable-users.md), [specs/admin.md](specs/admin.md)).

A **student** is a `user` that owns a team.

### `admins`

| Column | Type | Notes |
|---|---|---|
| `email` | text PK | lower-case; a user whose email is here is an admin |

Seeded by `0002_admin_disable` with Nigel's address. Admin only gates `/admin`.

### `teams`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | appears in team page URLs (`/team/<id>`) |
| `owner_id` | `text NOT NULL UNIQUE → user ON DELETE CASCADE` | exactly one team per student |
| `contract_start` | `date NULL` | |
| `contract_end` | `date NULL` | `CHECK (contract_end IS NULL OR contract_start IS NULL OR contract_end >= contract_start)` |
| `created_at`, `updated_at` | `timestamptz NOT NULL` | |

Created the first time a signed-in request is made for the user (the Data Access Layer inserts it if missing; `ON CONFLICT (owner_id) DO NOTHING` makes that race-free). The team's display name is **"Team &lt;first name&gt;"**, derived from `user.name` on read and never stored. Only the owner writes the contract dates, from `/contract`.

### `goals`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `team_id` | `uuid NOT NULL → teams ON DELETE CASCADE` | indexed |
| `title` | `text NOT NULL` | 1–120 chars |
| `description` | `text NULL` | ≤ 500 chars, plain text |
| `cadence` | `text NOT NULL` | `CHECK (cadence IN ('daily','weekly','monthly'))` |
| `starts_on` | `date NOT NULL` | default: today at creation |
| `ends_on` | `date NULL` | set by *archive*; `NULL` = active. May be earlier than `starts_on` (see *Counting*) |
| `sort_order` | `integer NOT NULL DEFAULT 0` | order within a team's cadence group |
| `created_at`, `updated_at` | `timestamptz NOT NULL` | |

Cadence is **locked** once the goal has any completion (period semantics would otherwise change under existing rows). Deleting a goal is allowed only when it has no completions; deletion cascades to its exceptions. Only the team's owner writes.

### `completions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `goal_id` | `uuid NOT NULL → goals ON DELETE CASCADE` | the team is the goal's |
| `period_start` | `date NOT NULL` | first day of the period (the date itself / the Monday / the 1st) |
| `completed_at` | `timestamptz NOT NULL DEFAULT now()` | |

`UNIQUE (goal_id, period_start)`. Toggling off deletes the row. Only the goal's team owner writes.

### `exceptions`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `team_id` | `uuid NOT NULL → teams ON DELETE CASCADE` | indexed |
| `goal_id` | `uuid NULL → goals ON DELETE CASCADE` | `NULL` = whole-day exception (all of the team's goals); otherwise a goal **of the same team** (enforced by the action) |
| `starts_on` | `date NOT NULL` | |
| `ends_on` | `date NOT NULL` | `CHECK (ends_on >= starts_on AND ends_on - starts_on <= 31)` |
| `reason` | `text NOT NULL` | 1–280 chars, always shown to partners |
| `created_at` | `timestamptz NOT NULL` | |

Only the team's owner writes. Future dates allowed (pre-declared vacations).

### `checkins`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK` | |
| `team_id` | `uuid NOT NULL → teams ON DELETE CASCADE` | the team being checked on |
| `user_id` | `text NOT NULL → user ON DELETE CASCADE` | the partner checking in — never the team's owner (enforced by the action) |
| `date` | `date NOT NULL` | always *today* at write time |
| `note` | `text NULL` | ≤ 280 chars, plain text |
| `created_at`, `updated_at` | `timestamptz NOT NULL` | |

`UNIQUE (team_id, user_id, date)`. A partner can update the note of their own row for today; nothing else.

### `documents`

| Column | Type | Notes |
|---|---|---|
| `team_id` | `uuid NOT NULL → teams ON DELETE CASCADE` | |
| `key` | `text NOT NULL` | `CHECK (key IN ('vision','contract'))` |
| `body_html` | `text NOT NULL DEFAULT ''` | sanitized HTML, ≤ 20,000 chars |
| `updated_at` | `timestamptz NOT NULL` | |

`PRIMARY KEY (team_id, key)`. A row is created by the owner's first save (an upsert); a missing row reads as an empty, never-saved document. Only the team's owner writes.

---

## Derived rules

Notation: **T** = today (in `APP_TIMEZONE`). A period **P** has `P.start` and `P.end` (inclusive dates). **G** is a goal of team **𝒯**; "the contract" is 𝒯's `contract_start` / `contract_end`; completions and exceptions are 𝒯's.

### Periods

| Cadence | Period containing date *d* | `period_start` |
|---|---|---|
| daily | `[d, d]` | `d` |
| weekly | Monday through Sunday of the ISO week containing *d* | that Monday |
| monthly | first through last day of *d*'s month | the 1st |

### Active vs. counting

**G is *active* on date *d*** iff `G.starts_on ≤ d` and (`G.ends_on IS NULL` or `d ≤ G.ends_on`). Active decides what the day pages **display**.

**G *counts* in period P** iff **all** of:

1. `G.starts_on ≤ P.start` — the goal existed at the start of the period (adding a weekly goal on Thursday doesn't put this week on the hook);
2. `G.ends_on IS NULL` or `G.ends_on ≥ P.end` — the goal wasn't archived during the period;
3. `contract_start IS NULL` or `P.start ≥ contract_start`;
4. `contract_end IS NULL` or `P.end ≤ contract_end`.

Counting decides what can **fail** and what feeds the **streak**. A goal that is displayed but not counting (e.g. before the contract starts) shows as *not counting yet*.

**Archive** sets `ends_on = T − 1 day`, so the goal disappears from today and today's period no longer counts. If that lands before `starts_on` (archived on its first day), the goal simply never counted — which is why `ends_on < starts_on` is allowed.

Consequence for a contract starting Saturday 2026-09-19: daily goals count from 9/19, weekly from Monday 9/21, monthly from October 1. Partial periods are never on the hook.

### Completed

`(G, P)` is **completed** iff a `completions` row exists with `(G.id, P.start)`.

### Excused

`(G, P)` is **excused** iff some exception **E** of 𝒯 satisfies one of:

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

A **failure** is any `(G, P)` with status `failed`. **Failures in month M** = number of 𝒯's failures whose `P.start` falls in M (a week straddling a month boundary belongs to the month it starts in). Failures are recomputed on every read; editing a past day, adding an exception, or archiving a goal changes them retroactively — that's [decision C5](adr/0001-initial-scope.md).

### Day status (daily goals only; drives the history calendar and the streak)

For date *d*, consider 𝒯's daily goals that **count** on *d*. In order:

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

### Partners

The **partners** of 𝒯 are every student except 𝒯's owner, ordered by name. Disabled students are excluded from partners and teammate lists. Nothing about partnership is stored ([ADR-0005](adr/0005-every-student-owns-a-team.md) T2). From a student's own point of view, their partners' teams are their **teammates**.

### Checked in

Partner *p* **checked** on 𝒯 on date *d* iff a `checkins` row exists for `(𝒯, p, d)`. Only `d = T` is writable.

### Teammate summary (the one line under each teammate on `/today`)

For a teammate's team on date T:

1. no goal of the team is active on T → **"No goals yet"**;
2. otherwise **"&lt;progress&gt; · &lt;streak&gt;"**, where *progress* is the Today progress line of that team (**"2 of 3 done"** / **"All done"**), or **"Nothing due today"** when none of its daily goals counts on T, and *streak* is **"4-day streak"** / **"No streak yet"**.

---

## Migrations

- Drizzle Kit generates SQL migrations into `db/migrations/`; they are committed and reviewed like code.
- Applied by `npm run db:migrate` — in the Vercel build command (Production only, [ADR-0004](adr/0004-preview-has-no-database.md)) and before the E2E job in CI.
- `0000_init` created the single-owner schema. **`0001_teams` is destructive by design** ([ADR-0005](adr/0005-every-student-owns-a-team.md) T7): it drops `settings`, the old app tables and `user.role`, and creates the tables above. Production held no tracker data. Better Auth's tables, users and sessions are kept.
- `0002_admin_disable` (additive) adds `user.disabled` and the `admins` table, seeded with the admin email.
- From `0002` on, migrations are **additive only** (new tables, nullable columns, indexes). Anything destructive needs a new ADR and a backup first.
