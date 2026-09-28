# ADR-0006: An admin, stored in the database, can disable users

**Status:** Accepted 2026-09-28
**Deciders:** Nigel (the ask), Claude (the shape)
**Amends:** ADR-0005 T3 (no roles) and the "no removal in-app" consequence. Everything else stands.

## Context

ADR-0005 accepted that anyone with a Google account who finds the link joins, with no way to remove them. Nigel asked for an admin who can enable or disable users from `/admin`, with the admin identified by an email stored in the database.

## Decision

- **Admins are emails in an `admins` table**, not a role on `user`. A signed-in user is an admin iff their email is in the table. Migration `0002` seeds Nigel's address; adding another admin is one `INSERT`. There is no in-app way to grant admin (out of scope).
- **`user.disabled`** (boolean, default false) is the only new user state. Disabled students cannot use the app: existing sessions are sent to `/disabled`, new sign-ins are refused, and they vanish from teammate lists. Their data is kept, so re-enabling restores everything.
- **`/admin`** lists every user with an Enable/Disable button. Non-admins get a 404, so the page is not discoverable. Every action re-checks admin in the Data Access Layer.
- An admin cannot disable themselves or another admin.
- Roles for *tracking* stay gone: admin only gates `/admin`; it changes nothing about teams, check-ins or reads.

## Consequences

- Admin lives in data, so it needs no env var or redeploy to change.
- A disabled student's team pages remain readable by direct URL (their history is not erased); they just stop appearing as a teammate.
