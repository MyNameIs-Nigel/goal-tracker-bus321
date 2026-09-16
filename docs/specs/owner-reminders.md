# Owner reminders

**Status:** Planned — Phase 5, after launch. Scenarios are written when the phase starts.
**Phase:** 5
**Routes:** a toggle in the owner's user menu or a small `/settings` page; a service worker; `/api/cron/reminder`
**Rules:** to be added to DATA_MODEL.md (`push_subscriptions` table) when the phase starts

## Purpose (from decision D5)

Nigel wants a nudge on his desktop browser (Chrome first) when the day is ending and goals are still unchecked. **Owner only** — partners are never notified in this phase.

## Design sketch

- **Web Push** with VAPID keys (`WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` — one human task to generate and set, or Claude generates them in place like `BETTER_AUTH_SECRET`).
- A minimal service worker registered only for the owner, only after they turn the toggle on and grant the browser permission.
- `push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)` — one row per browser.
- A **Vercel Cron** hitting `/api/cron/reminder` at a fixed Denver time (default 8:00 PM; `vercel.json` `crons`, protected by `CRON_SECRET`). It computes today's pending daily goals with the same pure functions as `/today`; if any, it pushes **"N goals still open today"** to every owner subscription; expired subscriptions are pruned.
- Clicking the notification opens `/today`.

## Known constraints

- Desktop Chrome/Edge/Firefox work out of the box. Safari on iOS requires the app to be installed to the Home Screen (PWA) — a follow-up if ever wanted.
- Vercel Hobby cron runs once per day at best-effort timing; fine for a reminder.

## Out of scope

Partner reminders, email, SMS, per-goal reminder times.
