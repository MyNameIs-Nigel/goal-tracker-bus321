# Partner check-ins

**Status:** Approved
**Phase:** 3
**Routes:** section on `/today` and `/day/[date]`; summary on `/history`
**Rules:** [DATA_MODEL.md § partner_checkins](../DATA_MODEL.md#partner_checkins), [roles-and-permissions.md](roles-and-permissions.md)

## Purpose

The assignment asks partners to check the tracker every day. This makes that visible: a partner taps one button, optionally leaves a note, and everyone — including the partner's own accountability record — can see it happened.

## Roles

Partner: create today's check-in, edit today's note. Owner and viewer: read — the owner is *not* a partner for this purpose (the matrix in [roles-and-permissions.md](roles-and-permissions.md) leaves the owner column empty; `requirePartner()` admits role `partner` only).

## Phased test coverage

PCI-01 – PCI-08 and DT-16 ship together in the partner-check-ins PR. PCI-09 is the `/history` partners block and ships with [history.md](history.md) (HIST-06) in the same phase; its test lives in `e2e/history.spec.ts`.

## Action interface

Two Server Actions in `lib/actions/checkins.ts`, both starting with `requirePartner()`:

- `checkIn(date)` — `date` is the day the page is showing. It must equal today (`lib/clock.ts`); anything else is rejected with **"You can only check in for today"** and nothing is written. The user is always the session user — there is no user-id parameter, which is how "only yourself" (ROLE-04) is enforced. The insert is `ON CONFLICT DO NOTHING` on `(user_id, date)` and the existing row is returned (PCI-08).
- `saveNote(date, note)` — same date rule; `note` is trimmed, empty becomes `NULL`, over 280 characters is rejected (PCI-04). Only today's own row is updatable; with no row yet it fails with **"Check in first"**.

`created_at` is written from the app clock (`now()` in `lib/clock.ts`, pinned by `E2E_FIXED_NOW` in test mode) so the displayed time is deterministic in tests.

## Scenarios

### PCI-01 Partners and their status are listed
- **Given** partners Alice and Bob; Alice checked in today at 8:12 PM Denver time
- **When** anyone opens `/today`
- **Then** the **"Accountability partners"** section lists **"Alice — Checked ✓ 8:12 PM"** and **"Bob — Not yet"**

### PCI-02 A partner checks in
- **Given** Bob (partner) on `/today` with no check-in today
- **When** he presses **"I checked today"**
- **Then** a `partner_checkins` row `(Bob, today)` exists, the button is replaced by **"Checked ✓"** and a note field labelled **"Leave a note (optional)"**

### PCI-03 A partner leaves or edits a note
- **Given** Bob has checked in today
- **When** he types "Nice streak, keep it up" and presses **"Save note"**
- **Then** the note is stored and shown to everyone under his name; editing and saving again replaces it

### PCI-04 Notes are bounded
- **When** a note exceeds 280 characters
- **Then** **"Keep the note under 280 characters"** and nothing is saved

### PCI-05 Only today, only yourself
- **Given** Bob on `/day/2026-09-21` (a past day)
- **Then** the section shows that day's check-ins read-only and no button
- **And** a direct `checkIn` / `saveNote` for a date other than today is rejected (ROLE-04); another user's row can't be targeted because the action has no user-id parameter

### PCI-06 Owner and viewers don't get the button
- **Given** the owner or a viewer on `/today`
- **Then** the section is read-only; a direct check-in action throws `Forbidden` (the owner included)

### PCI-07 No partners yet
- **Given** no user has role partner
- **When** the owner opens `/today`
- **Then** the section reads **"No partners yet."** with a link **"Promote someone on the People page"**; others see just **"No partners yet."**

### PCI-08 Double taps are harmless
- **When** "I checked today" is pressed twice quickly
- **Then** exactly one row exists (unique constraint) and the UI shows one check

### PCI-09 History shows the month
- **Given** September with Alice checked on 12 of the 15 elapsed days
- **When** anyone opens `/history?month=2026-09`
- **Then** the partners block shows **"Alice — 12 of 15 days"** and a strip of day markers

## UI

Section at the bottom of the day page (after the owner's "Mark an exception" button): one row per partner (avatar, name, status/time, note in muted text). Partners are ordered by name. For the current partner on today's page, the row expands with the button or the note field. Time is shown in Denver time with the `AM/PM` format; no seconds.

## Out of scope

Reminders to partners, partner-to-partner visibility settings, reactions.
