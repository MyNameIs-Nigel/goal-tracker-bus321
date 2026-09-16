/**
 * `npm run trace` — scenario ID ↔ test coverage (docs/TESTING.md).
 *
 * Every `### PREFIX-NN …` heading in docs/specs/ is a scenario. Every test
 * name starts with the ID of the scenario it covers. This lists the ones no
 * test names. It is a reporter, not a gate — specs for phases that have not
 * started are legitimately uncovered — so it exits 0 unless `--strict`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SPEC_DIR = "docs/specs";
const SEARCH_DIRS = ["app", "components", "lib", "db", "e2e", "scripts"];
const SCENARIO_HEADING = /^###\s+([A-Z]+-\d+)\s+(.*)$/gm;

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

const specs = readdirSync(SPEC_DIR)
  .filter((f) => f.endsWith(".md") && f !== "README.md")
  .sort();

const testSource = SEARCH_DIRS.flatMap(walk)
  .filter((f) => /\.(test|spec)\.(ts|tsx)$/.test(f))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

let total = 0;
let covered = 0;
/** @type {string[]} */
const gaps = [];

for (const spec of specs) {
  const body = readFileSync(join(SPEC_DIR, spec), "utf8");
  const scenarios = [...body.matchAll(SCENARIO_HEADING)];
  if (scenarios.length === 0) {
    console.log(`${spec}: no scenarios written yet`);
    continue;
  }
  /** @type {string[]} */
  const missing = [];
  for (const [, id] of scenarios) {
    total++;
    // A test "names" a scenario when its title starts with the ID.
    if (new RegExp(`["'\`]${id}\\s`).test(testSource)) covered++;
    else missing.push(id);
  }
  const mark = missing.length === 0 ? "✓" : "·";
  console.log(
    `${mark} ${spec}: ${scenarios.length - missing.length}/${scenarios.length}` +
      (missing.length ? `  missing: ${missing.join(", ")}` : ""),
  );
  gaps.push(...missing);
}

console.log(`\n${covered}/${total} scenarios have a test.`);

if (gaps.length > 0 && process.argv.includes("--strict")) {
  console.error(`✗ ${gaps.length} uncovered scenario(s).`);
  process.exitCode = 1;
}
