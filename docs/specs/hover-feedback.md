# Hover & focus feedback

**Status:** Approved
**Phase:** 4 (polish — requested by Nigel ahead of the rest of Phase 4)
**Routes:** every route
**Rules:** none — this is presentation only; nothing here reads or writes data

## Purpose

A classmate should be able to tell what is touchable by looking at it. Today almost nothing reacts to the pointer: buttons, rows and calendar days all sit still, so the app reads as a printed page rather than something you can use. This spec gives every control — and every block that rewards a second look — a single shared reaction: **the green accent, arriving quickly.**

One accent, one duration, one vocabulary of six classes. No new colours, no shadows, no motion beyond a colour fade.

## Roles

None. This is the same for owner, partner and viewer; it changes appearance only. A control that a role cannot see does not become visible, and a block that is not interactive does not become clickable.

## The vocabulary

Six classes in `app/globals.css`, applied in the markup. Tests name the class, so the names are part of the contract.

| Class | For | At rest | On hover / focus |
|---|---|---|---|
| `ui-hover-accent` | text-only controls: nav links, inline buttons ("Edit", "Archive", "Remove exception"), date and month navigation | inherited colour | `color: var(--accent)` |
| `ui-hover-underline` | inline links already drawn in the accent ("Add one", "Promote someone on the People page") | accent, no underline | `color: var(--accent-hover)` + underline |
| `ui-hover-solid` | filled accent buttons ("Add goal", "Save", "Continue with Google", "I checked today") | `bg-accent` | `background-color: var(--accent-hover)` |
| `ui-hover-surface` | bordered **interactive** things: outline buttons, checkable goal rows, selects, cadence pills | `border-border`, no fill | `border-color: var(--accent)` **and** `background-color: var(--accent-soft)` |
| `ui-hover-edge` | bordered **non-interactive** blocks and form fields: the failure / exception / completion boxes, the weekly & monthly table rows, partner cards, goal cards, people rows, inputs and textareas | `border-border` | `border-color: var(--accent)` only — no fill, because nothing happens if you click |
| `ui-hover-outline` | things whose own box must not change: history day cells, the avatar button | `outline: 2px solid transparent` | `outline-color: var(--accent)` |

Two new tokens sit beside `--accent` in both colour schemes: `--accent-hover` (a step darker in light, a step lighter in dark, for filled buttons) and `--accent-soft` (the accent at low opacity, for tints).

The split between `ui-hover-surface` and `ui-hover-edge` is the point: **a fill means you can click it; a border alone means look closer.** A viewer's read-only goal row must not pretend to be a button.

## Scenarios

### HOVER-01 Nav links take the accent on hover
- **Given** any signed-in page
- **When** the pointer rests on a primary nav link ("Today", "Goals", "Contract", "History", "People")
- **Then** its text colour becomes the accent

### HOVER-02 Filled accent buttons deepen on hover
- **Given** the owner on `/goals`
- **When** the pointer rests on **"Add goal"**
- **Then** its background becomes `--accent-hover`, a visibly different colour from its resting `--accent`

### HOVER-03 Outlined buttons take an accent border and a tint
- **Given** the owner on `/today`
- **When** the pointer rests on **"Mark an exception"**
- **Then** its border becomes the accent and its background becomes the soft accent tint

### HOVER-04 A checkable goal row highlights on hover
- **Given** the owner on `/today` with a daily goal
- **Then** the goal row carries `ui-hover-surface`; for a viewer, who cannot check it off, the same row carries `ui-hover-edge` instead and never gains a fill

### HOVER-05 A history day cell shows an outline on hover
- **Given** anyone on `/history`
- **When** the pointer rests on a specific day in the calendar
- **Then** an accent outline appears around that day only, and the day's own size and position do not change

### HOVER-06 Read-only summary boxes take an accent border
- **Given** anyone on `/history`
- **When** the pointer rests on the failure box, the exception box or the completion box
- **Then** each box's border becomes the accent, and its background does not change

### HOVER-07 Every accent change is a quick transition
- **Given** any element carrying one of the six classes
- **Then** its `transition-duration` is `150ms` and its transition covers colour, background, border and outline — including the nav bar, which must not snap

### HOVER-08 A disabled control shows no hover accent
- **Given** the owner on `/goals` with one goal, whose **"Move up"** button is disabled
- **When** the pointer rests on it
- **Then** nothing about it changes

### HOVER-09 Keyboard focus shows the same accent as hover
- **Given** a nav link
- **When** it is reached with the keyboard
- **Then** it shows the accent, so a keyboard user is never given less than a mouse user

### HOVER-10 Touch-only devices get no hover accent
- **Given** a phone-sized viewport with touch and no hover (`@media (hover: hover)` false)
- **When** a nav link is tapped or hovered
- **Then** its colour does not change, so no tapped control is left stuck in a highlighted state

### HOVER-11 Reduced motion removes the transition
- **Given** `prefers-reduced-motion: reduce`
- **Then** the accent still appears, but `transition-duration` is effectively zero

## UI

- **Duration:** 150ms, `ease-out`, for every class. One number; if it ever changes it changes in one place.
- **Only colours move.** No transform, no scale, no shadow, no movement of the page. `ui-hover-outline` draws a transparent outline at rest so the appearing outline fades in rather than popping, and outlines do not affect layout.
- **The accent is the only colour used.** Destructive controls ("Delete") keep their red and are left alone.
- **Disabled controls are excluded** by `:not(:disabled)` in every hover rule, so a greyed-out button never looks live.

## Out of scope

- Active/pressed states, ripples, spinners, skeletons.
- Any change to what the controls do, to layout, or to which controls a role can see.
- Hover styling for the tiny partner day-strip markers (2.5px squares — there is nothing to show).
