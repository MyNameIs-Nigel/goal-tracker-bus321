# Authentication

**Status:** Approved
**Phase:** 1
**Routes:** `/`, `/api/auth/*`, `/api/e2e/*` (test mode only)
**Rules:** [ARCHITECTURE.md § Authentication](../ARCHITECTURE.md#authentication), [§ Environments](../ARCHITECTURE.md#environments)

## Purpose

Let any classmate open the link, tap one button, and be in. Google is the only way in. There is nothing to sign up for, no password, no profile to fill out. Signing in creates the account.

## Roles

Everyone starts as `viewer`. The account whose email matches `OWNER_EMAIL` is `owner`. See [roles-and-permissions.md](roles-and-permissions.md).

## Scenarios

### AUTH-01 Unauthenticated visitors are sent to the sign-in page
- **Given** no session cookie
- **When** the visitor requests `/today` (or any route under `(app)/`)
- **Then** they are redirected to `/`

### AUTH-02 The sign-in page offers Google
- **Given** the visitor is on `/`
- **Then** the page shows the heading **"BUS 321 Goal Tracker"**, one sentence of context, and a button **"Continue with Google"** that starts the Better Auth Google flow (`/api/auth/sign-in/social`, provider `google`, callback `/today`)

### AUTH-03 First sign-in creates a viewer
- **Given** a Google account whose email is not `OWNER_EMAIL` and has never signed in
- **When** it completes Google sign-in
- **Then** a `user` row exists with that email, Google's name and avatar, and `role = 'viewer'`, and the browser lands on `/today`

### AUTH-04 The owner email becomes owner, every time
- **Given** `OWNER_EMAIL` is `nigel@example.com`
- **When** `Nigel@Example.com` signs in for the first time
- **Then** the created user has `role = 'owner'`
- **And when** that user's role has somehow been changed in the database and they sign in again
- **Then** the role is `owner` again after sign-in

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
- **Then** they are still signed in (30-day session, refreshed on activity)

### AUTH-08 Cancelled sign-in is friendly
- **Given** the visitor started Google sign-in and cancelled or Google returned an error
- **When** they return to `/`
- **Then** the page shows **"Sign-in didn't complete. Try again."** and the Google button

### AUTH-09 Test sign-in exists only in test mode
- **Given** `E2E_AUTH=1` and `VERCEL_ENV` is not `production`
- **When** a visitor opens `/`
- **Then** below the Google button there is a **"Test sign-in"** section with buttons **"Owner"**, **"Partner"**, **"Viewer"**
- **And when** they press **"Partner"**
- **Then** a session exists for `partner@e2e.local` and they land on `/today`

### AUTH-10 Test sign-in is absent otherwise
- **Given** `E2E_AUTH` is unset, **or** `VERCEL_ENV=production`
- **Then** `/` has no "Test sign-in" section, and `POST /api/e2e/sign-in` and `POST /api/e2e/reset` respond `404`

### AUTH-11 The test endpoints do what the harness needs
- **Given** test mode
- **When** `POST /api/e2e/reset` is called with an optional `{ "now": "<ISO>" }`
- **Then** every app table is emptied and reseeded (three users, `settings.contract_start = 2026-09-19`, empty documents), and if `now` was given, `lib/clock.ts` reports that instant until the next reset
- **And when** `POST /api/e2e/sign-in` is called with `{ "role": "owner" }`
- **Then** the response sets a session cookie for `owner@e2e.local`

### AUTH-12 The header shows who you are
- **Given** a signed-in user
- **Then** the header shows their Google avatar (or initials fallback) and, in the user menu, their name, email and role label (**"Owner"**, **"Partner"** or **"Viewer"**)

## UI

- `/` is a single centered column: app name, one line ("Nigel's goals, and the people keeping him honest." — copy may be tuned), the Google button (full-width on phones, 48px tall), and in test mode the three plain buttons under a "Test sign-in" caption.
- Loading state on the button after tap (disabled + spinner) so double-taps don't start two flows.
- No marketing, no footer, no links. It's a door.

## Out of scope

- Any provider other than Google; email/password; magic links.
- Account deletion or profile editing (Google owns the profile).
- Multi-owner.
