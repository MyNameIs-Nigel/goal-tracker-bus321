# Teams

**Status:** Approved
**Phase:** 5
**Routes:** all; team pages `/team/[teamId]`, `/team/[teamId]/day/[date]`, `/team/[teamId]/contract`, `/team/[teamId]/history`
**Rules:** [ADR-0005](../adr/0005-every-student-owns-a-team.md), [DATA_MODEL.md § teams](../DATA_MODEL.md#teams), [§ Partners](../DATA_MODEL.md#partners), [ARCHITECTURE.md § Authorization](../ARCHITECTURE.md#authorization-data-access-layer)

## Purpose

Every student who signs in owns a team — **Team Avery**, **Team Blake** — and every other student is instantly a partner on it. Three students means three teams with two partners each. Nobody sets anything up, promotes anyone, or waits for anyone. This spec is the ownership model: what you can read, what you can write, and where each team's pages live.

## Permission matrix

"Your team" is the team you own. "A teammate's team" is any other student's.

| Capability | your team | a teammate's team |
|---|---|---|
| Read the day pages, contract and history | ✓ `/today`, `/day/[date]`, `/contract`, `/history` | ✓ `/team/[id]`, `/team/[id]/day/[date]`, `/team/[id]/contract`, `/team/[id]/history` |
| See check-ins and notes | ✓ | ✓ |
| Create / edit / archive / reorder / delete goals | ✓ `/goals` | |
| Toggle completions (today or past) | ✓ | |
| Create / remove exceptions | ✓ | |
| Edit the vision, the contract and the contract dates | ✓ | |
| Check in (today) and leave a note | | ✓ as yourself |

Nothing in the app changes who is a partner: every student is a partner of every other team, always.

## Scenarios

### TEAM-01 Signing in gives you a team
- **Given** Dana has never signed in
- **When** she signs in for the first time
- **Then** she lands on `/today`, which is her own (empty) day, and the user menu reads **"Team Dana"**

### TEAM-02 Every other student is your partner, instantly
- **Given** students Avery, Blake and Casey
- **When** Avery opens `/today`
- **Then** **"Your teammates"** lists Blake and Casey — and not Avery
- **And when** Dana signs in for the first time and Avery reloads `/today`
- **Then** it lists Blake, Casey and Dana, with no one having promoted anyone

### TEAM-03 Every student reads every team
- **Given** Blake is signed in and Avery has a goal
- **When** he opens Avery's `/team/<id>`, `/team/<id>/day/2026-09-19`, `/team/<id>/contract` and `/team/<id>/history`
- **Then** each page renders Avery's data, with no checkbox, no **"Mark an exception"**, no **"Edit"** and no **"Edit dates"**

### TEAM-04 Your own team's pages are your own routes
- **Given** Avery is signed in
- **When** she opens `/team/<her own team id>` (or its `/day/<date>`, `/contract`, `/history`)
- **Then** she is redirected to `/today` (or `/day/<date>`, `/contract`, `/history`)

### TEAM-05 An unknown team is not found
- **When** anyone opens `/team/not-a-team` or `/team/<a well-formed id no team has>`
- **Then** 404

### TEAM-06 You only ever write your own team
- **Given** Blake is signed in and Avery has a goal and an exception
- **When** any write action — toggle completion, update, archive, restore, move or delete a goal, remove an exception, or create a goal-specific exception — is invoked directly with Avery's goal or exception id
- **Then** it is rejected — the id is treated as one that doesn't exist (**"Goal not found."**, **"Exception not found."**, or **"Choose a goal."** from the exception dialog's action) — and nothing is written
- **And** actions that create or save (add a goal, mark a whole-day exception, save a document, save the contract dates) take no team id at all: they always write the caller's own team

### TEAM-07 You never check in on your own team
- **Given** Avery on any of her own pages
- **Then** there is no **"Check in"** control for her own team
- **And when** a check-in or note is invoked directly for her own team
- **Then** it throws `Forbidden` and nothing is written

### TEAM-08 One navigation for everyone
- **Given** any student
- **Then** the primary navigation reads **Today · Goals · Contract · History**, each pointing at their own team; there is no People page, and `/people` is a 404

### TEAM-09 A teammate's pages say whose they are
- **Given** Avery on any of Blake's team pages
- **Then** the page is labelled **"Team Blake"** with a navigation (`aria-label="Team Blake"`) of **Today · Contract · History** for Blake's team

## UI

- The team label sits above the page's own heading on every team page, in the muted small caps used for section headings; its three links use `ui-hover-accent`. The current one is marked `aria-current="page"`.
- Team ids appear only in URLs. People are always shown by name and avatar.

## Out of scope

Classes or cohorts, choosing partners, leaving or deleting a team, renaming a team, removing a student, invitations, per-team privacy.
