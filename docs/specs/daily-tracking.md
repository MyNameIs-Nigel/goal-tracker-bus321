# Daily tracking

**Status:** Approved (revised for teams by [ADR-0005](../adr/0005-every-student-owns-a-team.md))
**Phase:** 2, revised in 5
**Routes:** `/today`, `/day/[YYYY-MM-DD]` (your team); `/team/[teamId]`, `/team/[teamId]/day/[YYYY-MM-DD]` (a teammate's)
**Rules:** [DATA_MODEL.md § Derived rules](../DATA_MODEL.md#derived-rules) — periods, counting, status, day status, streak, contract day, teammate summary

## Purpose

The page everyone opens, and the only page most days need. `/today` answers, in one glance and from top to bottom: what am **I** supposed to do today and what's done; how are **my teammates** doing, and have I checked in on them; and who has **checked on me**. Signing in lands here; ticking your goals and checking in on every teammate happens here, one tap each, without navigating.

A day page shows one team's day. `/today` is `/day/<today>` for your own team, which you can edit for any past date (decision C5). `/team/<id>` is the same page for a teammate's team, read-only.

## Scenarios

### DT-01 The header names the day and the contract day
- **Given** today = Wednesday 2026-09-23, the team's `contract_start = 2026-09-19`, `contract_end = 2026-12-18`
- **When** its owner opens `/today` (or a teammate opens `/team/<id>`)
- **Then** the header shows **"Wednesday, September 23"** and **"Day 5 of 91"**
- **Given** instead `contract_end` is null → **"Day 5"**
- **Given** today = 2026-09-16 (before the start) → **"Contract starts in 3 days"**
- **Given** today = 2026-12-20 (after the end) → **"Contract ended December 18"**

### DT-02 Active goals are grouped by what's due
- **Given** today = Wednesday 2026-09-23; daily goals D1, D2; weekly goal W1; monthly goal M1; all active
- **When** their owner opens `/today`
- **Then** section **"Today"** lists D1, D2; section **"This week"** lists W1 with **"due Sunday, Sep 27"**; section **"This month"** lists M1 with **"due Wednesday, Sep 30"**

### DT-03 Check off a daily goal
- **Given** a student on `/today`, their goal D1 pending
- **When** they tap D1's row
- **Then** D1 shows as done immediately, a `completions` row `(D1, today)` exists, and it is still done after a reload
- **And when** they tap again
- **Then** the row is deleted and D1 is pending

### DT-04 Check off a weekly or monthly goal from today
- **Given** today = 2026-09-23
- **When** the student checks W1
- **Then** the completion has `period_start = 2026-09-21` (that week's Monday); for M1, `period_start = 2026-09-01`

### DT-05 Edit a past day
- **Given** today = 2026-09-23
- **When** a student opens `/day/2026-09-21`
- **Then** the page shows Monday, September 21 with a banner **"Editing a past day"**, and toggling D1 writes `(D1, 2026-09-21)`

### DT-06 Future days are read-only for completions
- **Given** today = 2026-09-23
- **When** a student opens `/day/2026-09-25`
- **Then** goals show as **upcoming** with no checkboxes; the **"Mark an exception"** control is still present (EXC-01)
- **And** a direct toggle for a future date is rejected

### DT-07 A teammate's day is read-only
- **Given** Blake on Avery's `/team/<id>` or `/team/<id>/day/2026-09-21`
- **Then** each of Avery's goals shows its status icon and text and there are no checkboxes; a direct toggle is rejected ([teams.md TEAM-06](teams.md))

### DT-08 Invalid dates are not found
- **When** anyone opens `/day/2026-13-45`, `/day/hello` or `/team/<id>/day/hello`
- **Then** 404

### DT-09 Statuses render distinctly
- **Given** on 2026-09-22 (a past day): D1 done, D2 excused with reason "Sick", D3 failed
- **When** anyone opens that team's day page for 2026-09-22
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
- **Given** a teammate's `/team/<id>/day/2026-09-21`
- **Then** the same three links stay on that team: `/team/<id>/day/2026-09-20`, `/team/<id>/day/2026-09-22`, `/team/<id>`

### DT-15 Empty state — your first goal is one line away
- **Given** a student with no active goals
- **When** they open `/today`
- **Then** it reads **"No goals yet."** with a one-line form: a field labelled **"Your first daily goal"** and an **"Add"** button
- **And when** they type "Read 20 pages" and press Add
- **Then** "Read 20 pages" appears under **Today** as pending, without leaving `/today`, as a daily goal starting today
- **Given** a teammate with no active goals
- **When** anyone opens their `/team/<id>`
- **Then** it reads **"<First name> hasn't added goals yet."**

### DT-16 `/today` is your day, then your teammates, then who checked on you
- **Given** any student on `/today`
- **Then** top to bottom the page is: the day header; **your** goal sections (Today, This week, This month) and "Mark an exception"; **"Your teammates"** ([partner-check-ins.md](partner-check-ins.md) PCI-01); **"Checked on you"** (PCI-10)
- **Given** a teammate's `/team/<id>` or any `/day/<date>` that isn't today
- **Then** there is no "Your teammates" section; the check-ins section for the team shown is last (PCI-11)

### DT-17 The daily routine never leaves `/today`
- **Given** Avery, already signed in, with two daily goals, and teammates Blake and Casey
- **When** she opens the app, taps both goals and taps **"Check in"** on both teammates
- **Then** every one of those was a single tap on `/today`, with no navigation and no dialog, and after a reload the Today section reads **"All done"** and **"Your teammates"** reads **"2 of 2 checked"**

## UI

- Order top to bottom per DT-16. A goal row is ≥ 48px tall; the whole row toggles for its owner (not just the 20px box).
- Done rows use the accent; everything else is neutral. Excused rows show the reason inline in muted text.
- Optimistic updates with a quiet inline error ("Couldn't save — tap to retry") if the action fails.
- On team pages the team label ([teams.md TEAM-09](teams.md)) sits above the date heading.

## Out of scope

Editing goals from this page (beyond adding the first one), comments on individual goals, charts.
