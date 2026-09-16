/**
 * `npm run db:migrate` — the step Vercel runs before `next build` and CI runs
 * before the E2E job (docs/CI_CD.md § Deploys).
 *
 * There is no schema until Phase 1, so this is deliberately a no-op that
 * succeeds. Wiring the build command up now means it never has to change:
 * Phase 1 replaces the body below with Drizzle's migrator.
 */

import { existsSync } from "node:fs";

const MIGRATIONS = new URL("../db/migrations/", import.meta.url);

if (!existsSync(MIGRATIONS)) {
  console.log(
    "db:migrate — no db/migrations yet (Phase 1 adds them). Skipping.",
  );
  process.exit(0);
}

console.error(
  "db:migrate — db/migrations exists but this script has not been pointed at\n" +
    "Drizzle yet. See docs/CI_CD.md § Deploys.",
);
process.exit(1);
