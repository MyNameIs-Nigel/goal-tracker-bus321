# ADR-0007: New accounts start disabled

**Status:** Accepted 2026-09-29
**Deciders:** Nigel (the ask), Claude (the shape)
**Amends:** ADR-0005 ("anyone with a Google account who finds the link joins") and ADR-0006 (a disabled user gets no session).

## Decision

- A user created by first sign-in has `disabled = true`, unless their email is in `admins` or the app is in test mode.
- Disabled users **can** hold a session; `requireUser()` sends them to `/disabled` ("Sorry, you need to ask the admin for access."). Refusing the session (ADR-0006) would show a sign-in error instead of that explanation, so it is dropped.
- Existing users are untouched; only creation changes.

## Consequences

- A stranger who finds the link gets a user row and nothing else: no team, no visibility into anyone's data. The admin sees them on `/admin` and enables classmates.
- Every classmate needs one enable click before first use.
