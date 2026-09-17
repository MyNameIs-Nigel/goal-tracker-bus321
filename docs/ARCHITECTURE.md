# Architecture

A single Next.js 16 app on Vercel, one Postgres database, Google sign-in, three roles. Small on purpose.

## Stack

| Concern | Choice | Why (see [ADR-0001](adr/0001-initial-scope.md)) |
|---|---|---|
| Framework | Next.js 16.3 App Router, React 19, TypeScript strict | scaffolded; Server Components + Server Actions cover everything here |
| Styling | Tailwind v4, native HTML elements, no component library | small app; simplicity is the design |
| Auth | Better Auth — Google provider, Drizzle adapter, `role` field on user | first-class App Router support, roles built in |
| Database | Neon Postgres (Vercel Marketplace, free tier), **Production only** ([ADR-0004](adr/0004-preview-has-no-database.md)), via Drizzle ORM + Drizzle Kit migrations, `node-postgres` (`pg`) driver | free, type-safe; `pg` speaks plain Postgres wire protocol so the same client code runs unchanged against Neon (its pooled TCP endpoint) and the local Docker container — no Neon-specific driver needed for local dev/CI (ADR-0003) |
| Rich text | Tiptap editor; HTML stored, sanitized server-side | the vision and contract are the owner's content, edited in-app |
| Tests | Vitest + React Testing Library; Playwright | per the Next.js 16 testing guide |
| CI/CD | GitHub Actions for checks; Vercel Git integration for deploys | no deploy tokens, previews per PR |
| Hosting | Vercel Hobby; `https://bus321.nigel-smith.dev` | zero-config Next.js |
| Runtime | Node 24 LTS (`.nvmrc`, `engines.node`) — Vercel reads `engines` too | one source of truth for the version |

## Folder layout (target)

```
app/
  layout.tsx                 root: fonts, metadata, theme color
  page.tsx                   "/" sign-in page (public)
  (app)/                     everything behind sign-in
    layout.tsx               requires a session; header + nav + user menu
    today/page.tsx           /today
    day/[date]/page.tsx      /day/2026-09-19
    goals/page.tsx           /goals
    contract/page.tsx        /contract
    history/page.tsx         /history?month=2026-09
    people/page.tsx          /people (owner only → 404 otherwise)
  api/auth/[...all]/route.ts Better Auth handler
  api/e2e/                   test-mode endpoints; 404 unless enabled (see Environments)
components/                  UI: GoalRow, DayHeader, ExceptionDialog, RichTextEditor, Nav…
lib/
  auth.ts                    Better Auth instance + owner bootstrap hook
  dal.ts                     Data Access Layer: getSession, requireUser, requirePartner, requireOwner
  clock.ts                   today() in APP_TIMEZONE; honours E2E_FIXED_NOW in test mode
  periods.ts                 period math (daily/weekly/monthly) — pure
  tracking.ts                counting, status, failures, streak — pure
  sanitize.ts                HTML allowlist for documents — pure
  actions/                   Server Actions (one file per feature), each calls a require* first
db/
  schema.ts                  Drizzle schema (source of truth for tables)
  client.ts                  Drizzle client (`node-postgres` driver, works against Neon and Docker Postgres alike)
  migrations/                generated SQL, committed
  seed.e2e.ts                test users + fixtures for E2E
proxy.ts                     optimistic redirects only (Next 16's renamed middleware)
docker-compose.yml           local Postgres for dev and E2E (same image as CI)
vercel.json                  framework + build command (migrate, then build)
e2e/                         Playwright specs, one file per spec doc
scripts/
  flow-check.mjs             the docs→tests→code CI rule (pure function, unit-tested)
  trace.mjs                  scenario ID ↔ test coverage report (`npm run trace`)
  db-migrate.mjs             `npm run db:migrate` — runs Drizzle Kit's migrator against `DATABASE_URL`
.github/                     workflows (ci, flow-check, pr-title), dependabot, PR template
docs/                        this
```

`lib/periods.ts`, `lib/tracking.ts`, `lib/sanitize.ts` and `lib/clock.ts` are **pure** — no DB, no request context — so the rules in [DATA_MODEL.md](DATA_MODEL.md) are unit-tested exhaustively and the rest of the app just calls them.

## Request flow

