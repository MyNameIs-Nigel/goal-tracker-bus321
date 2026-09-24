import { expect, teamPath, test } from "./fixtures";
import { addGoal, openProfile, region } from "./helpers";

test("TEAM-01 signing in gives you a team", async ({ page, signInAs }) => {
  await signInAs("dana");
  await page.goto("/today");
  await expect(page).toHaveURL("/today");
  await expect(page.getByText("No goals yet.")).toBeVisible();
  await expect(await openProfile(page)).toContainText("Team Dana");
});

test("TEAM-02 every other student is your partner, instantly", async ({
  page,
  signInAs,
}) => {
  await signInAs("avery");
  await page.goto("/today");
  const teammates = region(page, "Your teammates").getByRole("listitem");
  await expect(teammates).toHaveCount(2);
  await expect(teammates.nth(0)).toContainText("Blake Brown");
  await expect(teammates.nth(1)).toContainText("Casey Clark");
  await expect(region(page, "Your teammates")).not.toContainText("Avery");

  // Dana's first visit creates her team; nobody promotes anybody.
  await signInAs("dana");
  await page.goto("/today");
  await expect(
    region(page, "Your teammates").getByRole("listitem"),
  ).toHaveCount(3);

  await signInAs("avery");
  await page.goto("/today");
  await expect(teammates).toHaveCount(3);
  await expect(teammates.nth(2)).toContainText("Dana Diaz");
});

test("TEAM-03 every student reads every team, with no write controls", async ({
  page,
  signInAs,
}) => {
  await signInAs("avery");
  await page.goto("/goals");
  await addGoal(page, { title: "Avery's goal", startsOn: "2026-09-19" });

  await signInAs("blake");
  for (const path of [
    teamPath("avery"),
    teamPath("avery", "/day/2026-09-19"),
    teamPath("avery", "/contract"),
    teamPath("avery", "/history"),
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    for (const name of [/Avery's goal/, /Mark an exception/, /^Edit/]) {
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
  }
  await page.goto(teamPath("avery"));
  await expect(page.getByText("Avery's goal")).toBeVisible();
});

test("TEAM-04 your own team's pages are your own routes", async ({
  page,
  signInAs,
}) => {
  await signInAs("avery");
  for (const [path, expected] of [
    [teamPath("avery"), "/today"],
    [teamPath("avery", "/day/2026-09-21"), "/day/2026-09-21"],
    [teamPath("avery", "/contract"), "/contract"],
    [teamPath("avery", "/history"), "/history"],
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(expected);
  }
});

test("TEAM-05 an unknown team is not found", async ({ page, signInAs }) => {
  await signInAs("avery");
  for (const path of [
    "/team/not-a-team",
    "/team/not-a-team/contract",
    "/team/00000000-0000-4000-8000-000000000000",
  ]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

test("TEAM-07 you never check in on your own team", async ({
  page,
  signInAs,
}) => {
  await signInAs("avery");
  await page.goto("/today");
  await expect(
    page.getByRole("button", { name: /Check in on Avery/ }),
  ).toHaveCount(0);
  await expect(region(page, "Checked on you").getByRole("button")).toHaveCount(
    0,
  );
});

test("TEAM-08 one navigation for everyone, pointing at your own team", async ({
  page,
  signInAs,
}) => {
  await signInAs("casey");
  await page.goto("/today");
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const [name, href] of [
    ["Today", "/today"],
    ["Goals", "/goals"],
    ["Contract", "/contract"],
    ["History", "/history"],
  ]) {
    await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      href,
    );
  }
  await expect(nav.getByRole("link")).toHaveCount(4);
  expect((await page.goto("/people"))?.status()).toBe(404);
});

test("TEAM-09 a teammate's pages say whose they are", async ({
  page,
  signInAs,
}) => {
  await signInAs("avery");
  await page.goto(teamPath("blake", "/contract"));
  const teamNav = page.getByRole("navigation", { name: "Team Blake" });
  await expect(teamNav).toContainText("Team Blake");
  await expect(teamNav.getByRole("link", { name: "Contract" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await teamNav.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(teamPath("blake", "/history"));
  await teamNav.getByRole("link", { name: "Today" }).click();
  await expect(page).toHaveURL(teamPath("blake"));
});
