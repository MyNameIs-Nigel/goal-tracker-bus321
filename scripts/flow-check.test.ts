import { describe, expect, test } from "vitest";
import { checkFlow } from "./flow-check.mjs";

const docs = "docs/PHASES.md";
const unit = "lib/periods.test.ts";
const code = "app/today/page.tsx";

describe("classification", () => {
  test("code globs cover app, components, lib, db and the two root files", () => {
    for (const file of [
      "app/page.tsx",
      "components/GoalRow.tsx",
      "lib/periods.ts",
      "db/schema.ts",
      "proxy.ts",
      "next.config.ts",
    ]) {
      expect(checkFlow({ files: [file] }).classes.code, file).toContain(file);
    }
  });

  test("a nested file named like a root code file is not code", () => {
    const result = checkFlow({ files: ["docs/proxy.ts"] });
    expect(result.classes.code).toEqual([]);
  });

  test("docs globs cover docs/ and AGENTS.md", () => {
    const result = checkFlow({ files: ["docs/specs/goals.md", "AGENTS.md"] });
    expect(result.classes.docs).toEqual(["docs/specs/goals.md", "AGENTS.md"]);
  });

  test("test globs cover unit, component, e2e and the test configs", () => {
    for (const file of [
      "lib/periods.test.ts",
      "components/GoalForm.test.tsx",
      "e2e/goals.spec.ts",
      "vitest.config.mts",
      "playwright.config.ts",
    ]) {
      expect(checkFlow({ files: [file] }).classes.tests, file).toContain(file);
    }
  });

  test("a colocated test counts as a test, not as code", () => {
    const result = checkFlow({ files: ["app/page.test.tsx"] });
    expect(result.classes.tests).toEqual(["app/page.test.tsx"]);
    expect(result.classes.code).toEqual([]);
  });

  test("unclassified files belong to no class", () => {
    const result = checkFlow({ files: ["README.md", "package.json"] });
    expect(result.classes).toEqual({ code: [], docs: [], tests: [] });
  });
});

describe("the rule", () => {
  test("code with docs and tests passes", () => {
    const result = checkFlow({ files: [code, docs, unit] });
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  test("code without docs fails and names docs", () => {
    const result = checkFlow({ files: [code, unit] });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["docs"]);
  });

  test("code without tests fails and names tests", () => {
    const result = checkFlow({ files: [code, docs] });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["tests"]);
  });

  test("code alone fails and names both", () => {
    const result = checkFlow({ files: [code] });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["docs", "tests"]);
  });

  test("a PR that touches no code passes", () => {
    const result = checkFlow({ files: [docs, "README.md"] });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("no-code");
  });

  test("an empty PR passes", () => {
    expect(checkFlow({ files: [] }).ok).toBe(true);
  });
});

describe("escape hatches", () => {
  test("the skip-flow-check label skips the rule", () => {
    const result = checkFlow({ files: [code], labels: ["skip-flow-check"] });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("skip-label");
  });

  test("other labels do not skip it", () => {
    const result = checkFlow({ files: [code], labels: ["dependencies"] });
    expect(result.ok).toBe(false);
  });

  test("dependabot is skipped", () => {
    const result = checkFlow({ files: [code], actor: "dependabot[bot]" });
    expect(result.ok).toBe(true);
    expect(result.reason).toBe("dependabot");
  });

  test("an author merely named like dependabot is not skipped", () => {
    const result = checkFlow({ files: [code], actor: "dependabot-fan" });
    expect(result.ok).toBe(false);
  });
});
