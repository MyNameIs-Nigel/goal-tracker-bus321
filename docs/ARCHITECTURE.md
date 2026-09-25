# Architecture

A single Next.js 16 app on Vercel, one Postgres database, Google sign-in. Every student owns a team and every other student is a partner on it ([ADR-0005](adr/0005-every-student-owns-a-team.md)). Small on purpose.

## Stack

| Concern | Choice | Why (see [ADR-0001](adr/0001-initial-scope.md)) |
|---|---|---|
| Framework | Next.js 16.3 App Router, React 19, TypeScript strict | scaffolded; Server Components + Server Actions cover everything here |
| Styling | Tailwind v4, native HTML elements, no component library | small app; simplicity is the design |
| Auth | Better Auth — Google provider, Drizzle adapter | first-class App Router support |
| Database | Neon Postgres (Vercel Marketplace, free tier), **Production only** ([ADR-0004](adr/0004-preview-has-no-database.md)), via Drizzle ORM + Drizzle Kit migrations, `node-postgres` (`pg`) driver | free, type-safe; `pg` speaks plain Postgres wire protocol so the same client code runs unchanged against Neon (its pooled TCP endpoint) and the local container — no Neon-specific driver needed for local dev/CI (ADR-0003) |
| Rich text | Tiptap editor; HTML stored, sanitized server-side | each student's vision and contract, edited in-app |
| Tests | Vitest + React Testing Library; Playwright | per the Next.js 16 testing guide |
| CI/CD | GitHub Actions for checks; Vercel Git integration for deploys | no deploy tokens, previews per PR |
| Hosting | Vercel Hobby; `https://bus321.nigel-smith.dev` | zero-config Next.js |
| Runtime | Node 24 LTS (`.nvmrc`, `engines.node`) — Vercel reads `engines` too | one source of truth for the version |

## Folder layout

```
app/
  layout.tsx                   root: fonts, metadata, theme color
  page.tsx                     "/" sign-in page (public)
  (app)/                       everything behind sign-in
    layout.tsx                 requires a session; header + nav + user menu
    today/page.tsx             /today — your day, your teammates, who checked on you
    day/[date]/page.tsx        /day/2026-09-19 — your day
    goals/page.tsx             /goals — your goals
    contract/page.tsx          /contract — your vision, contract and dates
    history/page.tsx           /history?month=2026-09 — your month
    team/[teamId]/             a teammate's team, read-only (your own id redirects to the routes above)
      page.tsx                 /team/<id> — their today
      day/[date]/page.tsx      /team/<id>/day/2026-09-19
      contract/page.tsx        /team/<id>/contract
      history/page.tsx         /team/<id>/history?month=2026-09
  api/auth/[...all]/route.ts   Better Auth handler
  api/e2e/                     test-mode endpoints; 404 unless enabled (see Environments)
components/                    UI: DayView, TeammateList, TeamCheckins, CheckinControl, TeamNav, ExceptionDialog, RichTextEditor, Nav…
lib/
  auth.ts                      Better Auth instance
  dal.ts                       Data Access Layer: getSession, requireUser (with the caller's team)
  clock.ts                     today() in APP_TIMEZONE; honours E2E_FIXED_NOW in test mode
  periods.ts · status.ts       period, counting, status, failures, streak — pure
  sanitize.ts                  HTML allowlist for documents — pure
  paths.ts                     a team's page URLs (own routes vs. /team/<id>) — pure
  view/                        pure view-models: day, teammates, history, contract
  queries/                     reads, always scoped to a team
  team-page.ts                 which team a page shows: yours, or a teammate's (404 / redirect-to-own)
  day-page.ts · contract-page.ts · history-page.ts   one loader per page type, shared by your routes and team routes
  actions/                     Server Actions (one file per feature), each calls requireUser first
db/
  schema.ts                    Drizzle schema (source of truth for tables)
  client.ts                    Drizzle client (`node-postgres` driver, works against Neon and local Postgres alike)
  migrations/                  generated SQL, committed
  seed.e2e.ts · demo.e2e.ts    fake students, and the optional demo class, for tests and local use
proxy.ts                       optimistic redirects only (Next 16's renamed middleware)
docker-compose.yml             local Postgres for dev and E2E (same image as CI)
vercel.json                    framework + build command (migrate, then build) + region
e2e/                           Playwright specs, one file per spec doc
scripts/
  flow-check.mjs               the docs→tests→code CI rule (pure function, unit-tested)
  trace.mjs                    scenario ID ↔ test coverage report (`npm run trace`)
  db-migrate.mjs               `npm run db:migrate` — runs Drizzle Kit's migrator against `DATABASE_URL`
.github/                       workflows (ci, flow-check, pr-title), dependabot, PR template
docs/                          this
```

`lib/periods.ts`, `lib/status.ts`, `lib/sanitize.ts`, `lib/paths.ts`, `lib/view/*` and `lib/clock.ts` are **pure** — no DB, no request context — so the rules in [DATA_MODEL.md](DATA_MODEL.md) are unit-tested exhaustively and the rest of the app just calls them.

