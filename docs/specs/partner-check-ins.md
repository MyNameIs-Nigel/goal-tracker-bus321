# Partner check-ins

**Status:** Approved (revised for teams by [ADR-0005](../adr/0005-every-student-owns-a-team.md))
**Phase:** 3, revised in 5
**Routes:** "Your teammates" and "Checked on you" on `/today`; the "Partners" section on team day pages; the partners block on history pages
**Rules:** [DATA_MODEL.md § checkins](../DATA_MODEL.md#checkins), [§ Partners](../DATA_MODEL.md#partners), [§ Teammate summary](../DATA_MODEL.md#teammate-summary-the-one-line-under-each-teammate-on-today), [teams.md](teams.md)

## Purpose

The assignment asks partners to check each other's progress every day. Every other student is your partner, so every day you check in on each of them: one tap per teammate, right under your own goals on `/today`, with the line that tells you how their day is going. A note is optional. Whoever you checked on sees it under **"Checked on you"**.

## Action interface

Two Server Actions in `lib/actions/checkins.ts`, both starting with `requireUser()`:

- `checkIn(teamId, date)` — `teamId` is the team being checked on; `date` is the day the page is showing. The team must exist (**"Team not found."**) and must not be the caller's own team (throws `Forbidden`, PCI-06). `date` must equal today (`lib/clock.ts`); anything else is rejected with **"You can only check in for today"** and nothing is written. The partner is always the session user — there is no user-id parameter. The insert is `ON CONFLICT DO NOTHING` on `(team_id, user_id, date)` and the existing row is returned (PCI-08).
- `saveNote(teamId, date, note)` — same team and date rules; `note` is trimmed, empty becomes `NULL`, over 280 characters is rejected (PCI-04). Only the caller's own row for today is updatable; with no row yet it fails with **"Check in first"**.

`created_at` is written from the app clock (`now()` in `lib/clock.ts`, pinned by `E2E_FIXED_NOW` in test mode) so the displayed time is deterministic in tests.

## Scenarios

### PCI-01 Your teammates are listed with their day and your check-in
- **Given** students Avery, Blake and Casey; today Blake has 3 counting daily goals, 2 done, and a 4-day streak; Casey has no goals
- **When** Avery opens `/today`
- **Then** **"Your teammates"** lists, by name, **"Blake Brown"** with **"2 of 3 done · 4-day streak"** and **"Casey Clark"** with **"No goals yet"**, each with a **"Check in"** button; each name links to that teammate's `/team/<id>`

### PCI-02 One tap checks in
- **Given** Avery on `/today` at 8:12 PM Denver time, not yet checked in on Blake
- **When** she presses **"Check in"** on Blake's row
- **Then** a `checkins` row `(Blake's team, Avery, today)` exists, the button is replaced by **"Checked ✓ 8:12 PM"**, the section heading reads **"Your teammates · 1 of 2 checked"**, and it is all still so after a reload

### PCI-03 A note is optional and can be replaced
- **Given** Avery has checked in on Blake today
- **When** she presses **"Add a note"**, types "Nice streak, keep it up" into **"Note for Blake"** and presses **"Save note"**
- **Then** the note is stored and Blake sees it under **"Checked on you"**; editing and saving again replaces it

### PCI-04 Notes are bounded
- **When** a note exceeds 280 characters
- **Then** **"Keep the note under 280 characters"** and nothing is saved

### PCI-05 Only today, only yourself
- **Given** Avery on Blake's `/team/<id>/day/2026-09-21` (a past day)
- **Then** the Partners section shows that day's check-ins read-only and no button
- **And** a direct `checkIn` / `saveNote` for a date other than today is rejected; another partner's row can't be targeted because the actions have no user-id parameter

### PCI-06 Never your own team
- **Given** Avery on `/today` or any of her own pages
- **Then** no **"Check in"** control exists for her own team
- **And** a direct `checkIn` / `saveNote` for her own team throws `Forbidden` ([teams.md TEAM-07](teams.md))

### PCI-07 No teammates yet
- **Given** Avery is the only student
- **When** she opens `/today`
- **Then** "Your teammates" reads **"No teammates yet. Share the link:"** followed by the app URL and a **"Copy link"** button

### PCI-08 Double taps are harmless
- **When** "Check in" is pressed twice quickly
- **Then** exactly one row exists (unique constraint) and the UI shows one check

### PCI-09 History shows the month's check-ins on a team
- **Given** September with Blake checked on Avery on 12 of the 15 elapsed days
- **When** anyone opens Avery's history for `2026-09` (`/history?month=2026-09` for Avery, `/team/<id>/history?month=2026-09` for others)
- **Then** the Partners block shows **"Blake Brown — 12 of 15 days"** and a strip of day markers (*M* = elapsed days of the month, defined in [history.md § Definitions](history.md#definitions))

### PCI-10 Checked on you
- **Given** Blake checked in on Avery today at 8:12 PM with the note "Nice streak, keep it up", and Casey hasn't
- **When** Avery opens `/today`
- **Then** the last section, **"Checked on you"**, lists **"Blake Brown — Checked ✓ 8:12 PM"** with the note under it and **"Casey Clark — Not yet"**

### PCI-11 Check in from a teammate's page
- **Given** Avery on Blake's `/team/<id>` today
- **Then** the last section, **"Partners"**, lists Blake's partners — Avery and Casey — with their status for today, and Avery's own row has the **"Check in"** button
- **When** she presses it
- **Then** the same check-in shows on her `/today` as **"Checked ✓"** on Blake's row

## UI

- **Your teammates** (on `/today` only): one row per teammate — avatar, name (a link to their team), the teammate summary in muted text under the name, and on the right the one control: **"Check in"** (filled accent, ≥ 44px) or **"Checked ✓ <time>"** (accent text). After checking in, a small **"Add a note"** text button opens the note field for that row only. The heading carries the count: **"Your teammates · N of M checked"**.
- **Checked on you** and **Partners**: one row per partner of the team shown — avatar, name, **"Checked ✓ <time>"** or **"Not yet"**, the note in muted text beneath. Read-only, except your own row on a teammate's page today.
- Time is shown in Denver time with the `AM/PM` format; no seconds. Everyone is ordered by name.

## Out of scope

Reminders or notifications of any kind ([ADR-0005](../adr/0005-every-student-owns-a-team.md) T5), checking in on a past day, reactions, choosing who your partners are.
