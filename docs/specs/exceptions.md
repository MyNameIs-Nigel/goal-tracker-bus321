# Exceptions

**Status:** Approved (revised for teams by [ADR-0005](../adr/0005-every-student-owns-a-team.md))
**Phase:** 2, revised in 5
**Routes:** dialog on `/today` and `/day/[date]`; shown on every team's day and history pages
**Rules:** [DATA_MODEL.md § exceptions](../DATA_MODEL.md#exceptions), [§ Excused](../DATA_MODEL.md#excused)

## Purpose

A contract allows for sickness, holidays and travel. An exception is a student saying, in the open, "this day (or this goal) doesn't count, and here's why." Their partners always see the reason. There is no silent skip.

## Action interface

`lib/actions/exceptions.ts`, both starting with `requireUser()`:

- `createException(input)` — always creates on the caller's own team. For scope **"One goal"**, the goal must be one of the caller's own goals; anything else is **"Choose a goal."** and nothing is written.
- `removeException(id)` — deletes only an exception of the caller's own team; any other id is **"Exception not found."** and nothing is deleted.

## Scenarios

### EXC-01 You can open the dialog on any of your own days
- **Given** a student on `/today`, `/day/<past>`, or `/day/<future>`
- **Then** a **"Mark an exception"** button is present; a teammate's pages never show it

### EXC-02 Whole-day exception
- **Given** the dialog opened from `/day/2026-09-24`
- **When** the student keeps scope **"Whole day"**, dates 9/24–9/24, enters reason "Flu", and presses **"Save"**
- **Then** an `exceptions` row `(their team, goal_id NULL, 2026-09-24, 2026-09-24, "Flu")` exists and every daily goal on 9/24 shows **"Excused — Flu"**

### EXC-03 Goal-specific exception over a range
- **Given** the dialog
- **When** the student picks scope **"One goal"** → D1, dates 9/25–9/28, reason "Camping, no books"
- **Then** D1 is excused on each of 9/25–9/28 and their other goals are unaffected

### EXC-04 Coverage rules for weekly and monthly goals
- **Given** a whole-day exception 9/22–9/22
- **Then** W1 for the week of 9/21 is **not** excused, M1 for September is **not** excused
- **Given** a whole-day exception 9/21–9/27
- **Then** W1 for the week of 9/21 **is** excused
- **Given** a goal-specific exception for W1 on 9/22–9/22
- **Then** W1 for the week of 9/21 **is** excused (overlap suffices for goal-specific)

### EXC-05 Validation
- **When** the reason is empty → **"A reason is required"**; longer than 280 → **"Keep the reason under 280 characters"**; end before start → **"End date can't be before start date"**; range longer than 31 days → **"Exceptions can cover at most 31 days"**
- **Then** nothing is saved

### EXC-06 Remove an exception
- **Given** an excused goal on one of your own day views
- **When** you press **"Remove exception"** next to the reason and confirm
- **Then** the row is deleted and the goal's status recomputes (pending/failed/done as the rules say)

### EXC-07 Done beats excused
- **Given** D1 is both completed and excused on 9/24
- **Then** it displays **"Done"**

### EXC-08 Exceptions are visible to every partner
- **Given** Avery marked 9/24 whole-day "Flu"
- **When** Blake opens Avery's `/team/<id>/day/2026-09-24`
- **Then** he sees **"Excused — Flu"** on the affected goals and no "Remove exception" control, and Avery's history month summary lists **"Sep 24 · Whole day · Flu"**

### EXC-09 Only on your own team
- **Given** Blake, and an exception and a goal of Avery's
- **When** Blake invokes remove exception with Avery's exception id, or create a goal-specific exception with Avery's goal id
- **Then** it is rejected (**"Exception not found."** / **"Choose a goal."**) and nothing is written ([teams.md TEAM-06](teams.md))

## UI

Dialog (a sheet on phones): Scope (radio: Whole day / One goal + a `<select>` of active goals), From / To (native date inputs, both defaulting to the page's date), Reason (textarea, counter "0/280"), Save / Cancel. On a day view, each excused goal shows the reason inline; on your own day views you additionally get a small "Remove exception" link.

## Out of scope

Recurring exceptions (every Sunday), partner-approved exceptions, exception categories.
