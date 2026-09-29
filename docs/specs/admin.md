# Admin

**Status:** Approved
**Phase:** 5 (follow-up)
**Routes:** `/admin`, `/disabled`
**Rules:** [ADR-0006](../adr/0006-admin-can-disable-users.md), [DATA_MODEL.md § admins](../DATA_MODEL.md#admins), [ARCHITECTURE.md § Authorization](../ARCHITECTURE.md#authorization-data-access-layer)

## Purpose

Let the admin — an email listed in the database — turn a student's access off and back on, so a stranger who found the link can be removed and a classmate can be restored.

## Scenarios

### ADM-01 The admin sees every user
- **Given** Avery's email is in `admins`
- **When** Avery opens `/admin`
- **Then** it lists Avery, Blake and Casey by name and email, each with status **Active**, and a **"Disable"** button on Blake and Casey but not on Avery

### ADM-02 Anyone else gets a 404
- **Given** Blake is signed in and not in `admins`
- **When** he opens `/admin`
- **Then** 404
- **And** with no session, `/admin` redirects to `/` (AUTH-01)

### ADM-03 Disabling a user
- **Given** Avery is on `/admin`
- **When** she presses **"Disable"** on Blake
- **Then** Blake's row reads **Disabled** with an **"Enable"** button, and Blake no longer appears under **"Your teammates"** on Casey's `/today`

### ADM-04 A disabled user is locked out
- **Given** Blake is disabled
- **When** he opens any signed-in page, such as `/today`
- **Then** he is on `/disabled`, which reads **"Sorry, you need to ask the admin for access."** with a **"Sign out"** button, and no team or data is created or shown for him
- **And** signing in again lands on `/disabled` too — a disabled user can sign in, but can do nothing else

### ADM-05 Enabling restores everything
- **Given** Blake is disabled and has goals
- **When** Avery presses **"Enable"** on him
- **Then** Blake's `/today` works again with his goals intact, and he is back in teammate lists

### ADM-06 The actions are admin-only
- **Given** Blake, a non-admin
- **When** `setUserDisabled` is invoked directly
- **Then** it throws `Forbidden` and nothing is written

### ADM-07 An admin can't lock out an admin
- **Given** Avery, an admin
- **When** `setUserDisabled` targets herself or another admin, or a user that doesn't exist
- **Then** it returns **"You can't disable an admin."** or **"User not found."** and nothing is written

### ADM-08 New accounts start disabled
- **Given** a Google account that has never signed in, whose email is not in `admins`
- **When** it completes sign-in
- **Then** its `user` row has `disabled = true`, no team is created, and the browser lands on `/disabled`
- **And** it shows on `/admin` as **Disabled**, and **"Enable"** gives it the normal app (ADM-05)
- **But** an email in `admins` is created enabled, so the admin is never locked out on first sign-in; and in test mode (`E2E_AUTH=1`) new users are created enabled

## UI

- One list, one row per user: avatar, name, email, status, one button. Same row styling as teammates; `ui-hover-*` on the buttons.
- Not linked from the navigation; the admin types `/admin`.

## Out of scope

Granting or revoking admin in-app, deleting users, disabling reasons, audit log.
