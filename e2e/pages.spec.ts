import { expect, test } from "@playwright/test";

test("homepage communicates Humans vs AI and links into the Arena", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Humans vs AI");
  await expect(page.getByText("The Market Intelligence Arena")).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter Today’s Battle" }).first()).toBeVisible();
  await expect(page.getByText("Preview season").first()).toBeVisible();
  // Crowd preview is obscured for visitors.
  await expect(page.getByText(/Sign in and lock a forecast in today’s Battle/)).toBeVisible();
  await expect(page.getByRole("contentinfo").getByText("SIGNAL ARENA is an educational forecasting game")).toBeVisible();
});

test("arena lists seeded live, upcoming and settled Battles", async ({ page }) => {
  await page.goto("/arena");
  await expect(page.getByRole("tab", { name: /Live/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: /Daily Battle, open/ }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Upcoming/ }).click();
  await expect(page.getByRole("link", { name: /upcoming/ }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Settled/ }).click();
  const settled = page.getByRole("link", { name: /Daily Battle, settled/ });
  await expect(settled.first()).toBeVisible();
  expect(await settled.count()).toBeGreaterThanOrEqual(3);
});

test("humans vs ai, leaderboard, methodology and token pages render", async ({ page }) => {
  await page.goto("/humans-vs-ai");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Who reads crypto markets best?");
  await expect(page.getByText("ORACLE").first()).toBeVisible();
  await page.goto("/leaderboard");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText(/ranked/).first()).toBeVisible();
  await page.goto("/methodology");
  await expect(page.getByRole("heading", { name: "Leaderboard formula" })).toBeVisible();
  await page.goto("/token");
  await expect(page.getByText("No token is needed for the core forecasting experience.")).toBeVisible();
  await page.goto("/season");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("This week in the Arena");
  await expect(page.getByText("Founding Analyst badge").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top analysts this week" })).toBeVisible();
});

test("settled result renders on a seeded analyst's Battle and Signal Card", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("demo-analyst").click();
  await page.waitForURL(/\/arena/);
  await page.goto("/profile/nova");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nova Reyes");
  await expect(page.getByText("Signal DNA").first()).toBeVisible();
  // Open the first settled Signal Card from the profile history.
  const firstCard = page.locator("article[aria-label*='Result:']").first();
  await expect(firstCard).toBeVisible();
  await firstCard.locator("xpath=ancestor::a").click();
  await expect(page).toHaveURL(/\/signal\//);
  await expect(page.getByText("Public Signal Card")).toBeVisible();
  await expect(page.getByText("timestamped and locked").first()).toBeVisible();
  await page.getByRole("link", { name: "Open the Battle →" }).click();
  await expect(page.getByTestId("settled-result")).toBeVisible();
  await expect(page.getByTestId("settled-result")).toContainText(/Correct|Incorrect/);
  await expect(page.getByRole("heading", { name: "AI analyst positions" })).toBeVisible();
});

test("protected admin route rejects visitors and ordinary users", async ({ page, request }) => {
  const anon = await request.get("/admin", { maxRedirects: 0 });
  expect([302, 303, 307, 308]).toContain(anon.status());
  expect(anon.headers()["location"]).toContain("/login");

  await page.goto("/login");
  await page.getByTestId("demo-guest").click();
  await page.waitForURL(/\/arena/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/arena\?denied=admin/);
  await expect(page.getByText("Battle console")).toHaveCount(0);

  // Admin identity reaches the console.
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByTestId("demo-admin").click();
  await page.waitForURL(/\/admin/);
  await expect(page.getByRole("heading", { name: "Battle console" })).toBeVisible();
  await expect(page.getByText("Price provider")).toBeVisible();
});
