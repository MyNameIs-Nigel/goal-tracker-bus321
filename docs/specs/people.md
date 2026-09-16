# People

**Status:** Approved
**Phase:** 1
**Routes:** `/people` (owner only)
**Rules:** [roles-and-permissions.md](roles-and-permissions.md), [DATA_MODEL.md § user](../DATA_MODEL.md#managed-by-better-auth-shape-per-its-docs-at-implementation-time)

## Purpose

Everyone who has ever signed in appears here; the owner turns classmates into partners with one control. This is the whole of user management.

## Roles

Owner only. Everyone else: 404 (ROLE-02).

## Scenarios

### PPL-01 Every signed-in user is listed
- **Given** users: the owner, one partner, two viewers
- **When** the owner opens `/people`
- **Then** four rows show avatar (or initials), name, email, role, and "Joined <Mon D>" — ordered owner first, then partners, then viewers, alphabetically by name within a group

### PPL-02 Promote a viewer to partner
- **Given** a viewer row
- **When** the owner changes its role control to **"Partner"**
- **Then** the row shows "Partner", a toast says **"<Name> is now a partner"**, and the database role is `partner` — without a full page reload

### PPL-03 Demote a partner to viewer
- **Given** a partner row
- **When** the owner changes its role control to **"Viewer"**
- **Then** the row shows "Viewer" and the database role is `viewer`; their existing check-ins remain in history

### PPL-04 The owner's own row is fixed
- **Given** the owner's row
- **Then** it shows **"Owner (you)"** and no control (ROLE-06)

### PPL-05 Not found for non-owners
- **Given** a partner or viewer
- **When** they request `/people`
- **Then** 404

### PPL-06 Empty state invites sharing
- **Given** only the owner has signed in
- **When** they open `/people`
- **Then** below their own row: **"No one else has signed in yet. Share the link:"** followed by the app URL and a **"Copy link"** button

### PPL-07 Partner count is visible
- **Given** two partners
- **Then** the page heading area reads **"2 partners"** (singular/plural correct: "1 partner")

## UI

A simple list, not a table, on phones: avatar left, name and email stacked, role control right (a native `<select>` with Viewer / Partner). Desktop: the same rows, wider. Changes save on selection; no "Save" button.

## Out of scope

Removing users, blocking, inviting by email, activity stats beyond "Joined".
