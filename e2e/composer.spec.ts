import { expect, test } from "@playwright/test";

test("a demo guest can lock a call; the crowd is hidden before and revealed after", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("demo-guest").click();
  await page.waitForURL(/\/rounds/);
  await page.goto("/rounds");
  await page.getByRole("link", { name: /Daily Round, open/ }).first().click();
  await expect(page).toHaveURL(/\/rounds\//);

  // Crowd hidden before lock.
  await expect(page.getByText(/Crowd percentages are hidden until you lock/)).toBeVisible();
  await expect(page.getByText("Hidden until you lock your call.")).toBeVisible();

  const lock = page.getByTestId("lock-button");
  await expect(lock).toBeDisabled();

  await page.getByRole("radio", { name: "Bullish" }).click();
  await expect(lock).toBeDisabled();

  const signals = page.getByRole("checkbox");
  await signals.nth(0).click();
  await signals.nth(1).click();
  await expect(page.getByText("2 of 3 selected")).toBeVisible();
  await signals.nth(2).click();
  await expect(page.getByText("3 of 3 selected")).toBeVisible();
  // A fourth selection is prevented.
  await signals.nth(3).click({ force: true });
  await expect(signals.nth(3)).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("3 of 3 selected")).toBeVisible();

  await expect(lock).toBeDisabled();
  await page.getByRole("radio", { name: /4 of 5/ }).click();
  await page.getByLabel(/Thesis/).fill("Momentum and volume both confirm the trend for this session.");
  await expect(page.getByText("Call Preview")).toBeVisible();
  await expect(lock).toBeEnabled();

  await lock.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Locked calls cannot be edited or deleted after submission.");
  await page.getByTestId("confirm-lock").click();

  // Locked state replaces the composer; crowd and AI positions revealed.
  await expect(page.getByTestId("locked-card")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("composer")).toHaveCount(0);
  await expect(page.getByText("Human calls only.")).toBeVisible();
  await expect(page.getByRole("meter", { name: /Bullish/ })).toBeVisible();
  await expect(page.getByText("ATLAS").first()).toBeVisible();
  await expect(page.getByText("Your position")).toBeVisible();

  // Immutable: reloading still shows the locked card and no composer.
  await page.reload();
  await expect(page.getByTestId("locked-card")).toBeVisible();
  await expect(page.getByTestId("composer")).toHaveCount(0);

  // Public Call Card works.
  await page.getByRole("link", { name: "Public card →" }).click();
  await expect(page.getByText("Public Call Card")).toBeVisible();
  await expect(page.getByText("Momentum and volume both confirm")).toBeVisible();
});
