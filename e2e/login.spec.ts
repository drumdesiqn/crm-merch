import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /se connecter/i })).toBeVisible();
});

test("dashboard requires auth", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});
