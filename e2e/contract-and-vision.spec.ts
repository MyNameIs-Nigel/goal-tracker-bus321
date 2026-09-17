import { expect, test } from "./fixtures";
import { resetAt } from "./helpers";

// Friday 2026-09-18 in Denver — CV-05's "Last updated Sep 18".
const FIXED_NOW = "2026-09-18T20:00:00Z";

const section = (page: import("@playwright/test").Page, name: string) =>
  page.getByRole("region", { name });

async function writeContract(
  page: import("@playwright/test").Page,
  type: (page: import("@playwright/test").Page) => Promise<void>,
) {
  const contract = section(page, "Accountability contract");
  await contract.getByRole("button", { name: "Edit" }).click();
  const editor = contract.locator(".ProseMirror");
  await editor.click();
  await type(page);
  await contract.getByRole("button", { name: "Save" }).click();
  await expect(contract.locator(".ProseMirror")).toHaveCount(0);
}

test("CV-01 the page shows the dates, both documents, and the partners", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/contract");

  await page.getByRole("button", { name: "Edit dates" }).click();
  await page.getByLabel("End date").fill("2026-12-18");
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.getByText("Sep 19 – Dec 18, 2026")).toBeVisible();

  await writeContract(page, async (page) => {
    await page.keyboard.type("Five failures means I buy lunch.");
  });

  await signInAs("viewer");
  await page.goto("/contract");
  await expect(page.getByText("Sep 19 – Dec 18, 2026")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Who I want to become" }),
  ).toBeVisible();
  await expect(
    section(page, "Accountability contract").getByText(
      "Five failures means I buy lunch.",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Accountability partners: Test Partner"),
  ).toBeVisible();
});

test("CV-02 owner edits a document with the toolbar and saves", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/contract");

  const contract = section(page, "Accountability contract");
  await contract.getByRole("button", { name: "Edit" }).click();
  for (const name of [
    "Bold",
    "Italic",
    "Heading",
    "Bullet list",
    "Numbered list",
    "Link",
  ]) {
    await expect(contract.getByRole("button", { name })).toBeVisible();
  }
  await expect(contract.getByRole("button", { name: "Save" })).toBeVisible();
  await expect(contract.getByRole("button", { name: "Cancel" })).toBeVisible();

  await contract.locator(".ProseMirror").click();
  await page.keyboard.type("Plain then ");
  await contract.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.type("bold");
  await contract.getByRole("button", { name: "Save" }).click();

  await expect(contract.locator("strong")).toHaveText("bold");
  await expect(contract.getByText("Last updated Sep 18 by Test")).toBeVisible();

  await page.reload();
  await expect(
    section(page, "Accountability contract").locator("strong"),
  ).toHaveText("bold");
});

test("CV-05 last updated names the day and the owner's first name", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/contract");

  const vision = section(page, "Who I want to become");
  await expect(vision.getByText(/Last updated/)).toHaveCount(0);
  await vision.getByRole("button", { name: "Edit" }).click();
  await vision.locator(".ProseMirror").click();
  await page.keyboard.type("Someone who finishes.");
  await vision.getByRole("button", { name: "Save" }).click();
  await expect(vision.getByText("Last updated Sep 18 by Test")).toBeVisible();
});

test("CV-06 empty documents show a placeholder to the owner and 'Not written yet.' to others", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/contract");
  await expect(
    page.getByText("Write your accountability contract…"),
  ).toBeVisible();
  await expect(page.getByText("Write who you want to become…")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(2);

  await signInAs("partner");
  await page.goto("/contract");
  await expect(page.getByText("Not written yet.")).toHaveCount(2);
});

test("CV-07 owner sets the contract dates; /today reflects Day N of M; end before start is rejected", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, "2026-09-23T18:00:00Z");
  await signInAs("owner");
  await page.goto("/contract");

  await page.getByRole("button", { name: "Edit dates" }).click();
  await page.getByLabel("Start date").fill("2026-09-19");
  await page.getByLabel("End date").fill("2026-12-18");
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(page.getByText("Sep 19 – Dec 18, 2026")).toBeVisible();

  await page.goto("/today");
  await expect(page.getByText("Day 5 of 91")).toBeVisible();

  await page.goto("/contract");
  await page.getByRole("button", { name: "Edit dates" }).click();
  await page.getByLabel("End date").fill("2026-09-18");
  await page.getByRole("button", { name: "Save dates" }).click();
  await expect(
    page.getByText("End date can't be before start date"),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Sep 19 – Dec 18, 2026")).toBeVisible();
});

test("CV-08 Cancel discards unsaved changes", async ({ page, signInAs }) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/contract");

  const contract = section(page, "Accountability contract");
  await contract.getByRole("button", { name: "Edit" }).click();
  await contract.locator(".ProseMirror").click();
  await page.keyboard.type("Never saved");
  await contract.getByRole("button", { name: "Cancel" }).click();

  await expect(contract.getByText("Never saved")).toHaveCount(0);
  await expect(
    contract.getByText("Write your accountability contract…"),
  ).toBeVisible();
});

test("CV-09 non-owners see no Edit or Edit dates controls", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  for (const role of ["partner", "viewer"] as const) {
    await signInAs(role);
    await page.goto("/contract");
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit dates" })).toHaveCount(
      0,
    );
  }
});

test("CV-10 headings, lists and links render like a document", async ({
  page,
  signInAs,
}) => {
  await resetAt(page, FIXED_NOW);
  await signInAs("owner");
  await page.goto("/contract");

  // The fixture auto-accepts dialogs with no value; the Link prompt needs a URL.
  page.removeAllListeners("dialog");
  page.on("dialog", (dialog) => dialog.accept("https://ok.example"));

  const contract = section(page, "Accountability contract");
  await writeContract(page, async (page) => {
    await contract.getByRole("button", { name: "Heading" }).click();
    await page.keyboard.type("Rules");
    await page.keyboard.press("Enter");
    await contract.getByRole("button", { name: "Bullet list" }).click();
    await page.keyboard.type("Read every day");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await page.keyboard.type("syllabus");
    await page.keyboard.press("Shift+Home");
    await contract.getByRole("button", { name: "Link" }).click();
  });

  await expect(
    contract.getByRole("heading", { name: "Rules", level: 2 }),
  ).toBeVisible();
  await expect(contract.getByRole("listitem")).toHaveText("Read every day");
  const link = contract.getByRole("link", { name: "syllabus" });
  await expect(link).toHaveAttribute("href", "https://ok.example");
  await expect(link).toHaveAttribute("target", "_blank");
});
