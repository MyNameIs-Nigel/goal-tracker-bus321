# Phase 4 checkpoint — stopped at Nigel's request, 2026-09-17

- Appearance selector merged in PR #19 (all required checks green). Production verification after deployment is still pending.
- H7 and H8 are explicitly deferred; content was not saved. Do not mark launch complete.
- H10: preview branch creation was already off, but the Neon connection and variables still included Preview. Updated the existing connection in Vercel to Production only, preserving its other settings. The Connections table now confirms Production only. A fresh environment-scope listing and next preview build remain to verify.
- Unfinished launch changes are saved locally on `codex/launch-readiness`; not pushed or deployed. They include Portland function placement to match Neon, request-scoped session memoization, accessible targets/colours, loading/error states, canonical redirect and public identity asset fixes.
- Before changes: function region `iad1`, database `pdx1` confirmed in Vercel UI. Nigel's screenshot showed 2.14s server wait; no post-deploy performance measurement exists yet.
- Local check passes: lint, format, types, 284 unit/component tests, build. Full E2E: 172 passed, 7 intentional device-specific skips, 1 failure. The failing mobile THEME-02 test tries to click Goals while the expanded profile panel covers that link in the new mobile header. Close the profile panel before navigating, then rerun that test. Fresh-role checks and all new accessibility tests passed.
- Lighthouse audit remains undone. Lighthouse was installed under `/tmp/bus321-lighthouse` only. No production content was changed, no partners contacted, no preview test reset/sign-in used, no secret values opened.
- Before opening the launch PR, rebase the launch-only commits onto merged main, dropping the already-merged theme commits. Follow docs-first workflow, revalidate changed checks, and merge only green.