## Request flow

1. **`proxy.ts`** — if the request is for an `(app)` route and there is no session cookie, redirect to `/`. If it's for `/` and there *is* a cookie, redirect to `/today`. Cookie presence only — an *optimistic* check, per the Next.js auth guide. It never decides authorization.
2. **`(app)/layout.tsx`** — calls `requireUser()` from the DAL. No session → `redirect("/")`. Renders the shell (header, nav, user menu with the team name).
3. **Pages** are Server Components that read via Drizzle and the pure `lib/` functions. Your own pages read the session's team; team pages read the team in the URL after `getTeam()` has confirmed it exists (404 otherwise) and isn't yours (redirect otherwise). All tracker pages are dynamic (they depend on the session and today's date); nothing per-user is ever cached across users. `cacheComponents` stays off.
4. **Mutations** are Server Actions in `lib/actions/`. The first line of every action is `await requireUser()`. Own-team writes use the session's team id and never accept one from the client; row ids (a goal, an exception) are matched *together with* that team id. Check-ins take the target team id and refuse the caller's own. Actions validate input, write via Drizzle, then `revalidatePath` the affected routes.

## Authentication

- Better Auth mounted at `/api/auth/*`; Google is the only social provider. Scopes: `openid email profile` (no verification review needed).
- Any Google account may sign in; signing in makes you a student. There are no roles and no allowlist ([ADR-0005](adr/0005-every-student-owns-a-team.md)).
- Sessions: cookie-based, 30 days, refreshed on activity. Nothing about the user is cached across requests.
- `trustedOrigins` includes the production domain, the `*.vercel.app` URL, and (in previews) the deployment URL.

## Authorization (Data Access Layer)

```
requireUser()   → { id, name, email, image, teamId } or redirect("/")
                  (creates the caller's team on first use — INSERT … ON CONFLICT (owner_id) DO NOTHING)
getTeam(id)     → the team with its owner's name and image, or null (malformed ids are null, never a query error)
```

The rule is **ownership** ([specs/teams.md](specs/teams.md)): every student reads every team; you write only your own team; you check in only on teams that aren't yours.

- Own-team writes (`createGoal`, `updateGoal`, `archiveGoal`, `unarchiveGoal`, `moveGoal`, `deleteGoal`, `toggleCompletion`, `createException`, `removeException`, `saveDocument`, `saveContractDates`) take **no team id**. They resolve the goal or exception with `WHERE id = $1 AND team_id = <session team>`; another team's id finds nothing and the action returns **"Goal not found."** / **"Exception not found."** without writing.
- Check-ins (`checkIn`, `saveNote`) take the target `teamId`, reject the caller's own team with `Forbidden` and a missing team with **"Team not found."**, and write the session user as the partner — there is no user-id parameter.
- UI hiding is a courtesy: a teammate's pages simply render the same views with editing off.

## Time

- `APP_TIMEZONE = "America/Denver"` — a constant in `lib/clock.ts`, not an env var. "Today" is the calendar date in that zone at request time, computed on the server. The browser's zone is never used for tracker logic.
- Dates are stored as Postgres `date` (no time). Periods are computed in `lib/periods.ts` per [DATA_MODEL.md § Periods](DATA_MODEL.md#periods).
- Week starts **Monday**.
- In test mode, `E2E_FIXED_NOW` (ISO timestamp) pins the clock so E2E tests can reason about "yesterday".

## Environments

| | Production | Preview (each PR) | CI (GitHub Actions) | Local dev |
|---|---|---|---|---|
| URL | `bus321.nigel-smith.dev` (+ `goal-tracker-bus321.vercel.app` redirecting to it) | `goal-tracker-bus321-git-<branch>-….vercel.app` | `localhost:3000` | `localhost:3000` |
| Database | Neon main branch | **none** ([ADR-0004](adr/0004-preview-has-no-database.md) — any page that queries the database errors) | Postgres service container | **local Postgres** (`docker compose up -d`) — never Neon |
| Sign-in | Google | **test sign-in** (`E2E_AUTH=1`) | test sign-in | test sign-in (Google optional) |
| Data | real students | — | fake students, reseeded per test | fake students; **"Load demo data"** for a full fake class |
| Migrations | in the Vercel build command | skipped (`scripts/vercel-build.mjs` only migrates when `VERCEL_ENV === "production"`) | before the E2E job | `npm run db:migrate` |

**Test sign-in** exists because Google OAuth can't be automated and doesn't accept wildcard redirect URIs for preview URLs. When `E2E_AUTH=1` **and** `VERCEL_ENV !== "production"`, the sign-in page shows buttons for the fake students (**Avery**, **Blake**, **Casey**) and **Load demo data**; `POST /api/e2e/sign-in` with `{ student }` creates a session for that student (signing Dana up first if she's asked for); `POST /api/e2e/reset` truncates app tables and reseeds, with fake demo content when `{ demo: true }`. Otherwise those routes are 404 and the buttons don't render. Production never sets the flag; the `VERCEL_ENV` guard is the second lock. Preview deployments additionally sit behind Vercel's own deployment protection.

## Environment variables

| Name | Where | Secret | Set by |
|---|---|---|---|
| `DATABASE_URL` | prod only ([ADR-0004](adr/0004-preview-has-no-database.md)) | yes | Neon integration (H3 ✅, rescoped off Preview in H10 — also injected `DATABASE_URL_UNPOOLED`, `POSTGRES_*`, `PG*`, `NEON_PROJECT_ID`, likewise rescoped; the Neon Auth variables `NEON_AUTH_BASE_URL` / `VITE_NEON_AUTH_URL` are unused) |
| `DATABASE_URL` | CI, local | no | CI workflow (service container) / `.env.local` pointing at the local container |
| `BETTER_AUTH_SECRET` | prod, preview | yes | Claude, generated in place (`openssl rand -base64 32`), never displayed |
| `BETTER_AUTH_URL` | prod | no | Claude — `https://bus321.nigel-smith.dev` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | prod (dev optional) | yes | Nigel (H5) |
| `E2E_AUTH` | preview, CI, local | no | Claude — `1` |
| `E2E_FIXED_NOW` | CI/local tests only | no | test harness |

`OWNER_EMAIL` is no longer read ([ADR-0005](adr/0005-every-student-owns-a-team.md)); if it is still set in Vercel it is harmless. `.env.example` is committed with every name and a comment; real values live in Vercel and in the git-ignored `.env.local`. Google provider registration is conditional on its two vars being present, so preview and CI builds don't need them. Local `.env.local` never contains Neon credentials ([ADR-0003](adr/0003-public-repo-and-local-database.md)).

## Interaction accents

Hover and keyboard focus are one shared vocabulary, not per-component guesswork: six classes in `app/globals.css` (`ui-hover-accent`, `ui-hover-underline`, `ui-hover-solid`, `ui-hover-surface`, `ui-hover-edge`, `ui-hover-outline`), each fading the one green accent in over 150ms. What each is for, and the `--accent-hover` / `--accent-soft` tokens they use, is in [specs/hover-feedback.md](specs/hover-feedback.md).

They are written **unlayered**, next to `.doc`, rather than in `@layer components`. A hover rule has to beat the Tailwind utility that set the element's resting colour (`bg-accent`, `border-border`), and Tailwind v4's `utilities` layer wins over `components` no matter how specific the selector is; unlayered rules outrank every layer. The rules are guarded by `@media (hover: hover)` so a tap on a phone never leaves a control stuck highlighted, by `:not(:disabled)` so dead controls never look live, and by `prefers-reduced-motion` so the accent still appears but does not animate.

## Rich text

Tiptap (ProseMirror, StarterKit) with a deliberately small toolbar: Bold, Italic, Heading, Bullet list, Numbered list, Link. The editor emits HTML; the Server Action passes it through `lib/sanitize.ts` (a thin wrapper over `sanitize-html`; allowlist: `p h2 h3 strong em ul ol li a[href^=http(s)] br blockquote`; links get `rel="noopener noreferrer" target="_blank"`; every other tag, attribute and URL scheme is dropped), enforces a 20,000-character limit, and stores it. Rendering is the stored HTML — already safe by construction, sanitized again on the way out as belt and braces. The editor is a client component (`components/RichTextEditor.tsx`) rendered only in edit mode, so readers never download it.

## Security notes

- Server Actions get Next.js's built-in origin checks (CSRF). No custom API surface accepts writes except the test-mode endpoints, which are double-gated.
- No user-supplied HTML is rendered except sanitized documents. Notes, goal text and names are plain text.
- Team ids in URLs are validated as UUIDs before any query; an unknown team is a 404.
- No rate limiting: the write surface is a class of students, each writing their own rows.
- Dependabot keeps dependencies current; CI runs `npm audit --audit-level=high` as a non-blocking report.

## Deployment topology

```
GitHub main ──push──▶ Vercel build ──▶ migrate ──▶ next build ──▶ production
GitHub PR   ──open──▶ Vercel build ──▶ next build (no migrate, no database) ──▶ preview URL + check on the PR
GitHub PR   ──open──▶ Actions: lint · typecheck · unit · e2e (postgres container) · build · flow-check · pr-title
```

Details in [CI_CD.md](CI_CD.md).

## Response time

Functions run in Portland (`pdx1`), next to the Neon database. Session reads — including resolving the caller's team — are memoized with React `cache` for a single server render only; sessions are checked again on every request. The today page loads every team's rows in a handful of parallel queries and computes teammates' summaries in memory. Authenticated routes stream a loading state while data loads. No private data is cached across requests. See [launch readiness](specs/launch-readiness.md).
