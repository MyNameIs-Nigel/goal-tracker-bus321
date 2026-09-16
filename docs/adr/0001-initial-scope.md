# ADR-0001: Initial scope

**Status:** Accepted 2026-09-15
**Deciders:** Nigel (answers), Claude (questions and recommendations)

## Context

A blank `create-next-app` (Next.js 16.3.5, React 19, Tailwind v4, TypeScript) needs to become a goal tracker that Nigel's BUS 321 accountability partners can check daily. Twenty-five scoping questions were asked in `docs/QUESTIONS.md` on 2026-09-15; the answers below are the decisions. Where Nigel's answer changed a recommendation, the change is noted.

## Decisions

### Hosting

| ID | Decision |
|---|---|
| A1 | **Vercel**, Hobby plan. |
| A2 | **Custom domain `bus321.nigel-smith.dev`** (DNS is on Cloudflare; CNAME, DNS-only). The `*.vercel.app` URL redirects to it. |
| A3 | **Private repository.** *Note added after the fact:* GitHub Free does not permit branch protection on private repos (verified via API the same day). With content now in the database (C1/C2), the repo holds no personal data. Resolution is [H1](../HUMAN_TASKS.md#h1-decide-public-repo-or-github-pro); the recommendation is to make it public. |

### Authentication & roles

| ID | Decision |
|---|---|
| B1 | **Better Auth** (Nigel is used to Auth.js; accepted the recommendation). Google is the only provider. |
| B2 | **Anyone with a Google account can sign in** and lands as `viewer`. No allowlist, no domain restriction. |
| B3 | Roles: **`owner`** (Nigel, exactly one), **`partner`** (promoted classmates: view + daily check-in + note), **`viewer`** (everyone else: read-only). |
| B4 | **Owner promotes/demotes partners in-app** on `/people`; roles live in the database. |

### Content & data

| ID | Decision |
|---|---|
| C1 | **Vision statement and contract are rich text edited in the app**, stored in the database. Changed from the recommendation (markdown in repo). Nigel: *"the backend should keep code, not vision of the goals."* |
| C2 | **Goal definitions live in the database with an in-app editor.** Changed from the recommendation (typed config file). Goals are simple text. |
| C3 | **Neon Postgres via the Vercel Marketplace (free tier) + Drizzle ORM.** |
| C4 | **`America/Denver`** defines "today". (Nigel is in Rexburg, Idaho — Mountain time.) |
| C5 | **Owner can edit past days freely.** Changed from the recommendation (lock at end of day). Consequence: failures are derived on read, never stored; nothing is ever locked. |
| C6 | **Exceptions:** owner can mark a day or a single goal on a day as an exception with a required reason, visible to partners. |
| C7 | **Just show the monthly failure count.** No banner, no amendment mechanic for the "more than five failures" clause. |

### UI / UX

| ID | Decision |
|---|---|
| D1 | **Tailwind v4 + native HTML elements, no component library.** System font stack, light/dark from system preference. |
| D2 | **One calm accent color (a green) for "done"**, neutral grays for everything else. |
| D3 | v1 screens: `/` sign-in, `/today`, `/goals`, `/contract`, `/history`, `/people` (owner). (`/day/[date]` added by ADR-0002 as the past-day editing surface for C5.) |
| D4 | **Mobile-first.** Classmates will check from phones. No PWA/offline in v1. |
| D5 | **No notifications in v1.** Back-pocket for the next iteration: **browser (desktop Chrome) notifications for the owner only**, as reminders to track goals. Recorded as Phase 5, spec [owner-reminders](../specs/owner-reminders.md). |

### Engineering workflow & CI/CD

| ID | Decision |
|---|---|
| E1 | **Vitest + React Testing Library** for unit/component; **Playwright** for E2E. |
| E2 | **Test-only sign-in path enabled by an env flag**, absent from production. |
| E3 | **PR template checklist + CI `flow-check` job** that fails when code changes lack docs and test changes; `skip-flow-check` label as the escape hatch. |
| E4 | **All of the hygiene bundle:** `main` protected, PRs required, squash merge, linear history; required checks lint/typecheck/unit/e2e/build; Conventional Commits on PR titles; Dependabot weekly grouped; Prettier in CI. |
| E5 | **npm**, **Node 24 LTS** pinned via `.nvmrc` and `engines`. |
| E6 | **`docs/specs/<feature>.md` in Given/When/Then** with IDs that tests reference; **`docs/adr/`** for decisions. |

### Misc

| ID | Decision |
|---|---|
| F1 | App name: **"BUS 321 Goal Tracker"**. |
| F2 | **Contract starts Saturday 2026-09-19.** The app must be usable by then. |
| F3 | Nothing else required by the assignment. |

### Process

| ID | Decision |
|---|---|
| P1 | Documentation is written first and is the source of truth; **Claude builds phases with as little human involvement as possible**; anything requiring Nigel is explained step by step in [HUMAN_TASKS.md](../HUMAN_TASKS.md). |
| P2 | Nothing is built until Nigel says "start Phase N" ([PHASES.md](../PHASES.md)). |

## Consequences

- Content in the database (C1/C2) means the owner needs editing UI for goals and two rich-text documents — more surface than the config-file route, but the repo is now content-free and the app is complete on its own.
- Free editing of past days (C5) makes every derived number (failures, streak, day status) a pure function of current rows. Simpler storage; the accountability rests on partners seeing exceptions and edits transparently, not on locks.
- Google-only sign-in plus the test-mode flag (E2) means previews and CI never touch Google; only production needs the OAuth client.
- A private repo on GitHub Free conflicts with E4's branch protection — flagged as H1 rather than silently dropped.
