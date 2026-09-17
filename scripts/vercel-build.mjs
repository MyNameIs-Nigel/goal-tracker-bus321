/**
 * Vercel's `buildCommand` (vercel.json). Migrations only run against
 * Production — Preview has no database at all (ADR-0004) — then
 * `next build` always runs.
 */

import { spawnSync } from "node:child_process";

/** @param {{ VERCEL_ENV?: string }} env */
export function shouldMigrate(env) {
  return env.VERCEL_ENV === "production";
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  if (shouldMigrate(process.env)) {
    run("npm", ["run", "db:migrate"]);
  } else {
    console.log(
      "vercel-build — skipping db:migrate: not Production (ADR-0004, Preview has no database)",
    );
  }
  run("npm", ["run", "build"]);
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
