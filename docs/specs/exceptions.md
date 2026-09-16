# Exceptions

**Status:** Approved
**Phase:** 2
**Routes:** dialog on `/today` and `/day/[date]`; listed on `/history`
**Rules:** [DATA_MODEL.md § exceptions](../DATA_MODEL.md#exceptions), [§ Excused](../DATA_MODEL.md#excused)

## Purpose

The contract allows for sickness, holidays and travel. An exception is the owner saying, in the open, "this day (or this goal) doesn't count, and here's why." Partners always see the reason. There is no silent skip.

## Roles

Owner: create, remove. Everyone: see.

## Scenarios

### EXC-01 Owner can open the dialog on any day
- **Given** the owner on `/today`, `/day/<past>`, or `/day/<future>`
- **Then** a **"Mark an exception"** button is present; non-owners never see it

### EXC-02 Whole-day exception
- **Given** the dialog opened from `/day/2026-09-24`
- **When** the owner keeps scope **"Whole day"**, dates 9/24–9/24, enters reason "Flu", and presses **"Save"**
- **Then** an `exceptions` row `(goal_id NULL, 2026-09-24, 2026-09-24, "Flu")` exists and every daily goal on 9/24 shows **"Excused — Flu"**

### EXC-03 Goal-specific exception over a range
- **Given** the dialog
- **When** the owner picks scope **"One goal"** → D1, dates 9/25–9/28, reason "Camping, no books"
- **Then** D1 is excused on each of 9/25–9/28 and other goals are unaffected

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

### EXC-06 Owner removes an exception
- **Given** an excused goal on a day view
- **When** the owner presses **"Remove exception"** next to the reason and confirms
- **Then** the row is deleted and the goal's status recomputes (pending/failed/done as the rules say)

### EXC-07 Done beats excused
- **Given** D1 is both completed and excused on 9/24
- **Then** it displays **"Done"**

### EXC-08 Exceptions are visible to everyone
- **Given** a viewer on `/day/2026-09-24`
- **Then** they see **"Excused — Flu"** on the affected goals, and on `/history` the month summary lists **"Sep 24 · Whole day · Flu"**

### EXC-09 Direct actions are owner-only
- **Given** a partner or viewer
- **When** they invoke create or remove exception directly
- **Then** rejected (ROLE-03)

## UI

Dialog (a sheet on phones): Scope (radio: Whole day / One goal + a `<select>` of active goals), From / To (native date inputs, both defaulting to the page's date), Reason (textarea, counter "0/280"), Save / Cancel. On a day view, each excused goal shows the reason inline; the owner additionally gets a small "Remove exception" link.

## Out of scope

Recurring exceptions (every Sunday), partner-approved exceptions, exception categories.
