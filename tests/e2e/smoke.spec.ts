import { expect, test, type Page } from "@playwright/test";

async function signInAs(page: Page, persona: "guest" | "moderator") {
  await page.goto("/login?next=/");
  await page.getByRole("button", { name: persona === "guest" ? /Continue as demo guest/ : /Continue as demo moderator/ }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

test("homepage explains the product and search works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Crypto makes promises. We track what ships.");
  await expect(page.getByText("PROOF OF PROGRESS", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore Projects" })).toBeVisible();
  await expect(page.getByRole("link", { name: "See What Shipped" })).toBeVisible();
  await expect(page.getByText(/A Ship Score is not an investment recommendation/).first()).toBeVisible();
  await page.getByRole("searchbox", { name: /Search projects/ }).first().fill("rollup");
  await page.getByRole("searchbox", { name: /Search projects/ }).first().press("Enter");
  await page.waitForURL("**/projects?q=rollup");
  await expect(page.getByRole("heading", { name: "Tessera Rollup" })).toBeVisible();
  await expect(page.getByText(/of 12 projects/)).toBeVisible();
});

test("project profile shows score breakdown, milestones, sources, and history", async ({ page }) => {
  await page.goto("/projects/aurelia-chain");
  await expect(page.getByRole("heading", { level: 1, name: "Aurelia Chain" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Score breakdown" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline of milestones" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Original source", exact: false }).first()).toHaveAttribute("rel", /noopener/);
  await expect(page.getByRole("heading", { name: "Development pulse" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Product status" })).toBeVisible();
  await expect(page.getByRole("link", { name: "request a correction" })).toBeVisible();
});

test("insufficient data is shown instead of a misleading number", async ({ page }) => {
  await page.goto("/projects/veritas-id");
  await expect(page.getByText("Insufficient data — no total is displayed.")).toBeVisible();
});

test("score explanation matches the stored calculation", async ({ page }) => {
  await page.goto("/projects/keelstone-oracle");
  await page.getByText("Show exact calculation").click();
  const total = await page.getByRole("img", { name: /Ship Score \d+ out of 100/ }).first().getAttribute("aria-label");
  const value = Number(total?.match(/Ship Score (\d+)/)?.[1]);
  await expect(page.getByText(`Total = ${value}`, { exact: false })).toBeVisible();
});

test("compare flow works for three projects", async ({ page }) => {
  await page.goto("/compare");
  await page.getByLabel("Project 1").selectOption("aurelia-chain");
  await page.getByLabel("Project 2").selectOption("tessera-rollup");
  await page.getByLabel("Project 3").selectOption("keelstone-oracle");
  await page.getByRole("button", { name: "Compare" }).click();
  await page.waitForURL(/compare\?projects=/);
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader", { name: /Aurelia Chain/ })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /Keelstone Oracle/ })).toBeVisible();
  await expect(table.getByRole("rowheader", { name: "On-time rate" })).toBeVisible();
  await expect(page.getByText(/not investment quality/)).toBeVisible();
});

test("demo evidence submission remains pending until moderation", async ({ page }) => {
  await signInAs(page, "guest");
  await page.goto("/submit?project=proj_quillswap&milestone=ms_quillswap_fee_switch_vote");
  const panel = page.locator("#panel-evidence");
  await panel.getByLabel("Source URL").fill("https://quillswap.example/blog/fee-switch-vote");
  await panel.getByLabel("Title").fill("Fee switch vote announced");
  await panel.getByLabel("What does this evidence show?").fill("Governance post announcing the vote with a dated schedule and snapshot block.");
  await panel.getByLabel(/I understand this submission is public/).check();
  await panel.getByRole("button", { name: "Submit evidence for review" }).click();
  await expect(page.getByText(/will not change verified status until a moderator reviews it/)).toBeVisible();
  await page.getByRole("link", { name: /Proof card \(pending\)/ }).click();
  await expect(page.getByText("Pending moderation · unverified").first()).toBeVisible();
  await expect(page.getByText("Unverified submission")).toBeVisible();
  await page.goto("/projects/quillswap/milestones/ms_quillswap_fee_switch_vote");
  await expect(page.getByText("Submitted for review").first()).toBeVisible();
  await expect(page.getByText("Pending community submissions (1)")).toBeVisible();
});

test("ordinary user is rejected from admin", async ({ page }) => {
  await page.goto("/admin");
  await page.waitForURL(/\/login\?next=%2Fadmin|\/login\?next=\/admin/);
  await signInAs(page, "guest");
  const response = await page.goto("/admin");
  expect(response?.url()).not.toContain("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin" })).toHaveCount(0);
});

test("moderator status update creates an audit event and recalculates the score", async ({ page }) => {
  await signInAs(page, "moderator");
  await page.goto("/admin?tab=queue");
  await expect(page.getByRole("heading", { name: /Evidence awaiting review/ })).toBeVisible();
  const card = page.locator("article", { hasText: "Fee upgrade activation notice" }).first();
  await card.getByLabel("Reason (recorded publicly)").fill("Primary source: activation block confirmed in the public explorer.");
  await card.getByRole("button", { name: "Record decision" }).click();
  // The queue re-renders after the decision: the item leaves the queue and appears under "Recently decided".
  await expect(page.locator("article", { hasText: "Fee upgrade activation notice" })).toHaveCount(0);
  await expect(page.getByText(/Evidence marked accepted/).first()).toBeVisible();

  await page.goto("/projects/tessera-rollup/milestones/ms_tessera_rollup_fee_upgrade");
  await page.getByLabel("New status").selectOption("shipped");
  await page.getByLabel("Evidence references (accepted only)").selectOption({ label: "Fee upgrade activation notice" });
  await page.getByLabel("Reason (recorded in status history)").fill("Verified from accepted announcement and on-chain activation.");
  await page.getByRole("button", { name: /Change status/ }).click();
  await expect(page.getByText(/Audit event ST-[0-9A-F]+ recorded; Ship Score recalculated/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("Verified from accepted announcement and on-chain activation.").first()).toBeVisible();
  await page.goto("/admin?tab=audit");
  await expect(page.getByRole("cell", { name: "milestone.status_change" }).first()).toBeVisible();
});

test("watchlist contains no trading or portfolio functionality", async ({ page }) => {
  await signInAs(page, "guest");
  await page.goto("/watchlist");
  await expect(page.getByRole("heading", { name: "Your watchlist" })).toBeVisible();
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/\bBuy\b|\bSell\b|P&L|Portfolio balance|Connect wallet/i);
});

test("mobile layout renders without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/projects/tessera-rollup");
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Primary mobile" })).toBeVisible();
  await page.screenshot({ path: "test-results/mobile-project.png", fullPage: false });
});