1. **`proxy.ts`** — if the request is for an `(app)` route and there is no session cookie, redirect to `/`. If it's for `/` and there *is* a cookie, redirect to `/today`. Cookie presence only — an *optimistic* check, per the Next.js auth guide. It never decides authorization.
2. **`(app)/layout.tsx`** — calls `requireUser()` from the DAL. No session → `redirect("/")`. Renders the shell (header, nav, user menu) and passes `role` down so the UI can hide controls. Hiding is a courtesy; it is not security.
3. **Pages** are Server Components that read via Drizzle and the pure `lib/` functions. All tracker pages are dynamic (they depend on the session and today's date); nothing per-user is ever cached across users. `cacheComponents` stays off in v1.
4. **Mutations** are Server Actions in `lib/actions/`. The first line of every action is `await requireOwner()` / `requirePartner()`. They validate input, write via Drizzle, then `revalidatePath` the affected routes. The client never sends a role; the action derives it from the session.
5. **Owner-only pages** (`/people`) call `requireOwner()`, which throws `notFound()` for everyone else.

## Authentication

- Better Auth mounted at `/api/auth/*`; Google is the only social provider. Scopes: `openid email profile` (no verification review needed).
- `user.role` is an additional field: `'owner' | 'partner' | 'viewer'`, default `'viewer'`.
- **Owner bootstrap:** a database hook on user creation sets `role = 'owner'` when the email equals `OWNER_EMAIL` (case-insensitive). A sign-in hook re-asserts it, so the owner can never be locked out by a bad role value. Exactly one owner; a partial unique index on `user(role) WHERE role = 'owner'` guarantees it at the database level.
- Sessions: cookie-based, 30 days, refreshed on activity. Role is read from the database on each request (no cookie cache), so a promotion on `/people` is effective on the promoted user's next request.
- `trustedOrigins` includes the production domain, the `*.vercel.app` URL, and (in previews) the deployment URL.

## Authorization (Data Access Layer)

```
requireUser()      → session or redirect("/")
requirePartner()   → session with role = partner or throw Forbidden (the owner is not a partner — the check-in is the partner's own job)
requireOwner()     → session with role = owner or notFound()
```

Every read of another user's data goes through these; every Server Action starts with one. `requireOwner()`'s `notFound()` is for **pages** (`/people`, ROLE-02); an owner-only **Server Action** calls `requireUser()` and throws `Forbidden` itself on the wrong role (ROLE-03) — a rejected mutation is a 403, not a 404. Permission matrix: [specs/roles-and-permissions.md](specs/roles-and-permissions.md).

## Time

- `APP_TIMEZONE = "America/Denver"` — a constant in `lib/clock.ts`, not an env var. "Today" is the calendar date in that zone at request time, computed on the server. The browser's zone is never used for tracker logic.
- Dates are stored as Postgres `date` (no time). Periods are computed in `lib/periods.ts` per [DATA_MODEL.md § Periods](DATA_MODEL.md#periods).
- Week starts **Monday**.
- In test mode, `E2E_FIXED_NOW` (ISO timestamp) pins the clock so E2E tests can reason about "yesterday".

## Environments

| | Production | Preview (each PR) | CI (GitHub Actions) | Local dev |
|---|---|---|---|---|
| URL | `bus321.nigel-smith.dev` (+ `goal-tracker-bus321.vercel.app` redirecting to it) | `goal-tracker-bus321-git-<branch>-….vercel.app` | `localhost:3000` | `localhost:3000` |
| Database | Neon main branch | **none** ([ADR-0004](adr/0004-preview-has-no-database.md), 2026-09-17 — no `DATABASE_URL` at all; any page that queries the database errors) | Postgres service container | **Postgres in Docker** (`docker compose up -d`) — never Neon |
| Sign-in | Google | **test sign-in** (`E2E_AUTH=1`) | test sign-in | test sign-in (Google optional) |
| Migrations | in the Vercel build command | skipped (`scripts/vercel-build.mjs` only migrates when `VERCEL_ENV === "production"`) | before the E2E job | `npm run db:migrate` |

As of Phase 0 the Vercel project already carries the domains
`goal-tracker-bus321.vercel.app` and `bus321.nigel-smith.dev` (the latter added
but not yet resolving — it needs the Cloudflare record in
[H6](HUMAN_TASKS.md#h6-point-bus321nigel-smithdev-at-vercel)), and runs Node 24.x,
matching `.nvmrc` and `engines.node`.

**Test sign-in** exists because Google OAuth can't be automated and doesn't accept wildcard redirect URIs for preview URLs. When `E2E_AUTH=1` **and** `VERCEL_ENV !== "production"`, the sign-in page shows three extra buttons (Owner / Partner / Viewer) and `POST /api/e2e/sign-in` creates a session for a seeded user with that role; `POST /api/e2e/reset` truncates app tables and reseeds. Otherwise those routes are 404 and the buttons don't render. Production never sets the flag; the `VERCEL_ENV` guard is the second lock. Preview deployments additionally sit behind Vercel's own deployment protection (only Nigel's Vercel account can open them).

## Environment variables

| Name | Where | Secret | Set by |
|---|---|---|---|
| `DATABASE_URL` | prod only ([ADR-0004](adr/0004-preview-has-no-database.md)) | yes | Neon integration (H3 ✅, rescoped off Preview in H10 — also injected `DATABASE_URL_UNPOOLED`, `POSTGRES_*`, `PG*`, `NEON_PROJECT_ID`, likewise rescoped; the Neon Auth variables `NEON_AUTH_BASE_URL` / `VITE_NEON_AUTH_URL` are unused) |
| `DATABASE_URL` | CI, local | no | CI workflow (service container) / `.env.local` pointing at the Docker container |
| `BETTER_AUTH_SECRET` | prod, preview | yes | Claude, generated in place (`openssl rand -base64 32`), never displayed |
| `BETTER_AUTH_URL` | prod | no | Claude — `https://bus321.nigel-smith.dev` (set 2026-09-16 after H6) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | prod (dev optional) | yes | Nigel (H5) |
| `OWNER_EMAIL` | prod (dev optional) | no, but personal | Nigel (H5) |
| `E2E_AUTH` | preview, CI, local | no | Claude — `1` |
| `E2E_FIXED_NOW` | CI/local tests only | no | test harness |

`.env.example` is committed with every name and a comment; real values live in Vercel and in the git-ignored `.env.local`. Google provider registration is conditional on its two vars being present, so preview and CI builds don't need them. Local `.env.local` never contains Neon credentials — `vercel env pull` is not used for the database ([ADR-0003](adr/0003-public-repo-and-local-database.md)).

## Interaction accents

Hover and keyboard focus are one shared vocabulary, not per-component guesswork: six classes in `app/globals.css` (`ui-hover-accent`, `ui-hover-underline`, `ui-hover-solid`, `ui-hover-surface`, `ui-hover-edge`, `ui-hover-outline`), each fading the one green accent in over 150ms. What each is for, and the `--accent-hover` / `--accent-soft` tokens they use, is in [specs/hover-feedback.md](specs/hover-feedback.md).

They are written **unlayered**, next to `.doc`, rather than in `@layer components`. A hover rule has to beat the Tailwind utility that set the element's resting colour (`bg-accent`, `border-border`), and Tailwind v4's `utilities` layer wins over `components` no matter how specific the selector is; unlayered rules outrank every layer. The rules are guarded by `@media (hover: hover)` so a tap on a phone never leaves a control stuck highlighted, by `:not(:disabled)` so dead controls never look live, and by `prefers-reduced-motion` so the accent still appears but does not animate.

## Rich text

Tiptap (ProseMirror, StarterKit) with a deliberately small toolbar: Bold, Italic, Heading, Bullet list, Numbered list, Link. The editor emits HTML; the Server Action passes it through `lib/sanitize.ts` (a thin wrapper over `sanitize-html`; allowlist: `p h2 h3 strong em ul ol li a[href^=http(s)] br blockquote`; links get `rel="noopener noreferrer" target="_blank"`; every other tag, attribute and URL scheme is dropped), enforces a 20,000-character limit, and stores it. Rendering is the stored HTML — already safe by construction, sanitized again on the way out as belt and braces. The editor is a client component (`components/RichTextEditor.tsx`) rendered only in edit mode, so readers never download it.

## Security notes

- Server Actions get Next.js's built-in origin checks (CSRF). No custom API surface accepts writes except the test-mode endpoints, which are double-gated.
- No user-supplied HTML is rendered except sanitized documents. Notes and goal text are plain text.
- Owner-only routes 404 rather than 403 — nothing to enumerate.
- No rate limiting in v1: the write surface is the owner and a handful of partners.
- Dependabot keeps dependencies current; CI runs `npm audit --audit-level=high` as a non-blocking report.

## Deployment topology

```
GitHub main ──push──▶ Vercel build ──▶ migrate ──▶ next build ──▶ production
GitHub PR   ──open──▶ Vercel build ──▶ next build (no migrate, no database) ──▶ preview URL + check on the PR
GitHub PR   ──open──▶ Actions: lint · typecheck · unit · e2e (postgres container) · build · flow-check · pr-title
```

Details in [CI_CD.md](CI_CD.md).

## Phase 4 response time

Functions are configured in Portland (`pdx1`), matching the existing Neon database (both verified in Vercel settings 2026-09-17). Previously functions ran in Washington (`iad1`). Session reads are memoized with React `cache` for a single server render only; roles and sessions are checked again on every request. Authenticated routes stream a loading state while data loads. No private data is cached across requests. See [launch readiness](specs/launch-readiness.md).
