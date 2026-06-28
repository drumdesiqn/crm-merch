import { test, expect } from "@playwright/test";

test("planning page redirects when not authenticated", async ({ page }) => {
  await page.goto("/planning");
  await expect(page).toHaveURL(/\/login/);
});
