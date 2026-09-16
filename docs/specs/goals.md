# Goals

**Status:** Approved
**Phase:** 2
**Routes:** `/goals`
**Rules:** [DATA_MODEL.md § goals](../DATA_MODEL.md#goals), [§ Active vs. counting](../DATA_MODEL.md#active-vs-counting)

## Purpose

The owner defines what they're being held to: simple text goals at a daily, weekly, or monthly cadence. Everyone else reads the list to know what "done" means.

## Roles

Owner: full CRUD, reorder, archive. Partner / viewer: read.

## Scenarios

### GOAL-01 Goals are listed by cadence
- **Given** active goals: two daily, one weekly, one monthly; and one archived goal
- **When** anyone opens `/goals`
- **Then** three sections **"Daily"**, **"Weekly"**, **"Monthly"** list the active goals in `sort_order`, each with title and description; a collapsed **"Archived (1)"** section lists the archived one

### GOAL-02 Owner adds a goal
- **Given** the owner on `/goals`
- **When** they press **"Add goal"**, enter title "Read 20 pages", description "Any book, before bed", cadence Daily, start date left at its default (today), and press **"Save"**
- **Then** the goal appears under Daily and a `goals` row exists with `starts_on = today`, `ends_on = NULL`

### GOAL-03 Title is required and bounded
- **Given** the add/edit form
- **When** the title is empty, or longer than 120 characters, or the description exceeds 500
- **Then** an inline error is shown (**"Title is required"**, **"Keep the title under 120 characters"**, **"Keep the description under 500 characters"**) and nothing is saved

### GOAL-04 Owner edits a goal
- **Given** an existing goal
- **When** the owner presses **"Edit"** on it, changes the title and description, and saves
- **Then** the list shows the new text and `updated_at` advances

### GOAL-05 Cadence is locked after the first completion
- **Given** a goal with at least one completion
- **When** the owner opens its edit form
- **Then** the cadence control is disabled with the hint **"Cadence can't change once you've checked this off. Archive it and create a new goal."**
- **And** a direct save with a different cadence is rejected

### GOAL-06 Owner changes the start date
- **Given** a daily goal with `starts_on = 2026-09-22`
- **When** the owner edits `starts_on` to `2026-09-19`
- **Then** the goal now counts from 9/19 and any of 9/19–9/21 without a completion or exception are failures (consequence of C5; see DATA_MODEL)

### GOAL-07 Archive removes a goal from today
- **Given** an active goal and today = 2026-09-25
- **When** the owner presses **"Archive"**
- **Then** `ends_on = 2026-09-24`, the goal moves to the Archived section, and `/today` no longer lists it

### GOAL-08 Unarchive
- **Given** an archived goal
- **When** the owner presses **"Restore"** in the Archived section
- **Then** `ends_on = NULL` and the goal is active again

### GOAL-09 Delete only when nothing has been recorded
- **Given** a goal with no completions
- **Then** its edit form offers **"Delete"**, and confirming removes the goal and any exceptions tied to it
- **Given** a goal with a completion
- **Then** there is no Delete control, and a direct delete action is rejected

### GOAL-10 Reorder within a cadence
- **Given** daily goals A, B, C in that order
- **When** the owner presses "Move up" on C
- **Then** the order is A, C, B, persisted in `sort_order`, and `/today` uses the same order

### GOAL-11 Non-owners see no controls and can't write
- **Given** a partner or viewer on `/goals`
- **Then** there is no "Add goal", "Edit", "Archive", "Restore" or reorder control
- **And** direct create/update/archive/delete actions are rejected (ROLE-03)

### GOAL-12 Empty state
- **Given** no goals
- **When** the owner opens `/goals`
- **Then** it reads **"No goals yet."** with the **"Add goal"** button
- **When** anyone else opens it
- **Then** it reads **"<Owner first name> hasn't added goals yet."**

## UI

- Each goal is one row: title (medium weight), description (muted, one or two lines), and for the owner a row of small text actions (Edit · Move up · Move down · Archive), always visible rather than tucked behind a menu — there are at most a handful of goals, so there's nothing to hide.
- Add/Edit is an inline form (or a sheet on phones): Title, Description (textarea), Cadence (three radio pills: Daily / Weekly / Monthly), Start date (native `<input type="date">`), Save / Cancel.
- Archive and Delete confirm with a one-line native `confirm()`-style dialog; nothing fancy.

## Out of scope

Targets per period (e.g. "3× per week"), categories, goal-level notes, drag-and-drop reordering.
