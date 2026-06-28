import { test, expect } from "@playwright/test";

test("export page redirects when not authenticated", async ({ page }) => {
  await page.goto("/export");
  await expect(page).toHaveURL(/\/login/);
});
