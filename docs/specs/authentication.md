# Authentication

**Status:** Approved (revised for teams by [ADR-0005](../adr/0005-every-student-owns-a-team.md))
**Phase:** 1, revised in 5
**Routes:** `/`, `/api/auth/*`, `/api/e2e/*` (test mode only)
**Rules:** [ARCHITECTURE.md § Authentication](../ARCHITECTURE.md#authentication), [§ Environments](../ARCHITECTURE.md#environments)

## Purpose

Let any classmate open the link, tap one button, and be in — on their own today page, with their own team. Google is the only way in. There is nothing to sign up for, no password, no profile to fill out. Signing in creates the account and the team.

## Scenarios

### AUTH-01 Unauthenticated visitors are sent to the sign-in page
- **Given** no session cookie
- **When** the visitor requests `/today` (or any route under `(app)/`)
- **Then** they are redirected to `/`

### AUTH-02 The sign-in page offers Google
- **Given** the visitor is on `/`
- **Then** the page shows the heading **"BUS 321 Goal Tracker"**, the line **"Your goals, and the classmates keeping you honest."**, and a button **"Continue with Google"** that starts the Better Auth Google flow (`/api/auth/sign-in/social`, provider `google`, callback `/today`)

### AUTH-03 First sign-in creates a student and their team
- **Given** a Google account that has never signed in
- **When** it completes Google sign-in
- **Then** a `user` row exists with that email, Google's name and avatar, a `teams` row is owned by it, and the browser lands on `/today` ([teams.md TEAM-01](teams.md))

### AUTH-05 Signed-in visitors skip the sign-in page
- **Given** a valid session
- **When** the user requests `/`
- **Then** they are redirected to `/today`

### AUTH-06 Sign out ends the session
- **Given** a signed-in user
- **When** they choose **"Sign out"** from the user menu
- **Then** they are on `/`, and requesting `/today` redirects to `/` (AUTH-01)

### AUTH-07 Sessions persist
- **Given** a user signed in 20 days ago who has used the app since
- **When** they open the app
- **Then** they are still signed in (30-day session, refreshed on activity) — returning is zero taps

### AUTH-08 Cancelled sign-in is friendly
- **Given** the visitor started Google sign-in and cancelled or Google returned an error
- **When** they return to `/`
- **Then** the page shows **"Sign-in didn't complete. Try again."** and the Google button

### AUTH-09 Test sign-in exists only in test mode
- **Given** `E2E_AUTH=1` and `VERCEL_ENV` is not `production`
- **When** a visitor opens `/`
- **Then** below the Google button there is a **"Test sign-in"** section with buttons **"Avery"**, **"Blake"**, **"Casey"** and **"Load demo data"**
- **And when** they press **"Blake"**
- **Then** a session exists for `blake@e2e.local` and they land on `/today`

### AUTH-10 Test sign-in is absent otherwise
- **Given** `E2E_AUTH` is unset, **or** `VERCEL_ENV=production`
- **Then** `/` has no "Test sign-in" section, and `POST /api/e2e/sign-in` and `POST /api/e2e/reset` respond `404`

### AUTH-11 The test endpoints do what the harness needs
- **Given** test mode
- **When** `POST /api/e2e/reset` is called with an optional `{ "now": "<ISO>" }`
- **Then** every app table is emptied and reseeded with three fake students — Avery Adams, Blake Brown, Casey Clark — each with a team whose `contract_start` is `2026-09-19` and nothing else; and if `now` was given, `lib/clock.ts` reports that instant until the next reset
- **And when** `POST /api/e2e/sign-in` is called with `{ "student": "avery" }`
- **Then** the response sets a session cookie for `avery@e2e.local`
- **And when** it is called with `{ "student": "dana" }`, a student who doesn't exist yet
- **Then** Dana Diaz's account is created first — the way Google's first sign-in creates one — and her session cookie is set

### AUTH-12 The header shows who you are
- **Given** a signed-in student
- **Then** the header shows their Google avatar (or initials fallback) and, in the user menu, their name, email and team (**"Team Avery"**)

### AUTH-13 Test mode can fill the app with fake data
- **Given** test mode
- **When** `POST /api/e2e/reset` is called with `{ "demo": true }`, or **"Load demo data"** is pressed on `/`
- **Then** the three students are reseeded with fake content relative to today — goals of every cadence, two weeks of check-offs with a miss and an excused day, check-ins and notes on each other, and a written vision and contract each — so that Avery's `/today` shows her goals and both teammates with a progress line
- **And** pressing the button signs in as Avery

## UI

- `/` is a single centered column: app name, one line, the Google button (full-width on phones, 48px tall), and in test mode the four plain buttons under a "Test sign-in" caption.
- Loading state on the button after tap (disabled + spinner) so double-taps don't start two flows.
- No marketing, no footer, no links. It's a door.

## Retired

- **AUTH-04** (the `OWNER_EMAIL` account becomes owner) — there is no owner role ([ADR-0005](../adr/0005-every-student-owns-a-team.md) T3).

## Out of scope

- Any provider other than Google; email/password; magic links.
- Account deletion or profile editing (Google owns the profile).
