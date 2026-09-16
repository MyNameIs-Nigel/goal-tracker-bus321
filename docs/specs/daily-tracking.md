# Daily tracking

**Status:** Approved
**Phase:** 2
**Routes:** `/today`, `/day/[YYYY-MM-DD]`
**Rules:** [DATA_MODEL.md § Derived rules](../DATA_MODEL.md#derived-rules) — periods, counting, status, day status, streak, contract day

## Purpose

The page everyone opens. It answers, in one glance: what was Nigel supposed to do today, what has he done, how's the streak, how many failures this month, and have the partners checked. `/today` *is* `/day/<today>`; the owner can open any past date and edit it (decision C5).

## Roles

Owner: toggle completions for dates ≤ today; open the exception dialog (see [exceptions.md](exceptions.md)). Partner: read + check-in section (see [partner-check-ins.md](partner-check-ins.md)). Viewer: read.

## Phased test coverage

This spec's page (`/today`, `/day/[date]`) is built in full this phase, except the **Accountability partners** section it lists (DT-16): that section's actual content — who's checked in, the button, the note — is [partner-check-ins.md](partner-check-ins.md), which doesn't ship until Phase 3. DT-16 is deferred with it; the day pages simply have no partner section until then. Exceptions (`excused` status, EXC-*) ship in this phase's third PR, alongside this one.

## Scenarios

### DT-01 The header names the day and the contract day
- **Given** today = Wednesday 2026-09-23, `contract_start = 2026-09-19`, `contract_end = 2026-12-18`
- **When** anyone opens `/today`
- **Then** the header shows **"Wednesday, September 23"** and **"Day 5 of 91"**
- **Given** instead `contract_end` is null → **"Day 5"**
- **Given** today = 2026-09-16 (before the start) → **"Contract starts in 3 days"**
- **Given** today = 2026-12-20 (after the end) → **"Contract ended December 18"**

### DT-02 Active goals are grouped by what's due
- **Given** today = Wednesday 2026-09-23; daily goals D1, D2; weekly goal W1; monthly goal M1; all active
- **When** anyone opens `/today`
- **Then** section **"Today"** lists D1, D2; section **"This week"** lists W1 with **"due Sunday, Sep 27"**; section **"This month"** lists M1 with **"due Wednesday, Sep 30"**

### DT-03 Owner checks off a daily goal
- **Given** the owner on `/today`, D1 pending
- **When** they tap D1's checkbox
- **Then** D1 shows as done immediately, a `completions` row `(D1, today)` exists, and it is still done after a reload
- **And when** they tap again
- **Then** the row is deleted and D1 is pending

### DT-04 Owner checks off a weekly or monthly goal from today
- **Given** today = 2026-09-23
- **When** the owner checks W1
- **Then** the completion has `period_start = 2026-09-21` (that week's Monday); for M1, `period_start = 2026-09-01`

### DT-05 Owner edits a past day
- **Given** today = 2026-09-23
- **When** the owner opens `/day/2026-09-21`
- **Then** the page shows Monday, September 21 with a banner **"Editing a past day"**, and toggling D1 writes `(D1, 2026-09-21)`

### DT-06 Future days are read-only for completions
- **Given** today = 2026-09-23
- **When** the owner opens `/day/2026-09-25`
- **Then** goals show as **upcoming** with no checkboxes; the **"Mark an exception"** control is still present (EXC-01)
- **And** a direct toggle for a future date is rejected

### DT-07 Non-owners see statuses, not controls
- **Given** a partner or viewer on `/today` or `/day/2026-09-21`
- **Then** each goal shows its status icon and text and there are no checkboxes; a direct toggle is rejected (ROLE-03)

### DT-08 Invalid dates are not found
- **When** anyone opens `/day/2026-13-45` or `/day/hello`
- **Then** 404

### DT-09 Statuses render distinctly
- **Given** on 2026-09-22 (a past day): D1 done, D2 excused with reason "Sick", D3 failed
- **When** anyone opens `/day/2026-09-22`
- **Then** D1 shows a filled accent check and **"Done"**; D2 shows **"Excused — Sick"**; D3 shows **"Missed"**
- **Given** a goal that is active but not counting (before the contract start)
- **Then** it shows **"Not counting yet"**

### DT-10 Progress line
- **Given** today has 5 counting daily goals, 3 done
- **Then** the Today section header reads **"3 of 5 done"**; with all 5 done, **"All done"**

### DT-11 Streak
- **Given** day statuses: 9/19 clean, 9/20 clean, 9/21 excused, 9/22 clean, today 9/23 open
- **Then** the page shows **"3-day streak"** (excused day is neutral)
- **Given** 9/22 was missed → **"No streak yet"** (and after the first clean day: "1-day streak")

### DT-12 Failures this month
- **Given** in September: D3 failed on 9/20 and 9/22; W1 has no ended period yet
- **Then** the page shows **"2 failures in September"**; with none, **"0 failures in September"**

### DT-13 The day boundary is America/Denver
- **Given** the fixed clock is `2026-09-23T05:59:00Z` (23:59 on 9/22 in Denver)
- **Then** `/today` is September 22
- **Given** `2026-09-23T06:00:00Z` (00:00 on 9/23 in Denver)
- **Then** `/today` is September 23

### DT-14 Navigating days
- **Given** `/day/2026-09-21`
- **Then** there are **"← Sep 20"** and **"Sep 22 →"** links, and a **"Today"** link; the forward link is absent when the day is today

### DT-15 Empty state
- **Given** no active goals
- **When** the owner opens `/today`
- **Then** it reads **"No goals yet."** with a link to `/goals`; others read **"<Owner first name> hasn't added goals yet."**

### DT-16 Partner section is present
- **Given** any role on `/today`
- **Then** an **"Accountability partners"** section renders per [partner-check-ins.md](partner-check-ins.md)

## UI

- Order top to bottom: day header (date, contract day, prev/next), streak + failures line, **Today** list, **This week**, **This month**, **Accountability partners**, and for the owner a **"Mark an exception"** button after the goal lists.
- A goal row is ≥ 48px tall; the whole row toggles for the owner (not just the 20px box).
- Done rows use the accent; everything else is neutral. Excused rows show the reason inline in muted text.
- Optimistic updates with a quiet inline error ("Couldn't save — tap to retry") if the action fails.

## Out of scope

Editing goals from this page, comments on individual goals, charts.
