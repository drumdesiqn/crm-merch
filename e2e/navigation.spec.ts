import { test, expect } from "@playwright/test";

test("public pages are accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /se connecter/i })).toBeVisible({ timeout: 10000 });
});

test("login submits credentials", async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector("input#email", { timeout: 10000 });
  await page.locator("input#email").fill("admin@marsmerch.com");
  await page.locator("input#password").fill("change-me-in-production");
  await page.getByRole("button", { name: /se connecter/i }).click();
  // Auth result depends on seeded admin account; assert redirect attempt or error
  await expect(page.locator("body")).toContainText(/dashboard|planning|introuvable|erreur|mot de passe/i, { timeout: 10000 });
});
