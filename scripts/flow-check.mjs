/**
 * DOCS -> TESTS -> CODE, enforced.
 *
 * A pull request that changes a code path must also change something under
 * `docs/` and at least one test file. The rule and its globs are specified in
 * docs/CI_CD.md; `checkFlow` is a pure function so they can be unit-tested
 * without a repository.
 *
 * CLI:
 *   node scripts/flow-check.mjs --base main            # diff against a branch
 *   node scripts/flow-check.mjs --files a.ts b.md      # explicit file list
 *   node scripts/flow-check.mjs --base main --labels skip-flow-check
 */

import { execFileSync } from "node:child_process";

/** Files that are the app itself. Order within a class does not matter. */
const CODE_GLOBS = [
  "app/**",
  "components/**",
  "lib/**",
  "db/**",
  "proxy.ts",
  "next.config.ts",
];

/** Files that are the source of truth. */
const DOCS_GLOBS = ["docs/**", "AGENTS.md"];

/** Files that encode behaviour. Matched first — see `classify`. */
const TEST_GLOBS = [
  "**/*.test.ts",
  "**/*.test.tsx",
  "e2e/**",
  "vitest.config.*",
  "playwright.config.*",
];

const SKIP_LABEL = "skip-flow-check";
const BOT_ACTOR = "dependabot[bot]";
const WORKFLOW_DOC =
  "https://github.com/MyNameIs-Nigel/goal-tracker-bus321/blob/main/docs/WORKFLOW.md";

/**
 * Translate one glob into an anchored regular expression.
 *
 * Only the three constructs the globs above use are supported: `**` (any
 * number of path segments), `*` (anything within one segment) and literals.
 * A glob without a slash therefore matches at the repository root only, which
 * is what makes `proxy.ts` mean the real proxy and not `docs/proxy.ts`.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
function globToRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*") {
      if (glob[i + 1] === "*") {
        // `**/` swallows the slash so that `e2e/**` also matches `e2e/a/b.ts`
        // and `**/*.test.ts` matches a test at the root.
        source += glob[i + 2] === "/" ? "(?:.*/)?" : ".*";
        i += glob[i + 2] === "/" ? 2 : 1;
      } else {
        source += "[^/]*";
      }
      continue;
    }
    source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${source}$`);
}

const MATCHERS = {
  tests: TEST_GLOBS.map(globToRegExp),
  docs: DOCS_GLOBS.map(globToRegExp),
  code: CODE_GLOBS.map(globToRegExp),
};

/**
 * @typedef {"tests" | "docs" | "code"} FileClass
 * @typedef {{ code: string[], docs: string[], tests: string[] }} Classes
 * @typedef {{
 *   ok: boolean,
 *   missing: FileClass[],
 *   classes: Classes,
 *   reason: "skip-label" | "dependabot" | "no-code" | "complete" | "incomplete",
 * }} FlowResult
 */

/**
 * Which class a file belongs to, or `null`.
 *
 * Tests are matched before code so that a colocated `app/page.test.tsx`
 * counts as a test only (docs/CI_CD.md § Precedence).
 *
 * @param {string} file
 * @returns {FileClass | null}
 */
function classify(file) {
  for (const name of /** @type {FileClass[]} */ (["tests", "docs", "code"])) {
    if (MATCHERS[name].some((re) => re.test(file))) return name;
  }
  return null;
}

/**
 * Apply the rule to a set of changed files.
 *
 * @param {{ files?: string[], labels?: string[], actor?: string }} input
 * @returns {FlowResult}
 */
export function checkFlow({ files = [], labels = [], actor = "" }) {
  /** @type {Classes} */
  const classes = { code: [], docs: [], tests: [] };
  for (const file of files) {
    const name = classify(file);
    if (name) classes[name].push(file);
  }

  const pass = (/** @type {FlowResult["reason"]} */ reason) => ({
    ok: true,
    missing: /** @type {FileClass[]} */ ([]),
    classes,
    reason,
  });

  if (labels.includes(SKIP_LABEL)) return pass("skip-label");
  if (actor === BOT_ACTOR) return pass("dependabot");
  if (classes.code.length === 0) return pass("no-code");

  /** @type {FileClass[]} */
  const missing = [];
  if (classes.docs.length === 0) missing.push("docs");
  if (classes.tests.length === 0) missing.push("tests");

  if (missing.length === 0) return pass("complete");
  return { ok: false, missing, classes, reason: "incomplete" };
}

/**
 * @param {string[]} argv
 * @returns {{ base?: string, files?: string[], labels: string[], actor: string }}
 */
function parseArgs(argv) {
  /** @type {Record<string, string[]>} */
  const flags = {};
  let current = "";
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      current = arg.slice(2);
      flags[current] ??= [];
    } else if (current) {
      flags[current].push(arg);
    }
  }
  const list = (/** @type {string} */ name) =>
    (flags[name] ?? [])
      .flatMap((value) => value.split(/[\n,]/))
      .filter(Boolean);

  return {
    base: flags.base?.[0],
    files: flags.files ? list("files") : undefined,
    labels: list("labels"),
    actor: flags.actor?.[0] ?? "",
  };
}

/**
 * @param {string} base
 * @returns {string[]}
 */
function changedFilesAgainst(base) {
  const ref = base.includes("/") ? base : `origin/${base}`;
  const out = execFileSync("git", ["diff", "--name-only", `${ref}...HEAD`], {
    encoding: "utf8",
  });
  return out.split("\n").filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const files = args.files ?? changedFilesAgainst(args.base ?? "main");
  const result = checkFlow({ ...args, files });

  const label = { code: "code", docs: "docs", tests: "tests" };
  console.log(`flow-check — ${files.length} changed file(s)`);
  for (const name of /** @type {FileClass[]} */ (["docs", "tests", "code"])) {
    const matched = result.classes[name];
    console.log(
      `  ${label[name]}: ${matched.length ? matched.join(", ") : "—"}`,
    );
  }

  if (result.ok) {
    const why = {
      "skip-label": `skipped — the \`${SKIP_LABEL}\` label is set`,
      dependabot: `skipped — authored by ${BOT_ACTOR}`,
      "no-code": "no code paths changed, nothing to enforce",
      complete: "docs, tests and code all changed",
      incomplete: "",
    };
    console.log(`\n✓ ${why[result.reason]}`);
    return;
  }

  const missing = result.missing.join(" and no ");
  console.error(
    `\n✗ This PR changes code but no ${missing}.\n` +
      `\nEvery PR that touches app/, components/, lib/, db/, proxy.ts or\n` +
      `next.config.ts must also change ${result.missing.join(" and ")}.\n` +
      `The order is DOCS → TESTS → CODE:\n` +
      `${WORKFLOW_DOC}\n` +
      `\nIf this is a genuine exception (a typo in a string, a dependency bump),\n` +
      `add the \`${SKIP_LABEL}\` label. It is not for skipping the workflow.`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
