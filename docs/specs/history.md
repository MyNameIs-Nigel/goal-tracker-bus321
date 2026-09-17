# History

**Status:** Approved
**Phase:** 3 (may slip past 9/19 — see [PHASES.md § MVP line](../PHASES.md#mvp-line))
**Routes:** `/history`, `/history?month=YYYY-MM`
**Rules:** [DATA_MODEL.md § Day status](../DATA_MODEL.md#day-status-daily-goals-only-drives-the-history-calendar-and-the-streak), [§ Status of (G, P)](../DATA_MODEL.md#status-of-g-p), [§ Partner "checked today"](../DATA_MODEL.md#partner-checked-today)

## Purpose

The month at a glance: which days were clean, missed, or excused; what failed; who checked in. Every day links to its day page.

## Roles

Everyone reads the same thing. Nothing is written from this page.

## Definitions

All pure, in `lib/view/history.ts`, over the same rows the day pages use ([DATA_MODEL.md § Derived rules](../DATA_MODEL.md#derived-rules)):

- **Month** `M` is `?month=YYYY-MM`, defaulting to today's month; anything unparsable (HIST-08) is today's month. `/history` never lists days of another month.
- **Calendar cell status** is the day status (`none` / `upcoming` / `clean` / `excused` / `missed` / `open`). The accessible label is `"<Month> <D>, <status>"` with `none` spelled **not counting** (e.g. `"September 1, not counting"`, `"September 24, upcoming"`). The legend shows the five visual states **Clean · Missed · Excused · Open · Not counting**; `upcoming` looks like not counting.
- **Failures in `M`** are the `(G, P)` with status `failed` whose `P.start` is in `M` (the same count `/today` shows). Listed as **"Sep 20 · <title>"** (daily), **"Week of Sep 21 · <title>"** (weekly), **"September · <title>"** (monthly).
- **Exceptions in `M`** are the exception rows overlapping `M`, listed as **"Sep 21 · Whole day · Flu"** or **"Sep 25 – Sep 28 · <goal title> · <reason>"** (one date when `starts_on = ends_on`).
- **Completion rate** = `done / (done + failed)` over the counting `(G, P)` with `P.start` in `M` and `P.end < today` — excused periods are in neither number. Shown as **"82% complete"** (rounded), or **"Nothing counted yet"** when the denominator is 0.
- **Weekly & monthly** lists every `(G, P)` for weekly/monthly goals whose `P.start` is in `M` and whose lifespan overlaps `P` (the same goals a day page in that period would show), labelled **Done / Missed / Excused / Pending / Upcoming / Not counting**. Absent when there are no such goals.
- **Partner month:** *M* = elapsed days of the month — through today for the current month, all of it for a past month, 0 for a future one — and *N* = that partner's check-ins on those days. Everyone with role `partner` is listed, plus anyone who has a check-in in `M` (a demoted partner's record stays, [people.md PPL-03](people.md)). The strip has one marker per day of the month: checked, not checked, or not yet.
- **Month navigation:** **"← <Month>"** is offered when the previous month is not before the month of `contract_start` (always, when no start is set); **"<Month> →"** when the next month is not after today's month.

## Scenarios

### HIST-01 The calendar shows day statuses
- **Given** September 2026 with statuses 9/19 clean, 9/20 missed, 9/21 excused, 9/22 clean, today 9/23 open, 9/24+ upcoming, 9/1–9/18 none
- **When** anyone opens `/history`
- **Then** a Mon–Sun grid for September shows each day with a visual status and an accessible label (e.g. `aria-label="September 20, missed"`), and a legend **Clean · Missed · Excused · Open · Not counting**

### HIST-02 Month navigation
- **Given** `contract_start = 2026-09-19` and today = 2026-10-05
- **Then** `/history` defaults to October; **"← September"** is available; **"November →"** is not; navigating earlier than September is not offered

### HIST-03 Days link to day pages
- **When** the user taps 9/20
- **Then** they are on `/day/2026-09-20`

### HIST-04 Month summary
- **Given** September: 2 failures (D3 on 9/20, W1 for the week of 9/21), 1 exception (9/21 whole day, "Flu"), completion rate 9 of 11 counting past periods
- **Then** the summary shows **"2 failures"** with the list **"Sep 20 · Read 20 pages"** and **"Week of Sep 21 · Gym"**, **"1 exception"** with **"Sep 21 · Whole day · Flu"**, and **"82% complete"**

### HIST-05 Weekly and monthly goals table
- **Given** W1 and M1 in September
- **Then** a section **"Weekly & monthly"** lists each period in the month with its status (Done / Missed / Excused / Pending / Not counting)

### HIST-06 Partner check-ins for the month
- **Given** partners Alice (12 of 15 days) and Bob (15 of 15)
- **Then** the **"Partners"** block shows each with **"N of M days"** and a day strip (PCI-09); with no partners it reads **"No partners yet."**

### HIST-07 Fits a phone
- **Given** a 375px-wide viewport
- **Then** the calendar and every block render with no horizontal scrolling (`scrollWidth <= innerWidth`)

### HIST-08 Invalid month
- **When** `?month=2026-13` or `?month=abc`
- **Then** the page falls back to the current month

## UI

Calendar cells: date number and a status dot/fill; today outlined. Below: summary cards in a single column on phones, two columns on desktop. No charts. The page is a Server Component — nothing here is interactive beyond links.

## Out of scope

Year view, export, per-goal trend lines.
