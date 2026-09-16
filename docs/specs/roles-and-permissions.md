# Roles & permissions

**Status:** Approved
**Phase:** 1
**Routes:** all
**Rules:** [ARCHITECTURE.md § Authorization](../ARCHITECTURE.md#authorization-data-access-layer), [DATA_MODEL.md § user](../DATA_MODEL.md#managed-by-better-auth-shape-per-its-docs-at-implementation-time)

## Purpose

Three roles, enforced on the server, reflected in the UI. Partners are not just readers — they have their own job (the daily check-in). The owner is the only writer of tracker data. Viewers are everyone else with a Google account.

## Permission matrix

| Capability | viewer | partner | owner |
|---|---|---|---|
| Read `/today`, `/day/[date]`, `/goals`, `/contract`, `/history` | ✓ | ✓ | ✓ |
| See partners' check-ins and notes | ✓ | ✓ | ✓ |
| Create / update **own** check-in for today | | ✓ | |
| Create / edit / archive / delete goals | | | ✓ |
| Toggle completions (today or past) | | | ✓ |
| Create / remove exceptions | | | ✓ |
| Edit vision and contract documents | | | ✓ |
| Edit contract dates | | | ✓ |
| Read `/people`; change roles (viewer ⇄ partner) | | | ✓ |
| Change own role / assign owner | | | ✗ (nobody) |

## Phased test coverage

The permission *pattern* (owner-only Server Actions reject viewer/partner; owner-only pages 404) ships in Phase 1 and is exercised end-to-end against the one owner-only action that exists then: `setRole` on `/people`. ROLE-04 needs the partner check-in action (Phase 3); the goal/completion/exception/document parts of ROLE-03 and ROLE-05 need those actions (Phase 2/3). Each gets its own test the phase that builds it — this spec's scenario IDs don't move.

## Scenarios

### ROLE-01 Viewers can read everything
- **Given** a signed-in viewer
- **When** they open `/today`, `/day/2026-09-19`, `/goals`, `/contract`, `/history`
- **Then** each page renders with tracker data and no write controls

### ROLE-02 Owner-only pages are not found for others
- **Given** a signed-in viewer or partner
- **When** they open `/people`
- **Then** the response is a 404 page

### ROLE-03 Write actions are rejected server-side regardless of the UI
- **Given** a signed-in viewer
- **When** any owner Server Action (e.g. toggle completion, save goal, save document, set role) is invoked directly
- **Then** it throws `Forbidden` and nothing is written
- **And** the same holds for a partner invoking an owner action

### ROLE-04 Partners can only write their own check-in
- **Given** a signed-in partner
- **When** they create or update a check-in for today
- **Then** it succeeds for their own user id
- **And when** they attempt a check-in with another user's id, or for a date other than today
- **Then** it is rejected and nothing is written

### ROLE-05 The owner can do everything in the matrix
- **Given** the signed-in owner
- **Then** every owner action succeeds and `/people` renders

### ROLE-06 Exactly one owner, and it can't be changed in-app
- **Given** the owner
- **When** they view `/people`
- **Then** their own row shows **"Owner (you)"** with no role control
- **And when** a set-role action is invoked with target role `owner`, or targeting the owner's own user
- **Then** it is rejected

### ROLE-07 Role changes take effect immediately
- **Given** a viewer whose role the owner changes to partner
- **When** the viewer loads any page next
- **Then** they see partner capabilities (e.g. the check-in button) without signing out and in

### ROLE-08 The UI reflects the role
- **Given** each role in turn
- **Then** the primary navigation shows **Today · Goals · Contract · History** for everyone and **People** only for the owner; write controls (checkboxes, "Add goal", "Edit", "Mark an exception") render only for the owner; **"I checked today"** renders only for partners

## UI

Role labels in the user menu: "Owner", "Partner", "Viewer". No other role UI exists outside `/people`.

## Out of scope

Custom roles, per-goal permissions, multiple owners, invitations.
