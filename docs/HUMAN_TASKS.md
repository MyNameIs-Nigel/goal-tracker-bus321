# Human Tasks

Everything in this project that Claude cannot do alone. Each task says **why** it needs you, **when** it's needed, roughly **how long** it takes, the exact **steps**, and what to **hand back**. Anything *not* listed here, Claude does.

The rule: you touch things that require *your* Google / Vercel / Cloudflare / GitHub account in a browser, and you paste secrets. Claude never sees, types, or asks for a secret — every secret goes straight from your clipboard into a terminal prompt or a dashboard field.

## At a glance

| # | Task | Needed by | Time | Done |
|---|------|-----------|------|------|
| [H1](#h1-decide-public-repo-or-github-pro) | Decide: public repo, GitHub Pro, or no branch protection | Phase 0 | 2 min | ✅ 2026-09-16 — public |
| [H2](#h2-log-in-to-the-vercel-cli-once) | Log in to the Vercel CLI once; OK the project creation | Phase 0 | 3 min | ✅ 2026-09-16 — `goal-tracker-bus321` |
| [H3](#h3-create-the-neon-database-through-vercel) | Create the Neon Postgres database through Vercel | Phase 1 | 5 min | ✅ 2026-09-16 |
| [H4](#h4-create-the-google-oauth-client) | Create the Google OAuth client | Phase 1 | 10 min | ✅ 2026-09-16 |
| [H5](#h5-put-the-google-secrets-and-your-owner-email-into-vercel) | Put the Google secrets and your owner email into Vercel | Phase 1 | 2 min | ✅ 2026-09-16 |
| [H6](#h6-point-bus321nigel-smithdev-at-vercel) | Point `bus321.nigel-smith.dev` at Vercel (one Cloudflare record) | Phase 4 | 5 min | ✅ 2026-09-16 |
| [H7](#h7-write-your-content-in-the-app) | Write your vision, contract, and goals *in the app* | Phase 4 | your call | Deferred by Nigel 2026-09-17; content not saved yet |
| [H8](#h8-share-the-link-with-your-partners) | Share the link with your partners; promote them | Phase 4 | 2 min | Deferred by Nigel 2026-09-17 |
| [H9](#h9-turn-on-branch-protection-and-set-the-preview-env-vars) | Turn on branch protection, the merge settings, and the Vercel env vars | Phase 0 | 5 min | ✅ 2026-09-16 — Neon branching **on** (superseded by H10) |
| [H10](#h10-turn-off-neon-preview-branching) | Turn off Neon preview branching; rescope `DATABASE_URL` to Production only | Phase 2 | 10 min | ✅ confirmed by Nigel 2026-09-17 |

Everything else — tooling, CI, Vercel project wiring, non-secret env vars, migrations, tests, code, PRs, merges, deploys — is Claude's job. See [PHASES.md](PHASES.md) for which phase asks for which task, and [WORKFLOW.md](WORKFLOW.md) for what Claude does without asking.

---

## H1. Decide: public repo, or GitHub Pro

> ✅ **Done 2026-09-16 — repository is public.** Verified: the branch-protection API now answers "Branch not protected" instead of "Upgrade to GitHub Pro". Claude configures protection in Phase 0. Recorded in [ADR-0003](adr/0003-public-repo-and-local-database.md).

**Why you:** GitHub Free does not allow branch protection or rulesets on **private** repositories. Verified on 2026-09-15 — the API answers *"Upgrade to GitHub Pro or make this repository public to enable this feature."* Without branch protection there are no *required* checks and no auto-merge. CI still runs and reports on every PR; the guardrail just becomes a rule Claude follows ("never merge red") instead of something GitHub enforces.

**What changed since you chose "private":** your vision, contract, and goals now live in the database (decisions C1/C2), not in the repo. The repo is code and docs only. Your owner email is an environment variable, never committed. There is nothing personal in it.

**Options** — pick one and tell Claude:

1. **Make the repo public (Recommended).** Instant, free, unlocks branch protection *and* unlimited Actions minutes. One command:

   ```bash
   gh repo edit MyNameIs-Nigel/goal-tracker-bus321 --visibility public --accept-visibility-change-consequences
   ```

2. **Get GitHub Pro for free** through the [GitHub Student Developer Pack](https://education.github.com/pack) (you're a student). Verification can take minutes or days. Fine to do *in addition* to option 1 if you'd like to flip back to private later.

3. **Stay private with no branch protection.** Say so; Claude will skip the protection setup and merge manually only when every check is green.

**Hand back:** "H1: public" / "H1: pro, approved" / "H1: private, no protection".

---

## H2. Log in to the Vercel CLI once

> ✅ **Done 2026-09-16.** CLI logged in as `mynameis-nigel`; Nigel created the project himself by importing the repo. Project **`goal-tracker-bus321`** in scope `mynameis-nigels-projects`, framework preset Next.js, Node 24.x, root `.`. Production URL: **`https://goal-tracker-bus321.vercel.app`** (currently serving the create-next-app placeholder). Claude linked the folder (`.vercel/`, git-ignored) on the same day.

**Why you:** creating the project and setting environment variables happens in *your* Vercel account. Claude can create the project through the Vercel connector already attached to this session, but needs your go-ahead. The CLI login is a one-time browser confirmation that lets Claude run `vercel env add` / `vercel env pull` for the non-secret values afterwards.

**Steps:**

1. In the repo folder:

   ```bash
   npx vercel login
   ```

   It opens a browser tab — confirm with the Vercel account you want this project under (a personal Hobby account is fine; a class project is non-commercial).

2. Tell Claude **"H2: logged in, create the project."** Claude creates the Vercel project from the GitHub repo (framework: Next.js, Node 24), links the folder (`vercel link`), and sets every non-secret env var.

   *Prefer to do it yourself?* [vercel.com/new](https://vercel.com/new) → Import `MyNameIs-Nigel/goal-tracker-bus321` → Framework preset **Next.js** → Deploy. Then tell Claude the project name.

**Hand back:** "H2: done" (+ project name if you created it yourself). Claude will then tell you the `*.vercel.app` URL — you need it in H4.

---

## H3. Create the Neon database through Vercel

> ✅ **Done 2026-09-16.** The integration injected `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, the `POSTGRES_*` / `PG*` set and `NEON_PROJECT_ID` into **Preview and Production**. Development was not connected — and doesn't need to be: local development and local E2E use a Postgres container ([ADR-0003](adr/0003-public-repo-and-local-database.md)), so nothing on a laptop can ever reset the real database. The integration also created Neon Auth variables (`NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`); they are unused — Better Auth handles sign-in. Whether *preview branching* is on is verified in Phase 0 from the first PR.
>
> **Update 2026-09-17:** Preview's connection is being removed — see [H10](#h10-turn-off-neon-preview-branching) and [ADR-0004](adr/0004-preview-has-no-database.md). Production is unaffected.

**Why you:** installing a Marketplace integration requires clicking "accept" inside your Vercel account. It's free on the Hobby plan (Neon Free tier: 0.5 GB storage, plenty for years of check-offs).

**Steps:**

1. [vercel.com/dashboard](https://vercel.com/dashboard) → open the project → **Storage** tab → **Create Database** → choose **Neon** (Postgres).
2. Plan: **Free**. Name: `bus321-goal-tracker`. Region: the US West / Oregon option (closest to Idaho).
3. **Connect to project** → environments: tick **Production, Preview, and Development** → Create.
4. If the integration offers a toggle like *"Create a database branch for each preview deployment"*, turn it **on** — then every PR preview gets its own isolated copy of the database.

That's it. The integration injects `DATABASE_URL` into Vercel automatically. Claude pulls it locally with `vercel env pull`.

**Hand back:** "H3: done".

---

## H4. Create the Google OAuth client

> ✅ **Done 2026-09-16** (implied by H5: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` exist in Vercel Production).

**Why you:** it lives in *your* Google Cloud account. Ten minutes, once.

**You'll need:** the two production URLs — `https://bus321.nigel-smith.dev` and `https://goal-tracker-bus321.vercel.app` (from H2). Both are listed below ready to paste.

**Steps** (Google Cloud Console; the section is called *Google Auth Platform* in the current UI, *APIs & Services → OAuth consent screen* in the older one):

1. [console.cloud.google.com](https://console.cloud.google.com) → project picker (top bar) → **New Project** → name `bus321-goal-tracker` → Create → make sure it's selected.
2. Left menu → **Google Auth Platform** → **Get started** (or *Branding* if you've been here before):
   - App name: `BUS 321 Goal Tracker`
   - User support email: your Gmail
   - Audience: **External**
   - Contact email: your Gmail
   - **Do not upload a logo** — a logo triggers Google's verification review; without one, and with only the basic sign-in scopes, no review is needed.
   - Finish / Create.
3. **Audience** (left menu) → **Publish app** → confirm. This moves it from *Testing* (max 100 hand-listed testers) to *In production* so **any** Google account can sign in. Because the app only asks for `openid`, `email`, and `profile`, classmates will *not* see an "unverified app" warning.
4. **Clients** (left menu) → **Create client**:
   - Application type: **Web application**
   - Name: `bus321-web`
   - **Authorized JavaScript origins** — add each:
     - `https://bus321.nigel-smith.dev`
     - `https://goal-tracker-bus321.vercel.app`
     - `http://localhost:3000` *(optional — only if you want real Google sign-in on your laptop; Claude uses the test sign-in locally and never needs this)*
   - **Authorized redirect URIs** — add each:
     - `https://bus321.nigel-smith.dev/api/auth/callback/google`
     - `https://goal-tracker-bus321.vercel.app/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` *(optional, same note)*
   - Create.
5. Copy the **Client ID** and **Client secret**. You can always reopen the client to see them again.

**Hand back:** nothing to Claude — go straight to H5. (Never paste the secret into chat.)

---

## H5. Put the Google secrets and your owner email into Vercel

> ✅ **Done 2026-09-16.** Verified by name only (`npx vercel env ls`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OWNER_EMAIL` in **Production**. Values were never read.

**Why you:** they're secrets and it's your identity. Each command prompts for a value; paste it at the prompt. The value never appears in chat or in the repo.

**Steps** — in the repo folder, one at a time:

```bash
npx vercel env add GOOGLE_CLIENT_ID production
```

```bash
npx vercel env add GOOGLE_CLIENT_SECRET production
```

```bash
npx vercel env add OWNER_EMAIL production
```

For `OWNER_EMAIL`, enter the Gmail address you will sign in with. That account — and only that account — becomes `owner` the first time it signs in.

Production only is enough: previews and local development use the built-in test sign-in (see [ARCHITECTURE.md § Environments](ARCHITECTURE.md#environments)). If you added the `localhost` URLs in H4 and want real Google sign-in locally, repeat the three commands with `development` instead of `production` and tell Claude to re-pull `.env.local`.

Claude sets everything else (`BETTER_AUTH_SECRET` — random, generated by a command, never seen by anyone — `BETTER_AUTH_URL`, `E2E_AUTH` for previews, etc.).

**Hand back:** "H5: done".

---

## H6. Point `bus321.nigel-smith.dev` at Vercel

> ✅ **Done 2026-09-16.** `https://bus321.nigel-smith.dev` answers `HTTP/2 200` with a valid certificate; the CNAME resolves to Vercel. Claude switched `BETTER_AUTH_URL` (Production) to `https://bus321.nigel-smith.dev` the same day. The Google sign-in check happens at the end of Phase 1, once there is a sign-in to check.

**Why you:** `nigel-smith.dev` is on Cloudflare (nameservers `noel.ns.cloudflare.com` / `marjory.ns.cloudflare.com`), and only you can log in there. One DNS record. You've done this dance before — the apex `nigel-smith.dev` already serves your `cyber-portfolio` Vercel project through Cloudflare; this is the same pattern for one subdomain.

**Steps:**

1. Claude adds the domain to the Vercel project (`vercel domains add bus321.nigel-smith.dev`) and confirms the CNAME target — it's `cname.vercel-dns.com`.
2. [dash.cloudflare.com](https://dash.cloudflare.com) → **nigel-smith.dev** → **DNS** → **Records** → **Add record**:
   - Type: **CNAME**
   - Name: `bus321`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (grey cloud — click the orange cloud to turn it grey)
   - TTL: Auto
   - Save.
3. Wait a few minutes. Vercel's Domains page flips to *Valid Configuration* and issues the HTTPS certificate on its own (`.dev` is HTTPS-only; nothing extra to do).

**Why "DNS only":** Cloudflare's proxy in front of Vercel breaks certificate issuance and can cause redirect loops unless you also change Cloudflare's SSL mode. Grey cloud sidesteps all of it. If you ever want the orange cloud, set Cloudflare SSL/TLS to *Full (strict)* first.

**Hand back:** "H6: done" — Claude verifies `https://bus321.nigel-smith.dev` end to end, including Google sign-in.

---

## H7. Write your content in the app

**Why you:** it's your vision, your contract, your goals. The app is the editor — there is nothing to put in the repo.

**Steps** (after Phase 3 is live):

1. Sign in with Google at `https://bus321.nigel-smith.dev`.
2. **Contract** page → set the contract start (`2026-09-19`) and end dates → write the *Who I want to become* and *Accountability Contract* sections (consequence, exceptions, the more-than-five-failures clause).
3. **Goals** page → add your daily / weekly / monthly goals.

**Hand back:** nothing; it's live the moment you save.

---

## H8. Share the link with your partners

**Why you:** it's your relationship with your classmates, and only the owner can promote people.

**Steps:**

1. Send partners the link `https://bus321.nigel-smith.dev` and ask them to sign in with Google once.
2. **People** page → change each partner's role from *Viewer* to *Partner*. From then on they see the **"I checked today"** button.

**Hand back:** nothing.

---

## H9. Turn on branch protection and set the preview env vars

> ✅ **Done 2026-09-16.** Verified from a normal terminal: squash-only, delete-branch-on-merge, auto-merge on; `main` protected with `enforce_admins`, linear history, and the seven CI checks required. Claude then added the **`Vercel`** check to the required list via the API (no UI step needed), generated `BETTER_AUTH_SECRET` for **Preview** in place (it existed only for Production), and confirmed `E2E_AUTH` (Preview). **Neon preview branching: on** — recorded in [ARCHITECTURE.md § Environments](ARCHITECTURE.md#environments).
>
> **Update 2026-09-17:** turned back **off** — see [H10](#h10-turn-off-neon-preview-branching) and [ADR-0004](adr/0004-preview-has-no-database.md).

**Why you:** Claude built Phase 0 from a sandboxed session whose GitHub token is
proxied. The proxy allows code, pull requests and labels, and refuses every
*repository settings* write — branch protection, rulesets, and the merge
strategy all come back `403 Repository settings writes are not permitted
through this proxy`. There is no Vercel CLI in that sandbox either, and the
Vercel connector exposes no environment-variable tool. None of this is a
permissions problem on your side; it is the sandbox. From a normal terminal on
your laptop these are four commands.

**Needed by:** Phase 0 to be fully closed. Nothing is blocked meanwhile — CI
runs and reports on every PR either way, and Claude does not merge red.

### 1. Repository settings and branch protection

```bash
gh repo edit MyNameIs-Nigel/goal-tracker-bus321 \
  --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
  --delete-branch-on-merge --enable-auto-merge
```

```bash
gh api -X PUT repos/MyNameIs-Nigel/goal-tracker-bus321/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["lint", "typecheck", "unit", "e2e", "build", "flow-check", "pr-title"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

The `Vercel` check is added to the required list from the GitHub UI once it has
posted at least once (it has, on [#1](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/1)):
Settings → Branches → `main` → *Require status checks* → add **Vercel**.

### 2. Vercel environment variables

```bash
npx vercel env add E2E_AUTH preview
```
Value: `1`. This is what makes the three test sign-in buttons work on preview
deployments from Phase 1 onward.

```bash
npx vercel env add BETTER_AUTH_URL production
```
Value: `https://goal-tracker-bus321.vercel.app` for now; it changes to
`https://bus321.nigel-smith.dev` at [H6](#h6-point-bus321nigel-smithdev-at-vercel).

```bash
printf '%s' "$(openssl rand -base64 32)" | npx vercel env add BETTER_AUTH_SECRET production
printf '%s' "$(openssl rand -base64 32)" | npx vercel env add BETTER_AUTH_SECRET preview
```
Two different random values, generated in place. Nobody reads them, including you.

### 3. The Neon preview-branching question

[vercel.com/dashboard](https://vercel.com/dashboard) → the project → **Storage**
→ the Neon database → **Branches**. If there is a branch named after
`claude/awesome-clarke-jpqlre` (or the PR), preview branching is **on**;
if the only branch is `main`/`production`, it is **off**.

**Hand back:** "H9: done" plus "Neon branching: on" or "off" — Claude records
the answer in [ARCHITECTURE.md § Environments](ARCHITECTURE.md#environments).
Either answer is safe; v1 migrations are additive-only.

---

## H10. Turn off Neon preview branching

> **2026-09-17 verification:** Nigel had disabled Preview branch creation. The connection still included Preview, so Codex changed its environment scope to Production only and verified the saved Connections table. Recheck variable scopes and the next Preview build when work resumes.

**Why you:** it's a toggle inside the Neon integration's dashboard UI and per-environment variable scoping in Vercel's project settings — both require your account, and the Vercel connector exposes no environment-variable tool (same limitation as [H9](#h9-turn-on-branch-protection-and-set-the-preview-env-vars)).

**Why now:** on 2026-09-17, PR [#11](https://github.com/MyNameIs-Nigel/goal-tracker-bus321/pull/11) — a docs-only change — failed to deploy twice with a Vercel error that turned out to be **"Branch limit reached. Upgrade your plan or delete unused branches."** Neon's Free tier caps branches, and a branch-per-preview-deployment setup quietly used them all up. See [ADR-0004](adr/0004-preview-has-no-database.md) for the full decision: Preview no longer gets a database at all; only Production does.

**Steps:**

1. **Delete the excess branches now**, to unblock deployments immediately: [vercel.com/dashboard](https://vercel.com/dashboard) → the project → **Storage** tab → the Neon database → **Branches** → delete every branch except `main`/`production`. (Or the same thing from [console.neon.tech](https://console.neon.tech) directly.)
2. **Turn off automatic branch creation**: same Neon integration screen → Settings (sometimes under the integration's "Branching" or "Preview Deployments" section) → turn **off** *"Automatically create a branch for each preview deployment."*
3. **Rescope `DATABASE_URL` off Preview**: Vercel dashboard → the project → **Settings → Environment Variables** → find `DATABASE_URL` (and, if present as separate rows, `DATABASE_URL_UNPOOLED`, the `POSTGRES_*` / `PG*` set, `NEON_PROJECT_ID`) → edit each → uncheck **Preview**, leaving only **Production** checked. If the Storage tab instead offers a single "connected environments" control for the whole Neon connection, unchecking Preview there does the same thing in one step — use whichever the UI shows you.

**Hand back:** "H10: done". Claude verifies the next PR's preview deployment no longer tries to touch a database (it'll show no `DATABASE_URL` step and skip straight to `next build`).

---

## Things you might expect to be here but aren't

- **GitHub Actions secrets** — none needed. CI uses a throwaway Postgres container and the test sign-in.
- **Vercel deploy tokens** — none needed. Vercel's GitHub integration deploys on its own.
- **Database migrations** — run automatically during every Vercel build and in CI.
- **A local database** — `docker compose up -d` starts a Postgres container; Claude runs it. Neon is only ever touched by Vercel's **Production** deployments ([ADR-0004](adr/0004-preview-has-no-database.md)).
- **Dependabot** — a config file; Claude adds it in Phase 0.
- **Branch protection & repo settings** — Claude would apply these with `gh`, but the sandboxed session's GitHub proxy refuses repository-settings writes. They are [H9](#h9-turn-on-branch-protection-and-set-the-preview-env-vars).
- **Phone testing** — Claude checks with mobile emulation. Opening it on your own phone once before sharing is a good idea, not a requirement.
