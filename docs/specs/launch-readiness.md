# Launch readiness

**Status:** Approved (revised for teams by [ADR-0005](../adr/0005-every-student-owns-a-team.md))
**Phase:** 4, revised in 5
**Routes:** all

## Scenarios

### LAUNCH-01 Canonical domain
- **Given** the production alias `goal-tracker-bus321.vercel.app`
- **When** a page is requested
- **Then** it permanently redirects to `https://bus321.nigel-smith.dev`, preserving path and query; local and preview hosts do not redirect

### LAUNCH-02 Loading and failure recovery
- **Given** tracker data is loading or a route fails
- **Then** a labelled loading status or friendly error with a Try again button is shown; raw error details are never displayed
- **When** Try again is pressed
- **Then** the route is fetched again using Next.js `retry`

### LAUNCH-03 Accessible controls and colours
- **Given** any student on the main routes — their own `/today`, `/goals`, `/contract`, `/history`, `/export`, and a teammate's `/team/<id>`, `/team/<id>/contract`, `/team/<id>/history` — at phone and desktop sizes, with demo data loaded
- **Then** controls have labels, keyboard focus is visible, and automated WCAG AA checks pass in light and dark modes
- **And** buttons, selects and navigation targets are at least 44px high, calendar links at least 44px wide, with no horizontal page overflow at 375px
- **And** a skip link leads to the main content

### LAUNCH-04 Public identity assets
- **Given** a visitor without a session
- **When** loading the site icon or social preview
- **Then** images return successfully rather than redirecting to sign-in; social image URLs use the canonical origin

### LAUNCH-05 Every request is answered for the person making it
- **Given** Avery and Blake signed in at the same time in separate browsers
- **When** each opens `/today`
- **Then** each sees their own goals and their own teammates (Avery's list has Blake, Blake's has Avery); no session or team result is shared between requests or people

### LAUNCH-06 Profile panel never covers navigation
- **Given** the phone header, where the primary navigation wraps onto its own row
- **When** the profile panel is open
- **Then** the panel opens below the whole header, every primary navigation link stays visible, and one tap on a link navigates

## Performance and verification

Nigel's 2026-09-17 screenshot showed 2.14s waiting for the server; functions were in `iad1` while the database was in `pdx1`. Functions are co-located with the database with `vercel.json` `regions: ["pdx1"]`.

Session reads use React `cache` within one server render only, as the installed Next.js authentication guide recommends; the team id is resolved in the same cached read. All DAL checks remain in place. No persistent auth cache, CDN cache of private pages, periodic keepalive, or paid infrastructure. Tracker queries run in parallel. Loading UI improves feedback but is not evidence that data loads faster. Neon waking from idle can still delay the first visit.

Verification uses fake data ([ADR-0005](../adr/0005-every-student-owns-a-team.md) T6): the seeded students in CI and locally, and the demo data set for accessibility audits and screenshots. Nobody's real tracker data is edited to test anything.
