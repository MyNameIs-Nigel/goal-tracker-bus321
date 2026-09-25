# ADR-0005: Every student owns a team; no roles, no reminders

**Status:** Accepted 2026-09-24
**Deciders:** Nigel (the ask), Claude (the shape)
**Supersedes:** ADR-0001 B2, B3, B4 and D5; ADR-0002 G12 and G15 (in part). Everything else in ADR-0001–0004 stands.

## Context

Phases 0–4 built a tracker for **one owner** (Nigel) with promoted partners and read-only viewers. On 2026-09-24 Nigel asked for a core redesign:

> "This is focused on just me currently, I want this to be scalable. There should be teams where every student checks on each other. So Team Nigel would be owned by me and every other team owner instantly becomes my partner. So, if there are 3 total students: 3 teams, two partners for each team."

> "Make sure this UX is *user focused* with minimal effort. Logging in and checking in should not take more than 30 seconds. The user should be able to log in, get sent to the today page and the today page should include at the top YOUR tasks/goals, then down below a check in button for your teammates."

He also asked for the docs to drop reminders entirely, and for real content not to be a task for him — the app is exercised with fake data until release. The production database holds nothing worth keeping ("If it breaks, it's no big deal").

## Decision

### T1 — A student is anyone who signs in, and every student owns exactly one team

- Signing in with Google makes you a **student**. There is nothing to fill in and nothing to wait for.
- Your **team** exists the moment you land on a signed-in page. It is named **"Team &lt;your first name&gt;"** from your Google name. It is not renamed or deleted in-app.
- A team holds everything the owner used to hold: goals, completions, exceptions, the two documents (vision and contract), and the contract dates.

### T2 — Every other student is your partner, instantly

- Partnership is **not stored**. The partners of team *T* are every student except *T*'s owner. N students → N teams, N − 1 partners each.
- A student who signs in for the first time appears on everyone else's today page on their next page load. Nobody promotes anyone.

### T3 — No roles

- `owner` / `partner` / `viewer`, `OWNER_EMAIL`, the `/people` page and in-app promotion are removed.
- Authorization is **ownership**: you write your own team's data and nothing else; you check in on other teams and never your own. Reading is open to every student — the point is that classmates can see the truth.
- The Data Access Layer's `requireUser()` returns the session user **with their team id**; every Server Action derives "my team" from it and never trusts a team id from the client for its own writes. Ids of rows (a goal, an exception) are always matched *together with* the caller's team, so another team's id behaves like one that doesn't exist.

### T4 — The today page is the whole daily routine

- `/today` shows, top to bottom: **your** day (goals, one tap each), then **Your teammates** — every other student with how their day is going and a one-tap **Check in** — then **Checked on you**.
- A returning student's routine — open the link, tap their goals, tap Check in on each teammate — never leaves `/today`. A first-time student adds a goal right there, without visiting `/goals`.
- Each teammate also has read-only team pages: `/team/[id]` (their today), `/team/[id]/day/[date]`, `/team/[id]/contract`, `/team/[id]/history`.

### T5 — No reminders or notifications of any kind

The planned owner-reminders phase (browser notifications for the owner, ADR-0001 D5, once slated as Phase 5) is dropped along with its spec; Phase 5 is now this redesign. Nothing in the app sends anything to anyone.

### T6 — Fake data until release

- Nothing waits on Nigel's real content. Local development and CI run on seeded fake students (**Avery, Blake, Casey**; **Dana** signs up on first use), and test mode can load a richer **demo** data set.
- The former human tasks H7 (write your content) and H8 (share and promote) are withdrawn. Releasing to classmates is sharing a link, whenever Nigel chooses.

### T7 — The schema change is destructive, once

Migration `0001` drops and recreates the app tables (goals, completions, exceptions, check-ins, documents) and drops `settings` and the `role` column. Production held no tracker data (confirmed by Nigel), so this is safe; Better Auth's tables and existing sessions are kept. Migrations return to **additive-only** afterwards.

## Consequences

- **The app is multi-tenant by student, not by class.** Everyone who signs in sees everyone. That is the requested design for one class; if the app were ever shared beyond one class, the next step is a `class` grouping on teams — out of scope now.
- **Anyone with a Google account who finds the link joins.** There is no removal in-app. Acceptable for a class tool whose link is shared by hand; a stranger would be visible to everyone, which is also how they'd be noticed.
- **Everything is readable by every student**, including each vision and contract. That is the accountability model: partners must see the truth.
- **All-to-all check-ins scale with the class.** The teammates list is one short row per student; at a class of a few dozen it is still one scroll. Queries load every team's rows in a handful of statements and compute in memory (ADR-0002 G2 still holds — cheap at this scale).
- **The owner-only permission tests become ownership tests:** "another team's id is rejected" replaces "a viewer is rejected".
- `OWNER_EMAIL` in Vercel is no longer read; leaving it set is harmless.
