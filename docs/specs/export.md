# Export

**Status:** Approved (Nigel, 2026-09-29: printable report saved as PDF, plus a CSV; contract range by default or a custom one; only your own team; check-ins you made are optional)
**Phase:** after 5
**Routes:** `/export?from=YYYY-MM-DD&to=YYYY-MM-DD&given=1` (the report), `/export/csv?…` (same parameters, a CSV download)
**Rules:** [DATA_MODEL.md § Status of (G, P)](../DATA_MODEL.md#status-of-g-p), [§ Day status](../DATA_MODEL.md#day-status-daily-goals-only-drives-the-history-calendar-and-the-streak), [§ Partners](../DATA_MODEL.md#partners); [history.md § Definitions](history.md#definitions)

## Purpose

Turning in the BUS 321 accountability report should take one tap. `/export` is the student's whole record for a date range — vision, contract, goals, a day-by-day log, failures, exceptions, and who checked in — laid out as a clean document that the browser saves as a PDF, plus the same data as a CSV for a spreadsheet. It serves only the signed-in student's own team.

## Roles

Every student exports **their own** team and nothing else. Neither route takes a team id; both read the session's team from `requireUser()`. Nothing is written.

## Definitions

All pure, in `lib/view/export.ts`, over the same rows the day and history pages use:

- **Range** `[from, to]`, inclusive calendar dates, from `?from=` and `?to=`:
  - **Default `from`** is the team's `contract_start`; with no start, the earliest `starts_on` of the team's goals; with no goals, today.
  - **Default `to`** is the team's `contract_end`; with no end, today. If that lands before `from`, `to = from`.
  - A parameter that isn't a real calendar date (`isValidCalendarDate`) is ignored and takes its default. If `from > to` the two are swapped. A range longer than **366 days** is cut to `from + 365`.
- **Periods in range** are every `(G, P)` whose `P.start` is in the range and whose lifespan overlaps `P` (the same goals a day page in that period shows), with its status from [§ Status of (G, P)](../DATA_MODEL.md#status-of-g-p) labelled **Done / Missed / Excused / Pending / Upcoming / Not counting**.
- **Summary:** **completion** = `done / (done + failed)` over the counting periods in range with `P.end < today` (history's rule), shown as **"82% complete"** or **"Nothing counted yet"**; **failures** = periods in range with status `failed`; **exceptions** = the team's exceptions overlapping the range; **longest streak** = the longest run of `clean` days from `from` to `min(to, today)`, where `excused` days are neutral and any other day status ends a run ([§ Streak](../DATA_MODEL.md#streak)'s rule, run forwards).
- **Daily log:** one row per date in the range, grouped under a month heading (**"September 2026"**). Each column is a daily goal active on some date in the range; a cell is the goal's status that day — **✓** Done, **✗** Missed, **E** Excused, **·** Pending, blank for Upcoming, **–** Not counting, and empty when the goal isn't active that day. A row outside the contract (before `contract_start` or after `contract_end`) is grayed and marked **"Outside contract"**, as on the history calendar (HIST-09). The last column lists the first names of the partners who checked in on that date.
- **Check-ins from partners:** every check-in on the team dated in the range, grouped by the partner who made it (current partners with none are listed with **"0 days"**), each group **"Blake Brown — 12 days"** followed by its dates and notes (**"Sep 22 — Nice work on the reading"**, or just the date without a note).
- **Check-ins you made** (only with `given=1`): every check-in the student made in the range, grouped by team (**"Team Blake — 5 days"**), dates and notes the same way.
- **CSV:** RFC 4180 — comma-separated, `\r\n` line endings, a field quoted when it contains a comma, quote or newline, quotes doubled. A field whose first character is `=`, `+`, `-`, `@`, tab or carriage return is prefixed with `'` so a spreadsheet never runs it as a formula. Columns, in order: `record,date,end_date,goal,cadence,status,reason,person,note`. Rows, in this order, each sorted by date:
  - `goal` — one per period in range: `date` = `P.start`, `end_date` = `P.end`, goal title, cadence, status label, and the excusing exception's reason when excused;
  - `exception` — one per exception overlapping the range: its dates, the goal title (empty for a whole day), `reason`;
  - `check-in received` — one per check-in from a partner: `date`, `person` = the partner's name, `note`;
  - `check-in given` — only with `given=1`: `date`, `person` = **"Team <first name>"**, `note`.
- **File names:** `goal-report-<first name, lower-case>-<from>-to-<to>.csv` (e.g. `goal-report-avery-2026-09-19-to-2026-11-19.csv`). The page's `<title>` is **"Goal report — Avery Adams"**, which browsers use as the PDF's default name.

## Scenarios

### EXP-01 The export is one tap from history and the profile menu
- **Given** a signed-in student
- **Then** their own `/history` shows a link **"Export report"**, and the user menu (tap the avatar) shows **"Export report"**; both go to `/export`
- **And** a teammate's history (`/team/<id>/history`) has no export link

### EXP-02 The default range is the contract
- **Given** Avery's contract runs 2026-09-19 to 2026-11-19
- **When** she opens `/export`
- **Then** the **"From"** and **"To"** fields read 2026-09-19 and 2026-11-19, and the report is headed **"Goal report"** with **"Avery Adams · Team Avery"** and **"Sep 19, 2026 – Nov 19, 2026"**

### EXP-03 The default range without a full contract
- **Given** a contract start but no end, today 2026-10-05
- **Then** the range is contract start → **today**
- **Given** no contract start and goals starting 2026-09-10 and 2026-09-15
- **Then** `from` is 2026-09-10; with no goals at all, `from` is today

### EXP-04 A custom range
- **When** the student sets From 2026-09-21 and To 2026-09-27 and presses **"Update"**
- **Then** the URL is `/export?from=2026-09-21&to=2026-09-27`, the daily log lists exactly those seven days, and the summary counts only periods starting in that week

### EXP-05 An invalid range falls back sensibly
- **When** `?from=abc&to=2026-02-30`
- **Then** both take their defaults
- **When** `?from=2026-09-27&to=2026-09-21`
- **Then** the range is 2026-09-21 → 2026-09-27
- **When** the range spans more than 366 days
- **Then** `to` is `from + 365`

### EXP-06 The summary uses the history rules
- **Given** the range 9/19–9/30 with today 9/30, a daily goal done on 9/19 and 9/22–9/29, missed 9/20, excused 9/21 ("Flu"), and a weekly goal missed for the week of 9/21
- **Then** the summary shows **"2 failures"**, **"1 exception"**, **"82% complete"** (9 of 11), and **"Longest streak: 8 days"** (9/22–9/29; the miss on 9/20 ends the 9/19 run, and the excused 9/21 neither breaks nor extends the new one)

### EXP-07 Vision and contract are included
- **Then** the report has **"Vision"** and **"Contract"** sections rendering the saved documents; a never-saved one reads **"Not written yet."**

### EXP-08 Every goal is listed with its record
- **Then** a **"Goals"** section lists each goal with a period in the range: its title, cadence, **"Started Sep 19"** (and **"Archived Oct 3"** when archived), and **"9 of 11 done"** over its counting past periods in the range

### EXP-09 A day-by-day log
- **Then** the **"Daily log"** has one row per date in the range under month headings, a column per daily goal with ✓ / ✗ / E / · / – marks (and a legend explaining them), days outside the contract grayed and marked **"Outside contract"**, and a **"Check-ins"** column with the first names of the partners who checked in that day

### EXP-10 Weekly and monthly goals are tabled
- **Given** a weekly and a monthly goal
- **Then** a **"Weekly & monthly"** table lists every period in range (**"Week of Sep 21"**, **"October"**) with its status; absent when there are none

### EXP-11 Check-ins from partners, with notes
- **Given** Blake checked in on Avery on 9/22 with the note "Nice work on the reading" and on 9/23 without one, and Casey never did
- **Then** **"Check-ins from partners"** shows **"Blake Brown — 2 days"** with **"Sep 22 — Nice work on the reading"** and **"Sep 23"**, and **"Casey Clark — 0 days"**

### EXP-12 Check-ins you made are optional
- **Given** Avery checked in on Blake on 9/22 with a note
- **Then** by default the report has no **"Check-ins you made"** section
- **When** she ticks **"Include check-ins I made on teammates"** and presses **"Update"**
- **Then** the URL carries `given=1` and the section shows **"Team Blake — 1 day"** with the date and note

### EXP-13 Download PDF prints just the report
- **When** the student presses **"Download PDF"**
- **Then** the browser's print dialog opens (`window.print()`), where they choose **Save as PDF**
- **And** in print, the site header, the range form and the download buttons are hidden, and the report prints dark-on-white whatever the app's appearance

### EXP-14 Download CSV
- **When** the student presses **"Download CSV"**
- **Then** `/export/csv` with the same `from`, `to` and `given` responds `200` with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="goal-report-avery-<from>-to-<to>.csv"`, whose first line is `record,date,end_date,goal,cadence,status,reason,person,note` and whose rows follow [§ Definitions](#definitions)

### EXP-15 CSV fields are escaped and never run as formulas
- **Given** a goal titled `Read, then "reflect"` and a note `=HYPERLINK("x")`
- **Then** the CSV has `"Read, then ""reflect"""` and `"'=HYPERLINK(""x"")"`

### EXP-16 Only your own team
- **Then** `/export` and `/export/csv` ignore any team parameter and always export the session's team
- **And** signed out, both redirect to `/`

### EXP-17 Fits a phone
- **Given** a 375px-wide viewport
- **Then** `/export` has no horizontal page scroll (`scrollWidth <= innerWidth`); a wide daily log scrolls inside its own box

## UI

`/export` sits in the signed-in shell. At the top, outside the report and hidden in print: a small GET form — **"From"** and **"To"** date inputs, a checkbox **"Include check-ins I made on teammates"**, and **"Update"** — then the two actions, **"Download PDF"** (primary, the one accent) and **"Download CSV"** (outlined link). Below, the report as a plain document, in this order: header (**"Goal report"**, name · team, range, contract dates or **"No contract dates set"**, **"Exported Sep 29, 2026"**), **Summary**, **Vision**, **Contract**, **Goals**, **Daily log**, **Weekly & monthly**, **Failures**, **Exceptions**, **Check-ins from partners**, and optionally **Check-ins you made**. Each month of the daily log starts on a new printed page when it doesn't fit. The page is a Server Component except the print button.

## Out of scope

Exporting a teammate's team, `.docx`, server-side PDF rendering, emailing or uploading the report anywhere, per-goal charts.
