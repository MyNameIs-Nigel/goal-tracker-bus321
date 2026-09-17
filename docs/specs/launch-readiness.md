# Launch readiness

**Status:** Approved within Phase 4
**Phase:** 4
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
- **Given** any role on the main routes, at phone and desktop sizes
- **Then** controls have labels, keyboard focus is visible, and automated WCAG AA checks pass in light and dark modes
- **And** buttons, selects and navigation targets are at least 44px high, calendar links at least 44px wide, with no horizontal page overflow at 375px
- **And** a skip link leads to the main content

### LAUNCH-04 Public identity assets
- **Given** a visitor without a session
- **When** loading the site icon or social preview
- **Then** images return successfully rather than redirecting to sign-in; social image URLs use the canonical origin

### LAUNCH-05 Fresh authorization after optimization
- **Given** a signed-in partner
- **When** the owner changes that person's role
- **Then** the next page request and Server Action use the new role; no session result is shared between requests or people

## Performance and verification

Nigel's 2026-09-17 screenshot shows 2.14s waiting for the server and only
1.31ms downloading the document. On 2026-09-17, Vercel settings showed functions
in `iad1` (Washington, D.C.) while the database settings showed `pdx1`
(Portland). Co-locate functions with the existing database using `vercel.json`
`regions: ["pdx1"]`; this does not move data or change the plan.

Use React `cache` for session reads within one server render request, as the
installed Next.js authentication guide recommends. All DAL checks remain in
place. No persistent auth cache, stale roles, CDN cache of private pages,
periodic keepalive, or paid infrastructure. Existing tracker queries already
run in parallel. Loading UI improves feedback but is not evidence that data
loads faster. Neon waking from idle can still delay the first visit.

Audit empty states through the existing goal, contract, history and partner
specs. Verify a mobile Lighthouse accessibility score of at least 95 on
`/today`; distinguish production verification from local test-account audits.

H7 content and H8 sharing/promotions are deferred by Nigel. Do not edit real
tracker data or contact partners to complete launch testing.
