import { expect, test, type Page } from "@playwright/test";

async function startGuest(page: Page, next = "/race") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("guest-continue").click();
  await page.waitForURL(`**${next}`);
}

test.describe("MEGASPRINT smoke", () => {
  test("homepage communicates the product", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Spot the next narrative before the crowd.");
    await expect(page.getByText("The crypto narrative league", { exact: false }).first()).toBeVisible();
    await expect(page.getByTestId("cta-build")).toBeVisible();
    await expect(page.getByTestId("cta-watch")).toBeVisible();
    await expect(page.getByTestId("narrative-track").first()).toBeVisible();
    await expect(page.getByText("educational forecasting game using virtual points", { exact: false }).first()).toBeVisible();
  });

  test("race list shows open, live and settled races", async ({ page }) => {
    await page.goto("/race");
    await expect(page.getByRole("heading", { name: "Races" })).toBeVisible();
    const cards = page.getByTestId("race-card-link");
    await expect(cards).toHaveCount(6);
    await expect(page.getByText("Open for lineups").first()).toBeVisible();
    await expect(page.getByText("Live", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Settled", { exact: true }).first()).toBeVisible();
  });

  test("crowd is hidden before lock and revealed after locking a demo lineup", async ({ page }) => {
    await page.goto("/race");
    const openCard = page.locator('[data-testid="race-card-link"]', { hasText: "Open for lineups" }).first();
    const href = await openCard.getAttribute("href");
    expect(href).toBeTruthy();
    await startGuest(page, href!);

    await expect(page.getByTestId("lineup-builder")).toBeVisible();
    await expect(page.getByTestId("crowd-hidden")).toBeVisible();
    await expect(page.getByTestId("crowd-revealed")).toHaveCount(0);

    await page.getByTestId("narrative-ai").click();
    await page.getByTestId("narrative-rwa").click();
    await page.getByTestId("narrative-gaming").click();
    await expect(page.getByTestId("energy-total")).toContainText("100 / 100");

    // Energy must total exactly 100 — the lock button disables otherwise.
    await page.getByTestId("energy-input-leader").fill("60");
    await expect(page.getByTestId("lock-open")).toBeDisabled();
    await page.getByTestId("energy-input-leader").fill("50");
    await expect(page.getByTestId("lock-open")).toBeEnabled();

    await page.getByLabel("Thesis").fill("Volume is rotating into AI before price.");
    await page.getByTestId("lock-open").click();
    await page.getByTestId("lock-confirm").click();

    await expect(page.getByTestId("user-lineup")).toBeVisible();
    await expect(page.getByTestId("crowd-revealed")).toBeVisible();
    await expect(page.getByTestId("lineup-builder")).toHaveCount(0);
    await expect(page.getByText("immutable")).toBeVisible();

    // The Race Card is reachable and carries a share-on-X link.
    await page.getByRole("link", { name: "View Race Card" }).click();
    await expect(page.getByTestId("race-card")).toBeVisible();
    await expect(page.getByTestId("share-x")).toHaveAttribute("href", /x\.com\/intent\/post/);
  });

  test("settled race shows final order, results and AI coaches", async ({ page }) => {
    await page.goto("/race");
    const settled = page.locator('[data-testid="race-card-link"]', { hasText: "Settled" }).first();
    await settled.click();
    await expect(page.getByRole("heading", { name: "Final narrative order" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Settlement board" })).toBeVisible();
    await expect(page.getByTestId("ai-rotator")).toBeVisible();
    await expect(page.getByTestId("ai-atlas")).toBeVisible();
    await expect(page.getByTestId("ai-nova")).toBeVisible();
    await expect(page.getByTestId("crowd-revealed")).toBeVisible();
  });

  test("leaderboard, profiles and narratives render", async ({ page }) => {
    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard")).toBeVisible();
    await page.getByRole("link", { name: /Sector Sam/ }).first().click();
    await expect(page.getByRole("heading", { name: "Sector Sam" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meta DNA" })).toBeVisible();
    await page.goto("/narratives/ai");
    await expect(page.getByRole("heading", { name: "Artificial Intelligence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Constituents" })).toBeVisible();
    await page.goto("/ai-vs-crowd");
    await expect(page.getByTestId("ai-vs-crowd-table")).toBeVisible();
  });

  test("admin is rejected server-side for guests and opened for the demo admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("admin-denied")).toBeVisible();
    await expect(page.getByTestId("admin-panel")).toHaveCount(0);

    await startGuest(page, "/admin");
    await expect(page.getByTestId("admin-denied")).toBeVisible();

    await page.goto("/login?next=/admin");
    await page.getByTestId("demo-admin").click();
    await page.waitForURL((u) => u.pathname === "/admin");
    await expect(page.getByTestId("admin-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  });

  test("full loop: lock as guest, admin takes the Race live and settles it, guest sees XP and result", async ({ page }) => {
    await page.goto("/race");
    const href = await page.locator('[data-testid="race-card-link"]', { hasText: "Open for lineups" }).first().getAttribute("href");
    await startGuest(page, href!);
    await page.getByTestId("narrative-defi").click();
    await page.getByTestId("narrative-ai").click();
    await page.getByTestId("narrative-privacy").click();
    await page.getByTestId("lock-open").click();
    await page.getByTestId("lock-confirm").click();
    await expect(page.getByTestId("user-lineup")).toBeVisible();

    await page.goto("/login?next=/admin");
    await page.getByTestId("demo-admin").click();
    await page.waitForURL((u) => u.pathname === "/admin");
    const row = page.locator("tr", { hasText: "Open for lineups" }).first();
    await row.getByRole("button", { name: "Go live" }).click();
    await expect(page.getByRole("status")).toContainText("is live");
    const liveRow = page.locator("tr", { hasText: "Narrative Race 6" }).first();
    await liveRow.getByRole("button", { name: "Settle" }).click();
    await expect(page.getByRole("status")).toContainText("settled");

    await page.goto(href!);
    await expect(page.getByTestId("user-result")).toBeVisible();
    await expect(page.getByText("(you)")).toHaveCount(1);
    await expect(page.getByText("Final narrative order")).toBeVisible();
    await expect(page.getByTestId("crowd-revealed")).toBeVisible();
    await expect(page.getByTestId("share-x")).toBeVisible();
    await page.getByTestId("viewer-link").click();
    await expect(page.getByText("Race history")).toBeVisible();
    await expect(page.getByText("Settled", { exact: true }).first()).toBeVisible();
  });

  test("cron endpoints require the secret", async ({ request }) => {
    const res = await request.get("/api/cron/settle");
    expect(res.status()).toBe(401);
  });
});
